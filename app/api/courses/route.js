// API routes for courses
import { NextResponse } from "next/server";
import { getCoursesCollection } from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    const coursesCollection = await getCoursesCollection();
    let query = {};
    
    // If user is instructor, only show their courses
    if (role === 'instructor') {
      query.instructorId = userId;
    }
    
    const courses = await coursesCollection.find(query).toArray();
    
    const formattedCourses = courses.map((course) => ({
      id: course._id.toString(),
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
    const { name, code, description, instructorId, instructorName } = await request.json();
    
    if (!name || !code || !instructorId || !instructorName) {
      return NextResponse.json({ 
        error: "Missing required fields: name, code, instructorId, and instructorName" 
      }, { status: 400 });
    }

    const coursesCollection = await getCoursesCollection();
    
    // Check if course code already exists
    const existingCourse = await coursesCollection.findOne({ code });
    if (existingCourse) {
      return NextResponse.json({ error: "Course code already exists" }, { status: 400 });
    }
    
    const newCourse = {
      name,
      code,
      description: description || "",
      instructorId,
      instructorName,
      createdAt: new Date(),
      updatedAt: new Date(),
      students: [],
    };

    const result = await coursesCollection.insertOne(newCourse);

    return NextResponse.json({ 
      id: result.insertedId.toString(),
      ...newCourse
    }, { status: 201 });
  } catch (err) {
    console.error("[API /api/courses] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
