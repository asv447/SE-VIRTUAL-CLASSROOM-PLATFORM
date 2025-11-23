import { NextResponse } from "next/server";
import { getClassroomChatsCollection, getUsersCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSocketIOServer } from "@/lib/socket-io-server";

// Ensure this route executes in the Node.js runtime so it can access the
// Socket.IO server instance stored on the Node global object by `pages/api/socket.js`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
                $ifNull: [
                  "$authorDetails.username",
                  "$authorDetails.name",
                  "Unknown",
                ],
              },
              id: "$authorId",
              photoUrl: "$authorDetails.photoUrl",
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

    // Broadcast the new message to all connected clients in this classroom via WebSocket
    const io = getSocketIOServer();
    if (io) {
      io.to(`classroom:${classId}`).emit("new_chat_message", createdMessage);
      console.log(`Broadcast new chat message to classroom:${classId}`);
    }

    return NextResponse.json(createdMessage, { status: 201 });
  } catch (err) {
    console.error("Error sending chat message:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const userId = searchParams.get("userId");

    if (!messageId || !userId) {
      return NextResponse.json(
        { error: "Missing messageId or userId" },
        { status: 400 }
      );
    }

    const chatsCollection = await getClassroomChatsCollection();

    // Find the message to verify ownership
    const message = await chatsCollection.findOne({
      _id: new ObjectId(messageId),
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify that the user is the author
    if (message.authorId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Delete the message
    const result = await chatsCollection.deleteOne({
      _id: new ObjectId(messageId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    // Broadcast the deletion to all connected clients in this classroom via WebSocket
    const io = getSocketIOServer();
    if (io) {
      io.to(`classroom:${message.classId}`).emit(
        "chat_message_deleted",
        messageId
      );
      console.log(`Broadcast message deletion to classroom:${message.classId}`);
    }

    return NextResponse.json(
      { message: "Message deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting chat message:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
