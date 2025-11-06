import { NextResponse } from "next/server";
import {
  getClassroomChatsCollection,
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

    const chatsCollection = await getClassroomChatsCollection();

    // Use aggregate to join with users and get author names
    const messages = await chatsCollection
      .aggregate([
        { $match: { classId: classId } }, // Find chats for this class
        { $sort: { createdAt: 1 } }, // Sort by oldest first (chronological)
        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "uid", // This must match your 'users' collection
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
            _id: 1,
            classId: 1,
            text: 1,
            createdAt: 1,
            author: {
              name: {
                $ifNull: ["$authorDetails.username", "$authorDetails.name", "Unknown"],
              },
              id: "$authorId",
            },
          },
        },
      ])
      .toArray();
    
    // Format the _id to id for the frontend
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      id: msg._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formattedMessages, { status: 200 });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // We expect an author object, just like in comments
    const { classId, author, text } = await request.json();

    if (!classId || !author || !author.id || !author.name || !text) {
      return NextResponse.json(
        { error: "Missing required fields: classId, author object, text" },
        { status: 400 }
      );
    }

    const chatsCollection = await getClassroomChatsCollection();

    const newChatMessage = {
      classId,
      authorId: author.id, // Save the author's ID
      author: author, // Save the author object { id, name }
      text,
      createdAt: new Date(),
    };

    const result = await chatsCollection.insertOne(newChatMessage);

    // Return the created message (formatted for the frontend)
    const createdMessage = {
      ...newChatMessage,
      id: result.insertedId.toString(),
      _id: undefined,
    };

    return NextResponse.json(createdMessage, { status: 201 });
  } catch (err) {
    console.error("Error sending chat message:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}