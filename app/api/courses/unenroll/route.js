import { NextResponse } from "next/server";
import {
  getCoursesCollection,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { courseId, userId } = await request.json();

    if (!courseId || !userId) {
      return NextResponse.json(
        { error: "Missing course ID or user ID" },
        { status: 400 }
      );
    }

    // 1. Find the course
    const coursesCollection = await getCoursesCollection();
    
    let course = null;
    try {
      course = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid course ID format" },
        { status: 400 }
      );
    }

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // 2. Check if user is enrolled
    const isEnrolled = course.students?.some(
      (student) => student.userId === userId
    );
    
    if (!isEnrolled) {
      return NextResponse.json(
        { error: "You are not enrolled in this course" },
        { status: 400 }
      );
    }

    // 3. Remove the student from the 'students' array
    const result = await coursesCollection.updateOne(
      { _id: new ObjectId(courseId) },
      {
        $pull: { students: { userId: userId } }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Failed to unenroll from course, please try again.");
    }

    return NextResponse.json(
      { message: "Unenrolled successfully!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/courses/unenroll] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
