// API route for fetching all tags used in a classroom's announcements
import { NextResponse } from "next/server";
import { getAnnouncementsCollection } from "../../../../../lib/mongodb";

// GET - Fetch all unique tags for a classroom
export async function GET(request, { params }) {
  try {
    const { classroomId } = params;

    if (!classroomId) {
      return NextResponse.json({ 
        success: false,
        error: "classroomId is required" 
      }, { status: 400 });
    }

    const announcementsCollection = await getAnnouncementsCollection();
    
    // Get distinct tags for this classroom
    const tags = await announcementsCollection.distinct('tags', { classroomId });

    return NextResponse.json({
      success: true,
      count: tags.length,
      data: tags
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/announcements/tags/[classroomId] GET] Error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
