import { NextResponse } from "next/server";
import {
  getStreamsCollection,
  getUsersCollection,
} from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();

    const posts = await streamsCollection
      .aggregate([
        { $match: { classId: classId } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "uid", // This matches your user screenshot
            as: "authorDetails",
          },
        },
        {
          $unwind: {
            path: "$authorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            // [UPDATE] Add all the new fields
            _id: 1,
            classId: 1,
            title: 1,
            content: 1,
            isImportant: 1,
            isUrgent: 1,
            link: 1,
            assignment: 1,
            comments: 1,
            createdAt: 1,
            author: {
              name: {
                $ifNull: ["$authorDetails.username", "$authorDetails.name"],
              },
              id: "$authorId",
            },
          },
        },
      ])
      .toArray();

    const formattedPosts = posts.map((post) => ({
      ...post,
      id: post._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formattedPosts, { status: 200 });
  } catch (err) {
    console.error("Error fetching stream posts:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // [UPDATE] Get all the new fields from the request
    const { 
      classId, 
      authorId, 
      title, 
      content, 
      isImportant, 
      isUrgent, 
      link, 
      assignment 
    } = await request.json();

    // [UPDATE] Validate title and content
    if (!classId || !authorId || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: classId, authorId, title, content" },
        { status: 400 }
      );
    }

    const streamsCollection = await getStreamsCollection();

    // [UPDATE] Save all the new fields to the database
    const newPost = {
      classId,
      authorId,
      title,
      content,
      isImportant: isImportant || false,
      isUrgent: isUrgent || false,
      link: link || null,
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

