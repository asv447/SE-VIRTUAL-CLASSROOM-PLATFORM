import { NextResponse } from "next/server";
import { getClassroomsCollection } from "@/lib/mongodb";

function normalizeClassroom(doc) {
  if (!doc) {
    return null;
  }

  const id = doc._id?.toString ? doc._id.toString() : doc._id;
  return {
    ...doc,
    id,
    classroomId: doc.classroomId || id,
    _id: undefined,
  };
}

function buildUserFilters(role, userId, email) {
  const filters = [];

  if (!role) {
    return filters;
  }

  if (role === "instructor") {
    if (userId) {
      filters.push({ instructorId: userId });
      filters.push({ "professor._id": userId });
    }
    if (email) {
      filters.push({ instructorEmail: email });
      filters.push({ "professor.email": email });
    }
  }

  if (role === "student") {
    if (userId) {
      filters.push({ students: userId });
      filters.push({ "students._id": userId });
      filters.push({ "students.uid": userId });
    }
    if (email) {
      filters.push({ "students.email": email });
    }
  }

  return filters;
}

function generateClassCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    code += alphabet[index];
  }

  return code;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";
    const email = searchParams.get("email") || "";
    const role = searchParams.get("role") || "";

    const classroomsCollection = await getClassroomsCollection();

    const filters = buildUserFilters(role, userId, email);
    const query = filters.length > 0 ? { $or: filters } : {};

    const classrooms = await classroomsCollection
      .find(query)
      .sort({ subjectName: 1, courseCode: 1 })
      .toArray();

    const normalized = classrooms
      .map(normalizeClassroom)
      .filter(Boolean);

    return NextResponse.json({ classrooms: normalized }, { status: 200 });
  } catch (error) {
    console.error("[API /api/classrooms] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load classrooms" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      subjectName,
      courseCode,
      description = "",
      instructorId,
      instructorName,
      instructorEmail = "",
      classCode,
      students = [],
    } = body;

    if (!subjectName || !courseCode || !instructorId || !instructorName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const classroomsCollection = await getClassroomsCollection();

    const existing = await classroomsCollection.findOne({
      courseCode,
      instructorId,
    });

    if (existing) {
      return NextResponse.json(
        {
          classroomId: existing._id?.toString?.() || existing._id,
          classroom: normalizeClassroom(existing),
          message: "Classroom already exists for this course",
        },
        { status: 200 },
      );
    }

    const now = new Date();
    const generatedClassCode = (classCode || generateClassCode()).toUpperCase();

    const classroomDocument = {
      subjectName,
      courseCode,
      description,
      instructorId,
      instructorName,
      instructorEmail,
      professor: {
        _id: instructorId,
        name: instructorName,
        email: instructorEmail,
      },
      classCode: generatedClassCode,
      students: Array.isArray(students) ? students : [],
      posts: [],
      classroomChat: [],
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await classroomsCollection.insertOne(classroomDocument);

    const classroom = normalizeClassroom({
      ...classroomDocument,
      _id: insertResult.insertedId,
    });

    return NextResponse.json(
      {
        classroomId: classroom.id,
        classroom,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API /api/classrooms] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create classroom" },
      { status: 500 },
    );
  }
}