import { NextResponse } from "next/server";
// [ADD] Import 'getUsersCollection' and 'ObjectId'
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

    // [BIG CHANGE] Replace your old 'streamsCollection.find(...)' with this 'aggregate'
    // This code joins 'streams' with 'users' to get the author's name
    const posts = await streamsCollection
      .aggregate([
        { $match: { classId: classId } }, // Find posts for this class
        { $sort: { createdAt: -1 } }, // Sort by newest first
        {
          $lookup: {
            from: "users", // The collection to join
            localField: "authorId", // Field from 'streams' (the Firebase UID string)

            // [FIX] Changed to 'uid' to match your database screenshot
            foreignField: "uid",

            as: "authorDetails", // Put the joined user data in an array
          },
        },
        {
          $unwind: {
            // Unpack the array
            path: "$authorDetails",
            preserveNullAndEmptyArrays: true, // Keep posts if author is deleted
          },
        },
        {
          $project: {
            // Clean up the final output
            _id: 1,
            classId: 1,
            content: 1,
            assignment: 1,
            comments: 1,
            createdAt: 1,
            author: {
              // [FIX] Check for both 'username' and 'name'
              name: {
                $ifNull: ["$authorDetails.username", "$authorDetails.name"],
              },
              id: "$authorId",
            },
          },
        },
      ])
      .toArray();

    // Format the _id to id for the frontend
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
    // [CHANGE] Update to match fields from classroom 'handleCreatePost'
    const { classId, authorId, content, assignment } = await request.json();

    // [CHANGE] Validate the new fields
    if (!classId || !authorId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const streamsCollection = await getStreamsCollection();

    const newPost = {
      classId, // The ID of the course
      authorId, // The Firebase UID of the author
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
  } catch (err) { // [FIXED] Added the missing opening brace '{'
    console.error("Error adding stream post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

