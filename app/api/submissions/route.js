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

async function findAssignmentDocument(collection, identifier) {
  if (!identifier) return null;
  if (ObjectId.isValid(identifier)) {
    const byObjectId = await collection.findOne({
      _id: new ObjectId(identifier),
    });
    if (byObjectId) return byObjectId;
  }
  return collection.findOne({ id: identifier });
}

async function findCourseDocument(collection, identifier) {
  if (!identifier) return null;
  if (ObjectId.isValid(identifier)) {
    const byObjectId = await collection.findOne({
      _id: new ObjectId(identifier),
    });
    if (byObjectId) return byObjectId;
  }
  return collection.findOne({ id: identifier });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const assignmentId = searchParams.get("assignmentId");

    const submissionsCollection = await getSubmissionsCollection();

    const buildIdMatchers = (value) => {
      if (!value) return [];
      const matchers = [{ assignmentId: value }, { classId: value }];
      if (ObjectId.isValid(value)) {
        const objectId = new ObjectId(value);
        matchers.push({ assignmentId: objectId }, { classId: objectId });
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
      return NextResponse.json(
        { error: "Missing required fields: file is required for submissions" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Please select a valid file" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Failed to process file: " + uploadError.message },
        { status: 500 }
      );
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
      grade: null,
      maxScore: null,
      feedback: null,
      gradedAt: null,
      gradedBy: null,
    };

    const result = await submissionsCollection.insertOne(newSubmission);

    //Notify the course instructor about the new submission
    try {
      const assignmentsCollection = await getAssignmentsCollection();
      const notificationsCollection = await getNotificationsCollection();
      const coursesCollection = await getCoursesCollection();

      const assignmentDoc = await findAssignmentDocument(
        assignmentsCollection,
        assignmentId
      );

      const courseId =
        assignmentDoc?.courseId || assignmentDoc?.classId || null;
      const courseDoc = await findCourseDocument(coursesCollection, courseId);

      const instructorId = courseDoc?.instructorId;

      if (instructorId) {
        await notificationsCollection.insertOne({
          userId: instructorId,
          title: "New submission",
          message: `${studentName} submitted for assignment ${
            assignmentDoc?.title || assignmentId
          }`,
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
    } catch (error_) {
      console.error("Failed to notify instructor on submission:", error_);
      // Do not fail request
    }

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        assignmentId,
        studentId,
        studentName,
        studentEmail: studentEmail || null,
        fileUrl,
        submittedAt: newSubmission.submittedAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API /api/submissions] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const graderId = request.headers.get("x-uid");
    const body = await request.json();
    const { submissionId, grade, maxScore, feedback } = body || {};

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    if (!graderId) {
      return NextResponse.json(
        { error: "Missing grader identity" },
        { status: 401 }
      );
    }

    let submissionObjectId;
    try {
      submissionObjectId = new ObjectId(submissionId);
    } catch (_) {
      return NextResponse.json(
        { error: "Invalid submissionId" },
        { status: 400 }
      );
    }

    const submissionsCollection = await getSubmissionsCollection();
    const assignmentsCollection = await getAssignmentsCollection();
    const coursesCollection = await getCoursesCollection();
    const notificationsCollection = await getNotificationsCollection();

    const submission = await submissionsCollection.findOne({
      _id: submissionObjectId,
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const assignmentId = submission.assignmentId;
    const assignmentDoc = await findAssignmentDocument(
      assignmentsCollection,
      assignmentId
    );

    const courseId = assignmentDoc?.courseId || assignmentDoc?.classId;
    const courseDoc = await findCourseDocument(coursesCollection, courseId);

    const instructorId =
      assignmentDoc?.instructorId || courseDoc?.instructorId || null;
    if (instructorId && instructorId !== graderId) {
      return NextResponse.json(
        { error: "You are not allowed to grade this submission" },
        { status: 403 }
      );
    }

    const parsedGrade =
      grade === null || grade === undefined || grade === ""
        ? null
        : Number(grade);
    if (parsedGrade !== null && Number.isNaN(parsedGrade)) {
      return NextResponse.json(
        { error: "Grade must be a number" },
        { status: 400 }
      );
    }

    const parsedMaxScore =
      maxScore === null || maxScore === undefined || maxScore === ""
        ? null
        : Number(maxScore);
    if (parsedMaxScore !== null && Number.isNaN(parsedMaxScore)) {
      return NextResponse.json(
        { error: "Max score must be a number" },
        { status: 400 }
      );
    }

    const normalizedFeedback =
      typeof feedback === "string" && feedback.trim().length > 0
        ? feedback.trim()
        : null;

    const update = {
      grade: parsedGrade,
      maxScore: parsedMaxScore,
      feedback: normalizedFeedback,
      gradedAt: parsedGrade !== null ? new Date() : null,
      gradedBy: parsedGrade !== null ? graderId : null,
    };

    const result = await submissionsCollection.findOneAndUpdate(
      { _id: submissionObjectId },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return NextResponse.json(
        { error: "Failed to update submission" },
        { status: 500 }
      );
    }

    // Notify the student of grading (best-effort)
    try {
      if (submission.studentId) {
        await notificationsCollection.insertOne({
          userId: submission.studentId,
          title: "Assignment graded",
          message: `Your submission for ${
            assignmentDoc?.title || "an assignment"
          } has been graded.`,
          read: false,
          createdAt: new Date(),
          extra: {
            type: "submission-graded",
            assignmentId: assignmentId || null,
            submissionId: submissionId,
            courseId: courseId || null,
            grade: parsedGrade,
            maxScore: parsedMaxScore,
          },
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify student of grade:", notifyErr);
    }

    const { _id, fileData, ...rest } = result.value;

    return NextResponse.json(
      {
        id: _id.toString(),
        ...rest,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/submissions PATCH] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
