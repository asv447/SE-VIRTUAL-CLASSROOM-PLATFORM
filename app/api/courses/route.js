// API routes for courses
import { NextResponse } from "next/server";
import { getCoursesCollection } from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const coursesCollection = await getCoursesCollection();
    const courses = await coursesCollection.find({}).toArray();
    
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
    const { name, code, description } = await request.json();
    
    if (!name || !code) {
      return NextResponse.json({ error: "Missing required fields: name and code" }, { status: 400 });
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
      createdAt: new Date(),
      updatedAt: new Date(),
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
