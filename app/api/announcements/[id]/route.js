// API routes for individual announcement operations
import { NextResponse } from "next/server";
import { getAnnouncementsCollection, getAnnouncementActivityCollection } from "../../../../lib/mongodb";
import { sanitizePollInput, clonePoll } from "../../../../lib/announcementPoll";
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

// GET - Fetch single announcement by ID
export async function GET(request, { params }) {
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

    return NextResponse.json({
      success: true,
      data: {
        id: announcement._id.toString(),
        ...announcement,
        _id: undefined
      }
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/[id] GET] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}

// PUT - Update announcement
export async function PUT(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid announcement ID" 
      }, { status: 400 });
    }

  const body = await request.json();
    const announcementsCollection = await getAnnouncementsCollection();

    // Find existing announcement
    const existingAnnouncement = await announcementsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingAnnouncement) {
      return NextResponse.json({ 
        success: false,
        error: "Announcement not found" 
      }, { status: 404 });
    }

    // Save current state to edit history
    const historyEntry = {
      title: existingAnnouncement.title,
      content: existingAnnouncement.content,
      tags: existingAnnouncement.tags,
      link: existingAnnouncement.link,
      isImportant: existingAnnouncement.isImportant,
      isUrgent: existingAnnouncement.isUrgent,
      isPinned: existingAnnouncement.isPinned,
      poll: clonePoll(existingAnnouncement.poll),
      editedAt: new Date()
    };

    const editHistory = [...(existingAnnouncement.editHistory || []), historyEntry];

    let nextPoll = existingAnnouncement.poll || null;
    if (Object.prototype.hasOwnProperty.call(body, "poll")) {
      if (body.poll === null) {
        nextPoll = null;
      } else {
        nextPoll = sanitizePollInput(body.poll, existingAnnouncement.poll);

        if (!nextPoll) {
          return NextResponse.json({
            success: false,
            error: "Poll configuration is invalid. Provide a question and at least two options."
          }, { status: 400 });
        }
      }
    }

    // Prepare update object
    const updateData = {
      ...body,
      editHistory,
      poll: nextPoll,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.editorName;
    delete updateData.editorRole;

    const result = await announcementsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Announcement not found" 
      }, { status: 404 });
    }

    // Log activity
    await logActivity({
      announcementId: id,
      action: "edit",
      performedBy: {
        name: body.editorName || existingAnnouncement.authorName || "Unknown",
        role: body.editorRole || existingAnnouncement.authorRole || "Unknown"
      },
      meta: { title: body.title || existingAnnouncement.title, pollUpdated: Object.prototype.hasOwnProperty.call(body, "poll") }
    });

    // Fetch updated announcement
    const updatedAnnouncement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Announcement updated successfully',
      data: {
        id: updatedAnnouncement._id.toString(),
        ...updatedAnnouncement,
        _id: undefined,
        poll: clonePoll(updatedAnnouncement.poll)
      }
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/[id] PUT] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}

// DELETE - Delete announcement
export async function DELETE(request, { params }) {
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

    await announcementsCollection.deleteOne({ _id: new ObjectId(id) });

    // Log activity
    await logActivity({
      announcementId: id,
      action: "delete",
      performedBy: {
        name: announcement.authorName || "Unknown",
        role: announcement.authorRole || "Unknown"
      },
      meta: { title: announcement.title }
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
      data: {
        id: announcement._id.toString(),
        ...announcement,
        _id: undefined
      }
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/[id] DELETE] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
