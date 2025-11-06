// API routes for courses
import { NextResponse } from "next/server";
import { getCoursesCollection } from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    const coursesCollection = await getCoursesCollection();
    let query = {};

    // [NEW] Updated logic
    if (role === "instructor" && userId) {
      // Instructors see courses they created
      query.instructorId = userId;
    } else if (role === "student" && userId) {
      // Students see courses they are enrolled in
      query["students.userId"] = userId; // Check if userId is in the 'students' array
    } else if (!userId) {
      // Logged-out users see no courses
      query = { _id: null }; // Return no courses
    }
    // Else (student but no userId?) just return empty query

    const courses = await coursesCollection.find(query).toArray();

    const formattedCourses = courses.map((course) => ({
      id: course._id.toString(),
      name: course.title, // [FIX] Map title to name for the frontend
      ...course,
      _id: undefined,
    }));

    return NextResponse.json(formattedCourses, { status: 200 });
  } catch (err) {
    console.error("[API /api/courses] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // [FIX] Updated fields to match homepage 'handleCreateCourse'
    const {
      title,
      description,
      subject,
      instructorId,
      instructorName,
      courseCode,
    } = await request.json();

    // [FIX] Updated validation
    if (!title || !courseCode || !instructorId || !instructorName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, courseCode, instructorId, and instructorName",
        },
        { status: 400 }
      );
    }

    const coursesCollection = await getCoursesCollection();

    // [FIX] Check using 'courseCode'
    const existingCourse = await coursesCollection.findOne({ courseCode });
    if (existingCourse) {
      return NextResponse.json(
        { error: "Course code already exists" },
        { status: 400 }
      );
    }

    // [FIX] Save using fields from frontend
    const newCourse = {
      title,
      description: description || "",
      subject: subject || "",
      instructorId,
      instructorName,
      courseCode,
      createdAt: new Date(),
      updatedAt: new Date(),
      students: [], // Start with an empty array of students
    };

    const result = await coursesCollection.insertOne(newCourse);
    
    // Send back the created course
    const createdCourse = {
      id: result.insertedId.toString(),
      name: newCourse.title, // Map title to name for frontend consistency
      ...newCourse,
    };
    delete createdCourse._id;

    return NextResponse.json(createdCourse, { status: 201 });
  } catch (err) {
    console.error("[API /api/courses] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

