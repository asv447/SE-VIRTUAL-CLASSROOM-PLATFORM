// app/api/assignments/route.js

import { NextResponse } from "next/server";
import {
  getAssignmentsCollection,
  getCoursesCollection,
  getGroupsCollection, // <-- Requires this
  getNotificationsCollection, // <-- Requires this
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

    // --- 4. Handle File Upload (Simplified) ---
    // This is a stub. You will need a real file upload service for production.
    let fileUrl = null;
    let fileName = null;
    if (file && file.name && file.size > 0) {
      // ---
      // YOUR_UPLOAD_FUNCTION(file) would go here
      // ---
      fileName = file.name;
      fileUrl = `/uploads/assignments/${fileName}`; // Example path
      console.log(`[File Stub] "Uploading" ${fileName}`);
    } else {
      // Match the fileUrl: "" from your console log if no file is given
      fileUrl = ""; 
    }

    // --- 5. Prepare Database Object ---
    const newAssignment = {
      title,
      description,
      deadline: new Date(deadline),
      courseId,
      classId: courseId, // Add this for consistency
      instructorId,
      instructorName,
      maxScore: maxScore ? Number(maxScore) : null,
      fileUrl,
      fileName,
      audience, // [CRITICAL] Save the audience object
      createdAt: new Date(),
      updatedAt: new Date(), // Add updatedAt
    };

    const assignmentsCollection = await getAssignmentsCollection();
    const result = await assignmentsCollection.insertOne(newAssignment);

    // --- 6. [NEW] Create Notifications ---
    try {
      const coursesCollection = await getCoursesCollection();
      const groupsCollection = await getGroupsCollection();
      const notificationsCollection = await getNotificationsCollection();

      let studentRecipients = []; // { userId: '...' }

      if (audience.type === "class") {
        const course = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
        studentRecipients = course?.students || [];
      } else {
        // 'group'
        const groups = await groupsCollection.find({ 
          _id: { $in: audience.groupIds.map(id => new ObjectId(id)) } 
        }).toArray();
        
        const studentMap = new Map();
        for (const group of groups) {
          for (const member of group.members) {
            studentMap.set(member.userId, member); // Auto-de-duplicates
          }
        }
        studentRecipients = Array.from(studentMap.values());
      }
      
      if (studentRecipients.length > 0) {
        const notifDocs = studentRecipients
          .filter(s => s?.userId && s.userId !== instructorId) // Don't notify instructor
          .map(s => ({
            userId: s.userId,
            title: `New Assignment: ${title}`,
            message: description.slice(0, 100) + "...",
            read: false,
            createdAt: new Date(),
            extra: {
              type: "assignment",
              courseId: courseId,
              assignmentId: result.insertedId.toString(),
            },
          }));
        
        if (notifDocs.length > 0) {
          await notificationsCollection.insertMany(notifDocs, { ordered: false });
        }
      }
    } catch (notifError) {
      console.error("Failed to create assignment notifications:", notifError);
    }
    
    return NextResponse.json({ message: "Assignment created", id: result.insertedId }, { status: 201 });

  } catch (err) {
    console.error("[API /api/assignments] POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}