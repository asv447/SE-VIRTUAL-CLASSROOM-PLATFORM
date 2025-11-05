import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("classrooms");

    // 🧠 Try to convert the ID to ObjectId — if it fails, treat as string
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id }; // fallback if id isn't a valid ObjectId
    }

    const classroom = await collection.findOne(query);

    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error("Error fetching classroom:", error);
    return NextResponse.json({ error: "Failed to load classroom" }, { status: 500 });
  }
}
