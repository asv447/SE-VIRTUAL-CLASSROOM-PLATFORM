// API routes for assignments
import { NextResponse } from "next/server";
import { getAssignmentsCollection } from "../../../lib/mongodb";
import { prepareFileForStorage } from "../../../lib/file-upload";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    const assignmentsCollection = await getAssignmentsCollection();
    const assignments = classId 
      ? await assignmentsCollection.find({ classId }).toArray()
      : await assignmentsCollection.find({}).toArray();
    
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
    
    if (!courseId || !title || !description || !deadline) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const assignmentsCollection = await getAssignmentsCollection();
    const assignmentId = new ObjectId().toString();
    let fileData = null;
    let fileUrl = "";

    if (file && file.size > 0) {
      try {
        fileData = await prepareFileForStorage(file);
        fileUrl = `/api/download/assignment/${assignmentId}`;
      } catch (uploadError) {
        console.error("File processing failed:", uploadError);
      }
    }
    
    const newAssignment = {
      _id: new ObjectId(assignmentId),
      classId: courseId,
      courseId: courseId,
      title,
      description,
      deadline,
      fileUrl,
      fileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await assignmentsCollection.insertOne(newAssignment);

    return NextResponse.json({ 
      id: result.insertedId.toString(),
      classId: courseId,
      courseId: courseId,
      title,
      description,
      deadline,
      fileUrl,
      createdAt: newAssignment.createdAt,
      updatedAt: newAssignment.updatedAt,
    }, { status: 201 });
  } catch (err) {
    console.error("[API /api/assignments] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
