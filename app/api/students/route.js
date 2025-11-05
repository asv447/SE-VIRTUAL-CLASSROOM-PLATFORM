import { NextResponse } from "next/server";
import { getStudentsCollection } from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const studentsCollection = await getStudentsCollection();
    const query = classId ? { classId } : {};

    const students = await studentsCollection.find(query).toArray();
    return NextResponse.json(students, { status: 200 });
  } catch (err) {
    console.error("Error fetching students:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, email, studentId, classId } = await request.json();

    if (!name || !email || !studentId || !classId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const studentsCollection = await getStudentsCollection();
    const result = await studentsCollection.insertOne({
      name,
      email,
      studentId,
      classId,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "Student added", id: result.insertedId }, { status: 201 });
  } catch (err) {
    console.error("Error adding student:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
