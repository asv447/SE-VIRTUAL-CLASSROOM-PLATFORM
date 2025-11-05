import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const classrooms = await db.collection("classrooms").find({}).toArray();

    return NextResponse.json({ classrooms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json({ error: "Failed to fetch classrooms" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, subject, instructor, instructorEmail, classCode, students, createdAt } = body;

    // Validate required fields
    if (!title || !instructor || !instructorEmail || !classCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Create classroom object
    const newClassroom = {
      title,
      description,
      subject,
      instructor,
      instructorEmail,
      classCode,
      students: students || [],
      assignments: [],
      posts: [],
      chat: [],
      createdAt: createdAt || new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("classrooms").insertOne(newClassroom);

    return NextResponse.json(
      { message: "Classroom created successfully", classroom: { _id: result.insertedId, ...newClassroom } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating classroom:", error);
    return NextResponse.json({ error: "Failed to create classroom" }, { status: 500 });
  }
}
