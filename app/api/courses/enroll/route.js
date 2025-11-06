import { NextResponse } from "next/server";
import {
  getCoursesCollection,
  getUsersCollection,
} from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { courseCode, userId } = await request.json();

    if (!courseCode || !userId) {
      return NextResponse.json(
        { error: "Missing course code or user ID" },
        { status: 400 }
      );
    }

    // 1. Find the user who is trying to enroll
    const usersCollection = await getUsersCollection();

    // [FIX] Changed 'userId' to 'uid' to match your database screenshot
    const user = await usersCollection.findOne({ uid: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Find the course they want to join
    const coursesCollection = await getCoursesCollection();
    const course = await coursesCollection.findOne({
      courseCode: courseCode.toUpperCase(),
    }); // Check uppercase

    if (!course) {
      return NextResponse.json(
        { error: "Course code not found" },
        { status: 404 }
      );
    }

    // 3. Check if user is already enrolled
    const isEnrolled = course.students?.some(
      (student) => student.userId === userId
    );
    if (isEnrolled) {
      return NextResponse.json(
        { error: "You are already enrolled in this course" },
        { status: 400 }
      );
    }

    // 4. Add the student to the 'students' array
    const studentData = {
      userId: userId,
      name: user.username || user.name, // Use 'username' or 'name' from your user doc
      enrolledAt: new Date(),
    };

    const result = await coursesCollection.updateOne(
      { _id: course._id },
      {
        $addToSet: { students: studentData }, // $addToSet prevents duplicates
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Failed to enroll in course, please try again.");
    }

    return NextResponse.json(
      { message: "Enrolled successfully!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/courses/enroll] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

