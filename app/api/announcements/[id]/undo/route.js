// API route for undoing the last edit
import { NextResponse } from "next/server";
import { getAnnouncementsCollection, getAnnouncementActivityCollection } from "../../../../../lib/mongodb";
import { clonePoll } from "../../../../../lib/announcementPoll";
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

// POST - Undo last edit
export async function POST(request, { params }) {
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

    if (!announcement.editHistory || announcement.editHistory.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "No edit history available to undo" 
      }, { status: 400 });
    }

    // Get the last version from history
    const editHistory = [...announcement.editHistory];
    const previousVersion = editHistory.pop();

    // Restore previous version
    await announcementsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          title: previousVersion.title,
          content: previousVersion.content,
          tags: previousVersion.tags,
          link: previousVersion.link,
          isImportant: previousVersion.isImportant,
          isUrgent: previousVersion.isUrgent,
          isPinned: previousVersion.isPinned,
          poll: previousVersion.poll || null,
          editHistory: editHistory,
          updatedAt: new Date()
        } 
      }
    );

    // Log activity
    await logActivity({
      announcementId: id,
      action: "undo",
      performedBy: {
        name: announcement.authorName || "Unknown",
        role: announcement.authorRole || "Unknown"
      },
      meta: {
        title: previousVersion.title,
        pollRestored: Boolean(previousVersion.poll)
      }
    });

    const updatedAnnouncement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Announcement restored to previous version',
      data: {
        id: updatedAnnouncement._id.toString(),
        ...updatedAnnouncement,
        _id: undefined,
        poll: clonePoll(updatedAnnouncement.poll)
      }
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/[id]/undo POST] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
