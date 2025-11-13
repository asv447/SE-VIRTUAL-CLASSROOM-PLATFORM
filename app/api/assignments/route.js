// API routes for assignments
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getStreamsCollection, getCoursesCollection, getNotificationsCollection } from "@/lib/mongodb";
import { prepareFileForStorage } from "@/lib/file-upload";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    console.log("[API /api/assignments GET] Params:", { classId, userId, role });

  const assignmentsCollection = await getAssignmentsCollection();
  const coursesCollection = await getCoursesCollection();
  let query = {};
  const conditions = [];

    if (classId) {
      // Support legacy records that may use either classId or courseId
      conditions.push({ $or: [{ classId: classId }, { courseId: classId }] });
    }
    if (role === "instructor" && userId) {
      // Instructors should only see assignments they created
      conditions.push({ instructorId: userId });
    }

    if (role === "student" && userId) {
      // Students should only see assignments for courses they are enrolled in
      // If a specific classId is requested, verify enrollment
      try {
        if (classId) {
          // verify that the student is enrolled in this class
          const cidObj = (() => {
            try { return new ObjectId(classId); } catch { return null; }
          })();
          let courseDoc = null;
          if (cidObj) {
            courseDoc = await coursesCollection.findOne({ _id: cidObj });
          } else {
            // fallback: look by string id if not ObjectId
            courseDoc = await coursesCollection.findOne({ _id: classId });
          }
          const enrolled = (courseDoc?.students || []).some(s => s?.userId === userId);
          if (!enrolled) {
            // Not enrolled -> return empty set early
            return NextResponse.json([], { status: 200 });
          }
          // else allow the existing classId condition below to filter
        } else {
          // No classId provided: find all course ids the student is enrolled in
          const studentCourses = await coursesCollection.find({ "students.userId": userId }).project({ _id: 1 }).toArray();
          const ids = studentCourses.map(c => c._id?.toString()).filter(Boolean);
          if (ids.length === 0) {
            // Student not enrolled anywhere
            return NextResponse.json([], { status: 200 });
          }
          // Limit assignments to those whose classId/courseId is in the student's courses
          conditions.push({ $or: [{ classId: { $in: ids } }, { courseId: { $in: ids } }] });
        }
      } catch (e) {
        console.error("Error resolving student course membership:", e);
        return NextResponse.json({ error: "Failed to resolve student courses" }, { status: 500 });
      }
    }

    if (conditions.length === 1) {
      query = conditions[0];
    } else if (conditions.length > 1) {
      query = { $and: conditions };
    }

    console.log("[API /api/assignments GET] Query:", JSON.stringify(query));

    const assignments = await assignmentsCollection.find(query).toArray();

    console.log("[API /api/assignments GET] Found assignments:", assignments.length);

    // Build a map of courseId -> course title for enrichment (avoid client Unknown Course labels)
    const courseIds = [...new Set(assignments.map(a => a.classId || a.courseId).filter(Boolean))];
    let courseMap = {};
    if (courseIds.length > 0) {
      const courseDocs = await coursesCollection.find({ _id: { $in: courseIds.map(cid => {
        try { return new ObjectId(cid); } catch { return null; }
      }).filter(Boolean) }}).toArray();
      courseDocs.forEach(c => { courseMap[c._id.toString()] = c.title; });
    }

    const formattedAssignments = assignments.map((assignment) => ({
      id: assignment._id.toString(),
      ...assignment,
      courseTitle: courseMap[assignment.classId || assignment.courseId] || null,
      _id: undefined,
    }));

    return NextResponse.json(formattedAssignments, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments GET] Error:", err);
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
    
    // Strict validation: all fields required except file
    if (!courseId || !title || !description || !deadline || !instructorId || !instructorName) {
      return NextResponse.json({ error: "Missing required fields: courseId, title, description, deadline, instructorId, instructorName" }, { status: 400 });
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
      classId: courseId,
      courseId: courseId,
      instructorId,
      instructorName,
      title,
      description,
      deadline,
      fileUrl,
      fileData,
      // Store per-student grading summaries under the assignment
      grades: [],
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
