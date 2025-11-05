import { NextResponse } from "next/server";
import { getStreamsCollection } from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();
    const posts = await streamsCollection.find({ classId }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(posts, { status: 200 });
  } catch (err) {
    console.error("Error fetching stream posts:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { classId, author, content, assignment } = await request.json();

    if (!classId || !author || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();
    const newPost = {
      classId,
      author,
      content,
      assignment: assignment || null,
      comments: [],
      createdAt: new Date(),
    };

    const result = await streamsCollection.insertOne(newPost);

    return NextResponse.json(
      { message: "Post added to stream", id: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding stream post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
