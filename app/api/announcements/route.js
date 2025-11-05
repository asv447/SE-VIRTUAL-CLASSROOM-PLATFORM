// API routes for announcements
import { NextResponse } from "next/server";
import { getAnnouncementsCollection, getAnnouncementActivityCollection } from "../../../lib/mongodb";
import { sanitizePollInput, clonePoll } from "../../../lib/announcementPoll";
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

// GET - Fetch announcements by classroomId with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const search = searchParams.get('search');
    const important = searchParams.get('important');
    const urgent = searchParams.get('urgent');
    const pinned = searchParams.get('pinned');
    const tags = searchParams.get('tags');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!classroomId) {
      return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
    }

    const announcementsCollection = await getAnnouncementsCollection();
    let query = { classroomId };

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Boolean filters
    if (important !== null && important !== undefined) {
      query.isImportant = important === 'true';
    }
    if (urgent !== null && urgent !== undefined) {
      query.isUrgent = urgent === 'true';
    }
    if (pinned !== null && pinned !== undefined) {
      query.isPinned = pinned === 'true';
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const announcements = await announcementsCollection
      .find(query)
      .sort({ isPinned: -1, isUrgent: -1, isImportant: -1, createdAt: -1 })
      .toArray();

    const formattedAnnouncements = announcements.map((announcement) => ({
      id: announcement._id.toString(),
      ...announcement,
      _id: undefined,
    }));

    return NextResponse.json({
      success: true,
      count: formattedAnnouncements.length,
      data: formattedAnnouncements
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}

// POST - Create new announcement
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      authorName,
      authorRole,
      classroomId,
      subject,
      isImportant = false,
      isUrgent = false,
      isPinned = false,
      tags = [],
      link = {}
    } = body;

    // Validation
    if (!title || !content || !authorName || !authorRole || !classroomId || !subject) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required fields: title, content, authorName, authorRole, classroomId, subject" 
      }, { status: 400 });
    }

    const announcementsCollection = await getAnnouncementsCollection();
    const announcementId = new ObjectId();
    const poll = sanitizePollInput(body.poll) || null;

    const newAnnouncement = {
      _id: announcementId,
      title,
      content,
      authorName,
      authorRole,
      classroomId,
      subject,
      isImportant,
      isUrgent,
      isPinned,
      tags: Array.isArray(tags) ? tags : [],
      link: {
        url: link.url || "",
        text: link.text || "View Link"
      },
      poll,
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await announcementsCollection.insertOne(newAnnouncement);

    // Log activity
    await logActivity({
      announcementId: announcementId.toString(),
      action: "create",
      performedBy: {
        name: authorName,
        role: authorRole
      },
      meta: { title, classroomId, hasPoll: Boolean(poll) }
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        id: announcementId.toString(),
        ...newAnnouncement,
        _id: undefined,
        poll: poll ? clonePoll(poll) : null
      }
    }, { status: 201 });
  } catch (err) {
    console.error("[API /api/announcements POST] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
