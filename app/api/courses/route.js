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
    
    // [FIX] I've seen your homepage uses 'id' (not '_id'),
    // so this formatting is correct.
    const formattedCourses = courses.map((course) => ({
      id: course._id.toString(),
      name: course.title, // [FIX] Send 'name' as 'title' to match frontend expectation
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
    // [FIX] Updated to match the exact fields from your homepage's handleCreateCourse
    const { 
      title, 
      description, 
      subject, 
      instructorId, 
      instructorName, 
      courseCode 
    } = await request.json();
    
    if (!title || !courseCode || !instructorId || !instructorName) {
      return NextResponse.json({ 
        error: "Missing required fields: title, courseCode, instructorId, and instructorName" 
      }, { status: 400 });
    }

    const coursesCollection = await getCoursesCollection();
    
    // Check if course code already exists
    const existingCourse = await coursesCollection.findOne({ courseCode });
    if (existingCourse) {
      return NextResponse.json({ error: "Course code already exists" }, { status: 400 });
    }
    
    const newCourse = {
      title, // [FIX] Save as 'title'
      courseCode, // [FIX] Save as 'courseCode'
      description: description || "",
      subject: subject || "",
      instructorId,
      instructorName,
      createdAt: new Date(),
      updatedAt: new Date(),
      students: [],
    };

    const result = await coursesCollection.insertOne(newCourse);
    
    // Send back an ID the frontend can use
    const createdCourse = {
      id: result.insertedId.toString(),
      ...newCourse,
    };
    delete createdCourse._id; // Clean up the response

    return NextResponse.json(createdCourse, { status: 201 });

  } catch (err) {
    console.error("[API /api/courses] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
