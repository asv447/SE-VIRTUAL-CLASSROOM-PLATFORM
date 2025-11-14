import { NextResponse } from "next/server";
import { getNotificationsCollection } from "@/lib/mongodb";

export const runtime = "nodejs"; // ensure Node.js runtime for change streams

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const notificationsCol = await getNotificationsCollection();

    // Attempt to open a change stream filtered by userId
    let changeStream;
    try {
      changeStream = notificationsCol.watch([
        { $match: { "fullDocument.userId": uid } },
      ], { fullDocument: "updateLookup" });
    } catch (e) {
      // Replica set not available or watch unsupported
      changeStream = null;
    }

    const readable = new ReadableStream({
      start(controller) {
        const send = (event) => {
          const payload = typeof event === "string" ? event : JSON.stringify(event);
          controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
        };

        // Initial hello
        send({ type: "hello", uid });

        if (changeStream) {
          changeStream.on("change", (change) => {
            try {
              const doc = change.fullDocument || {};
              send({
                type: "notification",
                id: doc._id?.toString?.() || null,
                title: doc.title,
                message: doc.message,
                read: !!doc.read,
                createdAt: doc.createdAt || new Date(),
                extra: doc.extra || {},
              });
            } catch (err) {
              // swallow
            }
          });

          changeStream.on("error", (err) => {
            send({ type: "error", message: err?.message || "stream error" });
          });
        } else {
          // Fallback polling when change streams unsupported
          let lastCheck = Date.now();
          const interval = setInterval(async () => {
            try {
              const docs = await notificationsCol
                .find({ userId: uid, createdAt: { $gte: new Date(lastCheck) } })
                .sort({ createdAt: 1 })
                .toArray();
              docs.forEach((doc) => {
                send({
                  type: "notification",
                  id: doc._id?.toString?.() || null,
                  title: doc.title,
                  message: doc.message,
                  read: !!doc.read,
                  createdAt: doc.createdAt || new Date(),
                  extra: doc.extra || {},
                });
              });
              lastCheck = Date.now();
            } catch (_) {}
          }, 3000); // 3s fallback poll

          // Save abort handler to clear interval
          this._interval = interval;
        }

        // Close handler
        const close = () => {
          try {
            if (changeStream) changeStream.close();
          } catch (_) {}
          try {
            if (this._interval) clearInterval(this._interval);
          } catch (_) {}
          controller.close();
        };

        // If client disconnects, abort
        // Note: Next.js provides an AbortSignal on the request
        const abortSignal = request.signal;
        if (abortSignal) {
          abortSignal.addEventListener("abort", close);
        }
      },
      cancel() {
        try {
          if (changeStream) changeStream.close();
        } catch (_) {}
      },
    });

    return new Response(readable, { headers });
  } catch (err) {
    console.error("[API /api/notifications/stream] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
