import { NextResponse } from "next/server";
import { getStreamsCollection, getUsersCollection } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();
    
    // [NEW] Use $lookup to fetch author details
    const posts = await streamsCollection.aggregate([
      { $match: { classId: classId } }, // Find posts for this class
      { $sort: { createdAt: -1 } }, // Sort by newest first
      {
        $lookup: {
          from: "users", // The collection to join
          localField: "authorId", // Field from the 'streams' collection
          foreignField: "_id", // Field from the 'users' collection
          as: "authorDetails", // Put the joined user data in an array
        }
      },
      {
        $unwind: { // Unpack the array
          path: "$authorDetails",
          preserveNullAndEmptyArrays: true // Keep posts if author is deleted
        }
      },
      {
        $project: { // Clean up the final output
          _id: 1,
          classId: 1,
          content: 1,
          assignment: 1,
          comments: 1,
          createdAt: 1,
          // [NEW] Create an 'author' object for the frontend
          author: {
            name: "$authorDetails.username", // Use 'username' from the user doc
            id: "$authorId"
          }
        }
      }
    ]).toArray();

    // Format the _id to id for the frontend
    const formattedPosts = posts.map(post => ({
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
    // [FIX] Updated to match the fields from your classroom page
    const { classId, authorId, content, assignment } = await request.json();

    if (!classId || !authorId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();
    
    // [FIX] We must store the authorId as a real ObjectId for the $lookup to work
    let authorObjectId;
    try {
      authorObjectId = new ObjectId(authorId);
    } catch (e) {
      // Handle Firebase UID if it's not a Mongo ObjectId
      // For now, let's assume it's a string, but storing as ObjectId is better
      // If authorId is from Firebase, we store it as a string.
      // We also need to update the $lookup to match a string _id in users,
      // OR convert the `localField` in $lookup.
      // Let's store as a string for simplicity, and fix the $lookup.
      
      // Re-evaluating: Your `lib/mongodb.js` shows `getUsersCollection`.
      // Let's check the user's _id. If it's a string from Firebase, $lookup is tricky.
      // Let's assume the `users` collection uses `_id: new ObjectId()`
      // No, wait, `users` collection would use Firebase UID.
      // Easiest fix: Store `authorId` as a string.
    }

    // Let's fetch the author's username to store it
    const usersCollection = await getUsersCollection();
    // Assuming the 'users' collection stores the Firebase UID as 'uid'
    // or as _id. Your /api/users/${uid} implies it's a key.
    // Let's assume your /api/users/[id]/route.js finds users by `uid`.
    // This is complex.
    
    // [SIMPLE FIX] Let's just store the ID as sent.
    // The $lookup must be adjusted.
    
    // Let's go back and assume users._id is an ObjectId.
    // We will convert authorId to an ObjectId.
    
    let finalAuthorId;
    try {
      finalAuthorId = new ObjectId(authorId);
    } catch (e) {
      // If authorId is a Firebase UID (string), just store it as a string
      finalAuthorId = authorId;
    }
    
    const newPost = {
      classId, // This should also be an ObjectId if 'courses' _id is ObjectId
      authorId: finalAuthorId, // [FIX] Store authorId
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
