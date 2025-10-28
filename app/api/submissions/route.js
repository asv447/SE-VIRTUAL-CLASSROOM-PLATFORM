// API routes for submissions
import { NextResponse } from "next/server";
import { getSubmissionsCollection } from "../../../lib/mongodb";
import { prepareFileForStorage } from "../../../lib/file-upload";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const assignmentId = searchParams.get('assignmentId');
    
    const submissionsCollection = await getSubmissionsCollection();
    const submissions = assignmentId 
      ? await submissionsCollection.find({ assignmentId }).toArray()
      : await submissionsCollection.find({}).toArray();
    
    const formattedSubmissions = submissions.map((submission) => ({
      id: submission._id.toString(),
      ...submission,
      _id: undefined,
    }));

    return NextResponse.json(formattedSubmissions, { status: 200 });
  } catch (err) {
    console.error("[API /api/submissions] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const assignmentId = formData.get("assignmentId");
    const studentId = formData.get("studentId");
    const studentName = formData.get("studentName");
    const file = formData.get("file");
    
    if (!assignmentId || !studentId || !studentName || !file) {
      return NextResponse.json({ error: "Missing required fields: file is required for submissions" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Please select a valid file" }, { status: 400 });
    }

    const submissionsCollection = await getSubmissionsCollection();
    const submissionId = new ObjectId().toString();
    let fileData = null;
    let fileUrl = "";

    try {
      fileData = await prepareFileForStorage(file);
      fileUrl = `/api/download/submission/${submissionId}`;
    } catch (uploadError) {
      console.error("File processing failed:", uploadError);
      return NextResponse.json({ error: "Failed to process file: " + uploadError.message }, { status: 500 });
    }
    
    const newSubmission = {
      _id: new ObjectId(submissionId),
      classId: assignmentId,
      assignmentId,
      studentId,
      studentName,
      fileUrl,
      fileData,
      submittedAt: new Date(),
    };

    const result = await submissionsCollection.insertOne(newSubmission);

    return NextResponse.json({ 
      id: result.insertedId.toString(),
      assignmentId,
      studentId,
      studentName,
      fileUrl,
      submittedAt: newSubmission.submittedAt,
    }, { status: 201 });
  } catch (err) {
    console.error("[API /api/submissions] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
