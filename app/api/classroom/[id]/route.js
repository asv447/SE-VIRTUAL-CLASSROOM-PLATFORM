import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
// [FIXED] Import the helper function from your lib/mongodb.js file
import { getCoursesCollection } from "../../../../lib/mongodb";

export async function GET(req, { params }) {
  const { id } = params;
  console.log("API hit with ID:", id);

  if (!id || id === "undefined") {
    console.log("No valid ID provided");
    return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 });
  }

  try {
    // [FIXED] Use the helper function to get your "courses" collection
    // This function automatically handles the database connection for you.
    const collection = await getCoursesCollection();

    if (!ObjectId.isValid(id)) {
      console.log("Invalid ObjectId:", id);
      return NextResponse.json({ error: "Invalid classroom ID" }, { status: 400 });
    }

    // Now we find the course by its ID
    const classroom = await collection.findOne({ _id: new ObjectId(id) });

    if (!classroom) {
      console.log("Classroom not found for ID:", id);
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    // [FIXED] This part now matches what the frontend page expects
    const classroomData = {
      ...classroom,
      instructor: classroom.instructorName || "Unknown Instructor",
      classCode: classroom.courseCode || "N/A",
    };

    return NextResponse.json({ classroom: classroomData });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Failed to load classroom" }, { status: 500 });
  }
}

