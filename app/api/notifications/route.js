import { NextResponse } from "next/server";
import { getNotificationsCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET: /api/notifications?uid=<uid>
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const col = await getNotificationsCollection();
    const docs = await col.find({ userId: uid }).sort({ createdAt: -1 }).toArray();

    // Serialize _id and dates to safe JSON-friendly shapes
    const notifications = docs.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      message: d.message,
      read: !!d.read,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      // include raw fields if needed
      ...(d.extra || {}),
    }));

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (err) {
    console.error("[API /api/notifications] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: update notification read status or mark all as read
export async function PATCH(request) {
  try {
    const payload = await request.json();
    const col = await getNotificationsCollection();

    // Mark single notification as read
    if (payload.id) {
      const _id = new ObjectId(payload.id);
      const result = await col.updateOne(
        { _id },
        { $set: { read: true, readAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Marked as read" }, { status: 200 });
    }

    // Mark all for a user as read
    if (payload.action === "markAll" && payload.uid) {
      const result = await col.updateMany(
        { userId: payload.uid, read: { $ne: true } },
        { $set: { read: true, readAt: new Date() } }
      );
      return NextResponse.json({ message: `Marked ${result.modifiedCount} notifications` }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (err) {
    console.error("[API /api/notifications] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove a notification by id
export async function DELETE(request) {
  try {
    const payload = await request.json();
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const col = await getNotificationsCollection();
    const _id = new ObjectId(payload.id);
    const result = await col.deleteOne({ _id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("[API /api/notifications] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
