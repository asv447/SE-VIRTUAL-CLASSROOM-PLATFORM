// API routes for submissions
import { NextResponse } from "next/server";
import { 
  getSubmissionsCollection,
  getAssignmentsCollection,
  getCoursesCollection,
  getNotificationsCollection,
} from "@/lib/mongodb";
import { prepareFileForStorage } from "@/lib/file-upload";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const assignmentId = searchParams.get("assignmentId");

    const submissionsCollection = await getSubmissionsCollection();

    const buildIdMatchers = (value) => {
      if (!value) return [];
      const matchers = [{ assignmentId: value }, { classId: value }];
      try {
        const objectId = new ObjectId(value);
        matchers.push({ assignmentId: objectId });
        matchers.push({ classId: objectId });
      } catch (_) {
        // value is not a valid ObjectId; ignore
      }
      return matchers;
    };

    const query = (() => {
      if (assignmentId) {
        const matchers = buildIdMatchers(assignmentId);
        return matchers.length > 0 ? { $or: matchers } : {};
      }
      if (classId) {
        const matchers = buildIdMatchers(classId);
        return matchers.length > 0 ? { $or: matchers } : {};
      }
      return {};
    })();

    const submissions = await submissionsCollection.find(query).toArray();

    const formattedSubmissions = submissions.map((submission) => {
      const { _id, fileData, ...rest } = submission;
      return {
        id: _id?.toString(),
        ...rest,
        fileData: undefined,
      };
    });

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
  const studentEmail = formData.get("studentEmail");
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
  studentEmail: studentEmail || null,
      fileUrl,
      fileData,
      submittedAt: new Date(),
    };

    const result = await submissionsCollection.insertOne(newSubmission);

    //Notify the course instructor about the new submission
    try {
      const assignmentsCollection = await getAssignmentsCollection();
      const notificationsCollection = await getNotificationsCollection();
      const coursesCollection = await getCoursesCollection();

      let assignmentDoc = null;
      try {
        assignmentDoc = await assignmentsCollection.findOne({ _id: new ObjectId(assignmentId) });
      } catch (_) {}

      const courseId = assignmentDoc?.courseId || assignmentDoc?.classId || null;
      let courseDoc = null;
      if (courseId) {
        try {
          courseDoc = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
        } catch (_) {}
      }

      const instructorId = courseDoc?.instructorId;
      const instructorName = courseDoc?.instructorName || "Instructor";

      if (instructorId) {
        await notificationsCollection.insertOne({
          userId: instructorId,
          title: "New submission",
          message: `${studentName} submitted for assignment ${assignmentDoc?.title || assignmentId}`,
          read: false,
          createdAt: new Date(),
          extra: {
            type: "submission",
            courseId: courseId || null,
            assignmentId,
            submissionId: result.insertedId.toString(),
            studentId,
          },
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify instructor on submission:", notifErr);
      // Do not fail request
    }

    return NextResponse.json({ 
      id: result.insertedId.toString(),
      assignmentId,
      studentId,
  studentName,
  studentEmail: studentEmail || null,
      fileUrl,
      submittedAt: newSubmission.submittedAt,
    }, { status: 201 });
  } catch (err) {
    console.error("[API /api/submissions] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
