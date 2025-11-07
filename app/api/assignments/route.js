// API routes for assignments
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getStreamsCollection, getCoursesCollection, getNotificationsCollection } from "../../../lib/mongodb";
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
    
    // Allow two modes:
    // 1) Full assignment creation (courseId, title, description, deadline, instructorId, instructorName)
    // 2) File-only upload (used by whiteboard) - accept when only a file is provided
    const isFullCreate = courseId && title && description && deadline && instructorId && instructorName;
    const isFileOnly = file && file.size > 0 && !(courseId && title && description && deadline && instructorId && instructorName);

    if (!isFullCreate && !isFileOnly) {
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

    // Build assignment object. For file-only uploads, fill minimal metadata.
    const newAssignment = {
      _id: new ObjectId(assignmentId),
      classId: courseId || null,
      courseId: courseId || null,
      title: title || (fileData ? fileData.name : 'Uploaded File'),
      description: description || (fileData ? 'Uploaded via whiteboard editor' : ''),
      deadline: deadline || null,
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
        authorId: instructorId,
        author: { name: instructorName, id: instructorId, role: "instructor" },
        title: "New assignment",
        content: `📝 New assignment posted: ${title}`,
        type: "assignment",
        assignmentRef: result.insertedId.toString(),
        createdAt: new Date(),
      });
    } catch (streamError) {
      console.error("Failed to sync assignment with stream:", streamError);
    }

    // ✅ Create notifications for all enrolled students in this course
    try {
      if (courseId) {
        const coursesCollection = await getCoursesCollection();
        const notificationsCollection = await getNotificationsCollection();

        // Find course by its _id
        let courseDoc = null;
        try {
          courseDoc = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
        } catch (_) {
          // If courseId is not an ObjectId, skip notification fanout safely
        }

        const students = courseDoc?.students || [];
        if (students.length > 0) {
          const notifDocs = students
            .filter((s) => s?.userId && s.userId !== instructorId)
            .map((s) => ({
              userId: s.userId,
              title: "New assignment",
              message: `${title} has been posted by ${instructorName}`,
              read: false,
              createdAt: new Date(),
              extra: {
                type: "assignment",
                courseId,
                assignmentId: result.insertedId.toString(),
                deadline: deadline || null,
              },
            }));
          if (notifDocs.length > 0) {
            await notificationsCollection.insertMany(notifDocs, { ordered: false });
          }
        }
      }
    } catch (notifError) {
      console.error("Failed to create assignment notifications:", notifError);
      // Do not fail the request because of notification fanout issues
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
