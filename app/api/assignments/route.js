// API routes for assignments
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getStreamsCollection } from "../../../lib/mongodb";
import { prepareFileForStorage } from "../../../lib/file-upload";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    const assignmentsCollection = await getAssignmentsCollection();
    let query = {};

    if (classId) query.classId = classId;
    if (role === "instructor") query.instructorId = userId;

    const assignments = await assignmentsCollection.find(query).toArray();

    const formattedAssignments = assignments.map((assignment) => ({
      id: assignment._id.toString(),
      ...assignment,
      _id: undefined,
    }));

    return NextResponse.json(formattedAssignments, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    const courseId = formData.get("courseId");
    const title = formData.get("title");
    const description = formData.get("description");
    const deadline = formData.get("deadline");
    const file = formData.get("file");
    const instructorId = formData.get("instructorId");
    const instructorName = formData.get("instructorName");

    if (!courseId || !title || !description || !deadline || !instructorId || !instructorName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const assignmentsCollection = await getAssignmentsCollection();
    const assignmentId = new ObjectId();
    let fileData = null;
    let fileUrl = "";

    if (file && file.size > 0) {
      try {
        fileData = await prepareFileForStorage(file);
        fileUrl = `/api/download/assignment/${assignmentId.toString()}`;
      } catch (uploadError) {
        console.error("File processing failed:", uploadError);
      }
    }

    const newAssignment = {
      _id: assignmentId,
      classId: courseId,
      courseId: courseId,
      instructorId,
      instructorName,
      title,
      description,
      deadline,
      fileUrl,
      fileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await assignmentsCollection.insertOne(newAssignment);

    // ✅ Add this assignment as a stream post
    try {
      const streamsCollection = await getStreamsCollection();

      await streamsCollection.insertOne({
        classId: courseId,
        author: { name: instructorName, id: instructorId, role: "instructor" },
        content: `📝 New assignment posted: ${title}`,
        type: "assignment",
        assignmentRef: result.insertedId.toString(),
        createdAt: new Date(),
      });
    } catch (streamError) {
      console.error("Failed to sync assignment with stream:", streamError);
    }

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        classId: courseId,
        courseId: courseId,
        title,
        description,
        deadline,
        fileUrl,
        createdAt: newAssignment.createdAt,
        updatedAt: newAssignment.updatedAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API /api/assignments] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
