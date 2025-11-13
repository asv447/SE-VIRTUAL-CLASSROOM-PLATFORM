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

    if (!courseId || !ObjectId.isValid(courseId)) {
      return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
    }

    // TODO: Add security check - is the user allowed to see this?
    // (e.g., check if requester UID is in the course's student or instructor list)

    const groupsCol = await getGroupsCollection();
    const groups = await groupsCol
      .find({ courseId: new ObjectId(courseId) })
      .toArray();

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
    const newGroup = {
      courseId: new ObjectId(courseId),
      name,
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