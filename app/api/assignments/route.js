// app/api/assignments/route.js

import { NextResponse } from "next/server";
import {
  getAssignmentsCollection,
  getCoursesCollection,
  getGroupsCollection, // <-- Requires this
  getNotificationsCollection, // <-- Requires this
  getStreamsCollection,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";
// Note: This file handles file uploads. For Vercel, you'd need a blob storage.
// This example saves file info but doesn't handle the actual file storage.

// --- GET All Assignments (for a user) ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const userId = searchParams.get("userId");
    const classId = searchParams.get("classId"); // For student filtering

    if (!role || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignmentsCollection = await getAssignmentsCollection();
    const coursesCollection = await getCoursesCollection();
    const groupsCollection = await getGroupsCollection();

    let assignments = [];
    let submissionMap = new Map();

    if (role === "instructor") {
      // --- Instructor Logic: Get all assignments they created ---
      assignments = await assignmentsCollection
        .find({ instructorId: userId })
        .sort({ createdAt: -1 })
        .toArray();
    } else {
      // --- Student Logic: Get relevant assignments ---
      if (!classId) {
        return NextResponse.json(
          { error: "Missing classId for student" },
          { status: 400 }
        );
      }
      
      // 1. Get the user's group memberships for this course
      const myGroups = await groupsCollection
        .find({
          courseId: new ObjectId(classId),
          "members.userId": userId,
        })
        .toArray();
      const myGroupIds = myGroups.map((g) => g._id.toString());

      // 2. Find all assignments for this class
      const allAssignments = await assignmentsCollection
        .find({ $or: [{ courseId: classId }, { classId: classId }] }) // Handle both keys
        .sort({ deadline: 1 })
        .toArray();

      // 3. Filter for relevance
      assignments = allAssignments.filter((assignment) => {
        // If no audience or 'class', show it
        if (!assignment.audience || assignment.audience.type === "class") {
          return true;
        }
        // If 'group', check if user is in any of the assigned groups
        if (assignment.audience.type === "group") {
          const assignedGroupIds = assignment.audience.groupIds || [];
          return assignedGroupIds.some((id) => myGroupIds.includes(id));
        }
        return false;
      });

      // 4. Check submission status for each assignment
      const submissionsCollection = await getSubmissionsCollection();
      const submissions = await submissionsCollection.find({ studentId: userId }).toArray();
      const submissionMap = new Map();
      submissions.forEach(sub => {
        submissionMap.set(sub.assignmentId, true);
      });
    }

    // --- Enrich assignments with Course Titles (for Admin Dashboard) ---
    const courseMap = new Map();
    const allCourses = await coursesCollection.find().toArray();
    for (const course of allCourses) {
      courseMap.set(course._id.toString(), course.title);
    }

    const populatedAssignments = assignments.map((a) => ({
      ...a, // [FIX] This line ensures all fields, including audience, are returned
      id: a._id.toString(),
      courseId: a.courseId || a.classId, // Standardize courseId
      courseTitle: courseMap.get(a.courseId) || courseMap.get(a.classId) || "Unknown Course",
      submitted: submissionMap.has(a._id.toString()) || false,
      _id: undefined, // Remove _id
    }));

    return NextResponse.json(populatedAssignments, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments] GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- POST a new Assignment ---
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // --- 1. Get all fields from FormData ---
    const title = formData.get("title");
    const description = formData.get("description");
    const deadline = formData.get("deadline");
    const courseId = formData.get("courseId");
    const instructorId = formData.get("instructorId");
    const instructorName = formData.get("instructorName");
    const maxScore = formData.get("maxScore");
    const file = formData.get("file"); // This is a File object

    // [NEW] Get Audience Fields
    const audienceType = formData.get("audienceType"); // "class" or "group"
    const audienceGroupIdsJSON = formData.get("audienceGroupIds"); // A JSON string '["id1", "id2"]'

    // --- 2. Validation ---
    if (!title || !description || !deadline || !courseId || !instructorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // --- 3. Handle Audience ---
    let audience = { type: "class", groupIds: [] }; // Default
    if (audienceType === "group") {
      try {
        const groupIds = JSON.parse(audienceGroupIdsJSON);
        if (Array.isArray(groupIds) && groupIds.length > 0) {
          audience = { type: "group", groupIds };
        } else {
          // If "group" is selected but no groups, default to class
          audience = { type: "class", groupIds: [] };
        }
      } catch (e) {
         // If JSON is invalid, default to class
        audience = { type: "class", groupIds: [] };
      }
    }

    // Ensure we have collections available for write operations
    const assignmentsCollection = await getAssignmentsCollection();

    // Generate a new assignment id and normalize file info (no storage handled here)
    const assignmentId = new ObjectId();
    let fileUrl = null;
    let fileData = null;
    if (file && typeof file.name === "string") {
      fileData = { name: file.name, size: file.size, type: file.type };
    }

    // Build assignment object
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
    console.error("[API /api/assignments] POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
