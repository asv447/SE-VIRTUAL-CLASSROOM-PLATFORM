import { NextResponse } from "next/server";
import { getStreamsCollection, getNotificationsCollection } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    // Expect 'author' (an object) instead of 'authorId'
    const { postId, author, text } = await request.json();

    if (!postId || !author || !author.id || !author.name || !text) {
      return NextResponse.json(
        { error: "Missing required fields: postId, author object, text" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: "Invalid Post ID format" },
        { status: 400 }
      );
    }

    const streamsCollection = await getStreamsCollection();

    // Save the 'author' object directly
    const newComment = {
      _id: new ObjectId(), // Create a new unique ID for the comment
      author: author, // Save the author object { id, name }
      text,
      createdAt: new Date(),
    };

    // Fetch the post to identify participants for notification fanout
    const postDoc = await streamsCollection.findOne({ _id: new ObjectId(postId) });

    // Find the post by its ID and push the new comment into its 'comments' array
    const result = await streamsCollection.updateOne(
      { _id: new ObjectId(postId) },
      {
        $push: { comments: newComment },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to add comment" },
        { status: 500 }
      );
    }

    // Notify post author and previous commenters (exclude current author)
    try {
      if (postDoc) {
        const notificationsCollection = await getNotificationsCollection();
        const participants = new Set();
        if (postDoc.author?.id) participants.add(postDoc.author.id);
        (postDoc.comments || []).forEach((c) => {
          if (c?.author?.id) participants.add(c.author.id);
        });
        // exclude commenter
        participants.delete(author.id);

        const notifDocs = Array.from(participants).map((uid) => ({
          userId: uid,
          title: "New comment",
          message: `${author.name} commented: ${text.slice(0, 160)}`,
          read: false,
          createdAt: new Date(),
          extra: {
            type: "comment",
            courseId: postDoc.classId || null,
            postId: postDoc._id.toString(),
          },
        }));
        if (notifDocs.length > 0) {
          await notificationsCollection.insertMany(notifDocs, { ordered: false });
        }
      }
    } catch (notifErr) {
      console.error("Failed to create comment notifications:", notifErr);
      // Do not fail request
    }

    // Return the new comment
    return NextResponse.json(newComment, { status: 201 });

  } catch (err) {
    console.error("Error adding comment:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}