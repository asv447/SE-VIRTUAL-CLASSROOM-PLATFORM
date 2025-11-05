import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAnnouncementsCollection, getAnnouncementActivityCollection } from "../../../../../lib/mongodb";
import { clonePoll } from "../../../../../lib/announcementPoll";

async function logActivity({ announcementId, action, performedBy, meta }) {
  try {
    const activityCollection = await getAnnouncementActivityCollection();
    await activityCollection.insertOne({
      announcementId: new ObjectId(announcementId),
      action,
      performedBy,
      meta,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[Announcement Activity Log Error]:", error.message);
  }
}

const normalizeOptionIds = (optionIds) => {
  if (!Array.isArray(optionIds)) {
    return [];
  }
  return Array.from(
    new Set(
      optionIds
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
};

export async function POST(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: "Invalid announcement ID",
      }, { status: 400 });
    }

    const { optionIds, userId, userName, userRole } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({
        success: false,
        error: "User ID is required to submit a vote",
      }, { status: 400 });
    }

    const normalizedOptionIds = normalizeOptionIds(optionIds);
    if (normalizedOptionIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Select at least one option before submitting your vote",
      }, { status: 400 });
    }

    const announcementsCollection = await getAnnouncementsCollection();
    const announcement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    if (!announcement) {
      return NextResponse.json({
        success: false,
        error: "Announcement not found",
      }, { status: 404 });
    }

    if (!announcement.poll) {
      return NextResponse.json({
        success: false,
        error: "Poll is not available on this announcement",
      }, { status: 400 });
    }

    if (!announcement.poll.isEnabled) {
      return NextResponse.json({
        success: false,
        error: "Poll is currently closed",
      }, { status: 403 });
    }

    const validOptionIds = new Set(announcement.poll.options.map((option) => option.id));
    const filteredSelection = normalizedOptionIds.filter((optionId) => validOptionIds.has(optionId));

    if (filteredSelection.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Selected options are not valid",
      }, { status: 400 });
    }

    const finalSelection = announcement.poll.allowMultiple
      ? filteredSelection
      : filteredSelection.slice(0, 1);

    const updatedOptions = announcement.poll.options.map((option) => {
      const existingVoters = new Set(Array.isArray(option.voters) ? option.voters : []);
      existingVoters.delete(userId);
      if (finalSelection.includes(option.id)) {
        existingVoters.add(userId);
      }
      return {
        ...option,
        voters: Array.from(existingVoters),
      };
    });

    const timestamp = new Date();
    const update = {
      poll: {
        ...announcement.poll,
        options: updatedOptions,
        updatedAt: timestamp,
        lastResponseAt: timestamp,
      },
      updatedAt: timestamp,
    };

    const { value: updatedAnnouncement } = await announcementsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!updatedAnnouncement) {
      return NextResponse.json({
        success: false,
        error: "Failed to record vote",
      }, { status: 500 });
    }

    await logActivity({
      announcementId: id,
      action: "vote",
      performedBy: {
        name: userName || "Unknown",
        role: userRole || "Student",
        userId,
      },
      meta: { optionIds: finalSelection },
    });

    return NextResponse.json({
      success: true,
      message: "Vote submitted",
      data: {
        id: updatedAnnouncement._id.toString(),
        ...updatedAnnouncement,
        _id: undefined,
        poll: clonePoll(updatedAnnouncement.poll),
      },
    });
  } catch (error) {
    console.error("[API /api/announcements/[id]/poll POST] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: "Invalid announcement ID",
      }, { status: 400 });
    }

    const { userId, userName, userRole } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({
        success: false,
        error: "User ID is required to clear a vote",
      }, { status: 400 });
    }

    const announcementsCollection = await getAnnouncementsCollection();
    const announcement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    if (!announcement || !announcement.poll) {
      return NextResponse.json({
        success: false,
        error: "Poll not found",
      }, { status: 404 });
    }

    const updatedOptions = announcement.poll.options.map((option) => {
      const voters = new Set(Array.isArray(option.voters) ? option.voters : []);
      voters.delete(userId);
      return {
        ...option,
        voters: Array.from(voters),
      };
    });

    const timestamp = new Date();
    const update = {
      poll: {
        ...announcement.poll,
        options: updatedOptions,
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    };

    const { value: updatedAnnouncement } = await announcementsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!updatedAnnouncement) {
      return NextResponse.json({
        success: false,
        error: "Failed to clear vote",
      }, { status: 500 });
    }

    await logActivity({
      announcementId: id,
      action: "vote-clear",
      performedBy: {
        name: userName || "Unknown",
        role: userRole || "Student",
        userId,
      },
      meta: {},
    });

    return NextResponse.json({
      success: true,
      message: "Vote removed",
      data: {
        id: updatedAnnouncement._id.toString(),
        ...updatedAnnouncement,
        _id: undefined,
        poll: clonePoll(updatedAnnouncement.poll),
      },
    });
  } catch (error) {
    console.error("[API /api/announcements/[id]/poll DELETE] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
