// API route for fetching activity/audit trail for an announcement
import { NextResponse } from "next/server";
import { getAnnouncementActivityCollection } from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Fetch activity log for a specific announcement
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid announcement ID" 
      }, { status: 400 });
    }

    const activityCollection = await getAnnouncementActivityCollection();
    
    // Get all activity for this announcement, sorted by most recent first
    const activities = await activityCollection
      .find({ announcementId: new ObjectId(id) })
      .sort({ timestamp: -1 })
      .toArray();

    const formattedActivities = activities.map((activity) => ({
      id: activity._id.toString(),
      ...activity,
      _id: undefined,
    }));

    return NextResponse.json({
      success: true,
      count: formattedActivities.length,
      data: formattedActivities
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/[id]/activity GET] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
