// app/api/groups/route.js

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getGroupsCollection,
  getCoursesCollection,
} from "@/lib/mongodb";

// GET all groups for a specific course
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
    }

    const groupsCol = await getGroupsCollection();
    
    // --- [THIS IS THE FIX] ---
    // This query is more robust. It checks for the courseId as both
    // an ObjectId and a string, which is a common mismatch issue.
    let courseObjectId = null;
    try {
      courseObjectId = new ObjectId(courseId);
    } catch (e) {
      // Not a valid ObjectId, will only check as string
    }

    const query = {
      $or: [
        { courseId: courseObjectId }, // Check as ObjectId
        { courseId: courseId }        // Check as String
      ]
    };
    
    const groups = await groupsCol.find(query).toArray();
    // --- [END FIX] ---
    
    return NextResponse.json(groups, { status: 200 });
  } catch (err) {
    console.error("[GET /api/groups]", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST a new group
export async function POST(request) {
  try {
    const uid = request.headers.get("x-uid");
    const body = await request.json();
    const { courseId, name, representative, members } = body;

    if (!courseId || !name || !representative || !members) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Security Check: Only instructor can create groups ---
    const coursesCol = await getCoursesCollection();
    const course = await coursesCol.findOne({
      _id: new ObjectId(courseId),
      instructorId: uid, // Check if requester is the instructor
    });

    if (!course) {
      return NextResponse.json(
        { error: "Forbidden: Not the course instructor." },
        { status: 403 }
      );
    }
    // --- End Security Check ---

    const groupsCol = await getGroupsCollection();
    const trimmedName = name.trim();
    const existingGroup = await groupsCol.findOne({
      courseId: new ObjectId(courseId),
      name: trimmedName, 
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: "A group with this name already exists in this course." },
        { status: 409 } // 409 Conflict is a good status code here
      );
    }
    const newGroup = {
      courseId: new ObjectId(courseId),
      name: trimmedName, // --- [MODIFIED] Use the trimmed name
      representative, // { userId, name }
      members, // [ { userId, name }, ... ]
      createdAt: new Date(),
    };

    const result = await groupsCol.insertOne(newGroup);

    return NextResponse.json(
      { message: "Group created", groupId: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/groups]", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}