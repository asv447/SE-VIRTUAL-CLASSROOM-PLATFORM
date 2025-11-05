import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { postId, author, text } = await request.json();
    if (!postId || !author || !text)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const db = await getDatabase();
    await db.collection("streamPosts").updateOne(
      { _id: new ObjectId(postId) },
      { $push: { comments: { author, text, createdAt: new Date() } } }
    );

    return NextResponse.json({ message: "Comment added" }, { status: 201 });
  } catch (err) {
    console.error("[API /api/comments] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
