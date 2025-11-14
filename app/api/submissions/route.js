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
  // Try by _id as ObjectId
  if (ObjectId.isValid(identifier)) {
    const byObjectId = await collection.findOne({ _id: new ObjectId(identifier) });
    if (byObjectId) return byObjectId;
  }
  // Try by _id stored as a string (legacy/malformed)
  const byStringId = await collection.findOne({ _id: identifier });
  if (byStringId) return byStringId;
  // Try by synthetic id field (client-side format)
  const byClientId = await collection.findOne({ id: identifier });
  if (byClientId) return byClientId;
  // Fallback: find by course/class references matching identifier
  const byClassOrCourse = await collection.findOne({ $or: [ { classId: identifier }, { courseId: identifier } ] });
  return byClassOrCourse || null;
}

async function findCourseDocument(collection, identifier) {
  if (!identifier) return null;
  // Try by _id as ObjectId
  if (ObjectId.isValid(identifier)) {
    const byObjectId = await collection.findOne({ _id: new ObjectId(identifier) });
    if (byObjectId) return byObjectId;
  }
  // Try by _id stored as a string
  const byStringId = await collection.findOne({ _id: identifier });
  if (byStringId) return byStringId;
  // Try by synthetic id field
  const byClientId = await collection.findOne({ id: identifier });
  if (byClientId) return byClientId;
  return null;
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
      // Grade fields - stored in submissions collection
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
  console.log("[PATCH /api/submissions] === Request received ===");
  try {
    console.log("[PATCH] Step 1: Reading headers and body");
    const graderId = request.headers.get("x-uid");
    let body;
    try {
      body = await request.json();
    } catch (jsonErr) {
      console.error("[PATCH] Failed to parse JSON body:", jsonErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { submissionId, grade, maxScore, feedback } = body || {};
    console.log("[PATCH] Payload:", { submissionId, grade, maxScore, feedback, graderId });

    if (!submissionId) {
      console.log("[PATCH] Missing submissionId");
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    if (!graderId) {
      console.log("[PATCH] Missing graderId");
      return NextResponse.json(
        { error: "Missing grader identity" },
        { status: 401 }
      );
    }

    console.log("[PATCH] Step 2: Parsing submissionId as ObjectId");
    let submissionObjectId;
    try {
      submissionObjectId = new ObjectId(submissionId);
      console.log("[PATCH] Parsed ObjectId:", submissionObjectId.toString());
    } catch (parseErr) {
      console.error("[PATCH] Invalid ObjectId:", parseErr);
      return NextResponse.json(
        { error: "Invalid submissionId" },
        { status: 400 }
      );
    }

    console.log("[PATCH] Step 3: Getting collections");
    let submissionsCollection, assignmentsCollection, coursesCollection, notificationsCollection;
    try {
      submissionsCollection = await getSubmissionsCollection();
      assignmentsCollection = await getAssignmentsCollection();
      coursesCollection = await getCoursesCollection();
      notificationsCollection = await getNotificationsCollection();
      console.log("[PATCH] Collections obtained successfully");
    } catch (collErr) {
      console.error("[PATCH] Failed to get collections:", collErr);
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    console.log("[PATCH] Step 4: Finding submission");
    let submission;
    try {
      submission = await submissionsCollection.findOne({
        _id: submissionObjectId,
      });
      console.log("[PATCH] Found submission:", submission?._id?.toString() || "NULL");
    } catch (findErr) {
      console.error("[PATCH] Failed to find submission:", findErr);
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    if (!submission) {
      console.log("[PATCH] Submission not found in database");
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const assignmentId = submission.assignmentId;
    console.log("[PATCH] Looking up assignmentId:", assignmentId);
    const assignmentDoc = await findAssignmentDocument(
      assignmentsCollection,
      assignmentId
    );
    console.log("[PATCH] Found assignmentDoc:", assignmentDoc?._id?.toString() || "NULL");

    const courseId = assignmentDoc?.courseId || assignmentDoc?.classId;
    console.log("[PATCH] Looking up courseId:", courseId);
    const courseDoc = await findCourseDocument(coursesCollection, courseId);
    console.log("[PATCH] Found courseDoc:", courseDoc?._id?.toString() || "NULL");

    const instructorId =
      assignmentDoc?.instructorId || courseDoc?.instructorId || null;
    console.log("[PATCH] Authorization check - instructorId:", instructorId, "graderId:", graderId);
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

    const previouslyGraded =
      submission.grade !== null && submission.grade !== undefined;
    const update = {
      grade: parsedGrade,
      maxScore: parsedMaxScore,
      feedback: normalizedFeedback,
      gradedAt: parsedGrade !== null ? new Date() : null,
      gradedBy: parsedGrade !== null ? graderId : null,
    };

    console.log("[PATCH] Updating submission with:", update);
    console.log("[PATCH] Updating submission _id:", submissionObjectId.toString());
    console.log("[PATCH] Existing submission _id:", submission._id.toString());
    
    // Verify the IDs match
    if (submission._id.toString() !== submissionObjectId.toString()) {
      console.error("[PATCH] ID mismatch!");
      return NextResponse.json({ error: "Submission ID mismatch" }, { status: 500 });
    }

    let result;
    try {
      result = await submissionsCollection.findOneAndUpdate(
        { _id: submissionObjectId },
        { $set: update },
        { returnDocument: "after" }
      );
      console.log("[PATCH] Update result exists:", !!result);
      console.log("[PATCH] Update result.value exists:", !!result?.value);
      if (result?.value) {
        console.log("[PATCH] Updated submission _id:", result.value._id?.toString());
      }
    } catch (updateErr) {
      console.error("[PATCH] Update operation failed:", updateErr.message, updateErr.stack);
      return NextResponse.json({ error: "Failed to update submission: " + updateErr.message }, { status: 500 });
    }

    if (!result || !result.value) {
      console.error("[PATCH] Update returned no document");
      // Try a direct update without returnDocument to see if that works
      try {
        const directUpdate = await submissionsCollection.updateOne(
          { _id: submissionObjectId },
          { $set: update }
        );
        console.log("[PATCH] Direct update result:", directUpdate);
        
        if (directUpdate.modifiedCount > 0 || directUpdate.matchedCount > 0) {
          // Re-fetch the document
          const updatedDoc = await submissionsCollection.findOne({ _id: submissionObjectId });
          if (updatedDoc) {
            console.log("[PATCH] Successfully updated using direct method");
            result = { value: updatedDoc };
          }
        }
      } catch (directErr) {
        console.error("[PATCH] Direct update also failed:", directErr);
      }
      
      if (!result || !result.value) {
        return NextResponse.json(
          { error: "Failed to update submission - document not found after update" },
          { status: 500 }
        );
      }
    }

    // Notify the student of grading (best-effort)
    try {
      console.log("[PATCH] Creating notification for studentId:", submission.studentId);
      if (submission.studentId) {
        const isGradeRemoval = parsedGrade === null && previouslyGraded;
        const isFirstGrade = parsedGrade !== null && !previouslyGraded;
        const isGradeUpdate = parsedGrade !== null && previouslyGraded;

        const notifTitle = isGradeRemoval
          ? "Grade removed"
          : isFirstGrade
          ? "Assignment graded"
          : "Grade updated";
        const notifMessage = isGradeRemoval
          ? `Your grade for ${assignmentDoc?.title || "an assignment"} was removed.`
          : isFirstGrade
          ? `Your submission for ${assignmentDoc?.title || "an assignment"} has been graded.`
          : `Your grade for ${assignmentDoc?.title || "an assignment"} has been updated.`;

        const notifDoc = {
          userId: submission.studentId,
          title: notifTitle,
          message: notifMessage,
          read: false,
          createdAt: new Date(),
          extra: {
            type: "submission-graded",
            assignmentId: assignmentId || null,
            submissionId: submissionId,
            courseId: courseId || null,
            grade: parsedGrade,
            maxScore: parsedMaxScore,
            previouslyGraded,
          },
        };
        console.log("[PATCH] Inserting notification:", notifDoc.title);
        await notificationsCollection.insertOne(notifDoc);
        console.log("[PATCH] Notification inserted successfully");
      }
    } catch (notifyErr) {
      console.error("[PATCH] Failed to notify student of grade:", notifyErr.message, notifyErr.stack);
    }

    // Persist per-student grade under the assignment document (best-effort)
    try {
      console.log("[PATCH] Syncing grade to assignment document");
      if (assignmentDoc?._id && submission.studentId) {
        // Attempt to update existing grade entry for this student
        console.log("[PATCH] Trying to update existing grade entry");
        const updateExisting = await assignmentsCollection.updateOne(
          { _id: assignmentDoc._id, "grades.studentId": submission.studentId },
          {
            $set: {
              "grades.$.grade": parsedGrade,
              "grades.$.maxScore": parsedMaxScore,
              "grades.$.feedback": normalizedFeedback,
              "grades.$.gradedAt": update.gradedAt,
              "grades.$.gradedBy": graderId,
              "grades.$.submissionId": submissionId,
            },
          }
        );
        console.log("[PATCH] Update existing result - modified:", updateExisting?.modifiedCount);

        if (!updateExisting || updateExisting.modifiedCount === 0) {
          // No existing entry; push a new record
          console.log("[PATCH] Pushing new grade entry to assignment");
          const pushResult = await assignmentsCollection.updateOne(
            { _id: assignmentDoc._id },
            {
              $push: {
                grades: {
                  studentId: submission.studentId,
                  grade: parsedGrade,
                  maxScore: parsedMaxScore,
                  feedback: normalizedFeedback,
                  gradedAt: update.gradedAt,
                  gradedBy: graderId,
                  submissionId: submissionId,
                },
              },
            }
          );
          console.log("[PATCH] Push result - modified:", pushResult?.modifiedCount);
        }
      } else {
        console.log("[PATCH] Skipping assignment grade sync - missing assignmentDoc._id or studentId");
      }
    } catch (assignGradeErr) {
      console.error("[PATCH] Failed to sync grade into assignment document:", assignGradeErr.message, assignGradeErr.stack);
      // Non-fatal
    }

    const { _id, fileData, ...rest } = result.value;
    console.log("[PATCH] Successfully completed grade update for submission:", _id.toString());

    return NextResponse.json(
      {
        id: _id.toString(),
        ...rest,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/submissions PATCH] Fatal Error:", err.message);
    console.error("[API /api/submissions PATCH] Stack:", err.stack);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
