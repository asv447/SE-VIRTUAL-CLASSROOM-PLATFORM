// API route for toggling announcement pin status
import { NextResponse } from "next/server";
import { getAnnouncementsCollection, getAnnouncementActivityCollection } from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Helper function to log announcement activities
async function logActivity({ announcementId, action, performedBy, meta }) {
  try {
    const activityCollection = await getAnnouncementActivityCollection();
    await activityCollection.insertOne({
      announcementId: new ObjectId(announcementId),
      action,
      performedBy,
      meta,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[Announcement Activity Log Error]:', err.message);
  }
}

// PATCH - Toggle pin status
export async function PATCH(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid announcement ID" 
      }, { status: 400 });
    }

    const announcementsCollection = await getAnnouncementsCollection();
    const announcement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    if (!announcement) {
      return NextResponse.json({ 
        success: false,
        error: "Announcement not found" 
      }, { status: 404 });
    }

    const newPinStatus = !announcement.isPinned;

    await announcementsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isPinned: newPinStatus,
          updatedAt: new Date()
        } 
      }
    );

    // Log activity
    await logActivity({
      announcementId: id,
      action: newPinStatus ? "pin" : "unpin",
      performedBy: {
        name: announcement.authorName || "Unknown",
        role: announcement.authorRole || "Unknown"
      },
      meta: { isPinned: newPinStatus }
    });

    const updatedAnnouncement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: `Announcement ${newPinStatus ? 'pinned' : 'unpinned'} successfully`,
      data: {
        id: updatedAnnouncement._id.toString(),
        ...updatedAnnouncement,
        _id: undefined
      }
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/[id]/pin PATCH] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
