import { NextResponse } from "next/server";
import {
  getStreamsCollection,
  getUsersCollection,
  getCoursesCollection,
  getNotificationsCollection,
  getGroupsCollection,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const MAX_POLL_OPTIONS = 6;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }
    const uid = request.headers.get("x-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- [NEW] Get User Role & Group Memberships ---
    const coursesCollection = await getCoursesCollection();
    const groupsCol = await getGroupsCollection();

    const course = await coursesCollection.findOne({
      _id: new ObjectId(classId),
    });
    const isInstructor = course?.instructorId === uid;

    const myGroups = await groupsCol
      .find({
        courseId: new ObjectId(classId),
        "members.userId": uid,
      })
      .toArray();
    // Get a list of group ID strings the user belongs to
    const myGroupIds = myGroups.map((g) => g._id.toString());
    const streamsCollection = await getStreamsCollection();

    const posts = await streamsCollection
      .aggregate([
        { $match: { classId: classId } },
        {
          $addFields: {
            isPinned: { $ifNull: ["$isPinned", false] },
          },
        },
        { $sort: { isPinned: -1, createdAt: -1 } },
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
            type: 1,
            assignmentRef: 1,
            isImportant: 1,
            isUrgent: 1,
            link: 1,
            assignment: 1,
            comments: 1,
            poll: 1,
            createdAt: 1,
            isPinned: 1,
            audience: 1,
            author: {
              name: {
                $ifNull: [
                  "$authorDetails.username",
                  { $ifNull: ["$authorDetails.name", "$author.name"] }
                ],
              },
              id: "$authorId",
            },
          },
        },
      ])
      .toArray();
      const visiblePosts = posts.filter((post) => {
        // Instructor sees all posts
        if (isInstructor) {
          return true;
        }
  
        // If post is public (no audience, or type is 'class')
        if (!post.audience || post.audience.type === "class") {
          return true;
        }
  
        // If post is for a group, check if user is in that group
        if (post.audience.type === "group") {
          return myGroupIds.includes(post.audience.groupId);
        }
  
        return false; // Default to hiding
      });
      const formattedPosts = visiblePosts.map((post) => ({
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
      assignment,
      poll,
      isPinned,
      audience
    } = await request.json();

    // [UPDATE] Validate title and content
    if (!classId || !authorId || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: classId, authorId, title, content" },
        { status: 400 }
      );
    }

    const streamsCollection = await getStreamsCollection();

    let pollData = null;
    if (poll && typeof poll === "object") {
      const question = typeof poll.question === "string" ? poll.question.trim() : "";
      const allowMultiple = Boolean(poll.allowMultiple);
      const cleanOptions = Array.isArray(poll.options)
        ? poll.options
            .map((option) =>
              typeof option?.text === "string" ? option.text.trim() : ""
            )
            .filter((text, index, self) => text && self.indexOf(text) === index)
            .slice(0, MAX_POLL_OPTIONS)
        : [];

      if (question && cleanOptions.length >= 2) {
        pollData = {
          question,
          allowMultiple,
          options: cleanOptions.map((text) => ({
            id: new ObjectId().toString(),
            text,
            voterIds: [],
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

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
      poll: pollData,
      isPinned: Boolean(isPinned),
      audience: audience || { type: "class", groupId: null },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await streamsCollection.insertOne(newPost);

    // ✅ Create notifications for all enrolled students (exclude author if student)
    try {
      if (classId) {
        const coursesCollection = await getCoursesCollection();
        const notificationsCollection = await getNotificationsCollection();
        let notifRecipients = [];
        let courseDoc = null;
        try {
          courseDoc = await coursesCollection.findOne({ _id: new ObjectId(classId) });
        } catch (_) {
          // classId might not be an ObjectId; skip fanout safely
        }
        if (audience?.type === "group" && audience.groupId) {
          // If it's a group post, only get group members
          const groupsCol = await getGroupsCollection();
          const group = await groupsCol.findOne({
            _id: new ObjectId(audience.groupId),
          });
          notifRecipients = group?.members || [];
        } else {
          // It's a class post, get all students
          notifRecipients = courseDoc?.students || [];
        }

       
        if (notifRecipients.length > 0) {
          const notifDocs = notifRecipients

            .filter((s) => s?.userId && s.userId !== authorId)
            .map((s) => ({
              userId: s.userId,
              title: title || "New announcement",
              message: content?.slice(0, 160) || "An update has been posted",
              read: false,
              createdAt: new Date(),
              extra: {
                type: "announcement",
                courseId: classId,
                postId: result.insertedId.toString(),
                isImportant: !!isImportant,
                isUrgent: !!isUrgent,
                link: link || null,
              },
            }));
          if (notifDocs.length > 0) {
            await notificationsCollection.insertMany(notifDocs, { ordered: false });
          }
        }
      }
    } catch (notifError) {
      console.error("Failed to create announcement notifications:", notifError);
      // Do not fail request
    }

    return NextResponse.json(
      { message: "Post added to stream", id: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding stream post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { postId, requesterId, updates, classId } = await request.json();

    if (!postId || !requesterId || !updates) {
      return NextResponse.json(
        { error: "Missing required fields: postId, requesterId, updates" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();
    const usersCollection = await getUsersCollection();

    const postObjectId = new ObjectId(postId);
    const post = await streamsCollection.findOne({ _id: postObjectId });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (classId && post.classId !== classId) {
      return NextResponse.json({ error: "Post not found in this class" }, { status: 404 });
    }

    const requester = await usersCollection.findOne({ uid: requesterId });
    const requesterRole = requester?.role;
    const isAuthor = requesterId === post.authorId;
    const isInstructorOrAdmin = requesterRole === "instructor" || requesterRole === "admin";

    if (!isAuthor && !isInstructorOrAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const updateDoc = { $set: {} };
    let hasUpdates = false;

    if (typeof updates.title === "string") {
      updateDoc.$set.title = updates.title.trim();
      hasUpdates = true;
    }

    if (typeof updates.content === "string") {
      updateDoc.$set.content = updates.content.trim();
      hasUpdates = true;
    }

    if (typeof updates.isImportant === "boolean") {
      updateDoc.$set.isImportant = updates.isImportant;
      hasUpdates = true;
    }

    if (typeof updates.isUrgent === "boolean") {
      updateDoc.$set.isUrgent = updates.isUrgent;
      hasUpdates = true;
    }

    if (typeof updates.isPinned === "boolean") {
      updateDoc.$set.isPinned = updates.isPinned;
      hasUpdates = true;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "link")) {
      let linkValue = null;
      if (updates.link && typeof updates.link === "object") {
        const url = typeof updates.link.url === "string" ? updates.link.url.trim() : "";
        const text = typeof updates.link.text === "string" ? updates.link.text.trim() : "";
        if (url) {
          linkValue = {
            url,
            text: text || "View Link",
          };
        }
      }
      updateDoc.$set.link = linkValue;
      hasUpdates = true;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "poll")) {
      if (updates.poll === null) {
        updateDoc.$set.poll = null;
        hasUpdates = true;
      } else if (updates.poll && typeof updates.poll === "object") {
        const question = typeof updates.poll.question === "string" ? updates.poll.question.trim() : "";
        const allowMultiple = Boolean(updates.poll.allowMultiple);
        const optionInputs = Array.isArray(updates.poll.options) ? updates.poll.options : [];

        const cleanOptions = optionInputs
          .map((option) => {
            const text = typeof option?.text === "string" ? option.text.trim() : "";
            const id = typeof option?.id === "string" ? option.id : null;
            if (!text) return null;
            return { id, text };
          })
          .filter(Boolean);

        if (!question || cleanOptions.length < 2) {
          return NextResponse.json({ error: "Poll must include a question and at least two options" }, { status: 400 });
        }

        const existingOptions = new Map();
        if (post.poll?.options) {
          for (const option of post.poll.options) {
            existingOptions.set(option.id, option);
          }
        }

        const uniqueOptions = [];
        for (const option of cleanOptions) {
          if (!uniqueOptions.find((candidate) => candidate.text === option.text)) {
            uniqueOptions.push(option);
          }
        }

        const limitedOptions = uniqueOptions.slice(0, MAX_POLL_OPTIONS);

        if (limitedOptions.length < 2) {
          return NextResponse.json({ error: "Poll must include unique options" }, { status: 400 });
        }

        const nextOptions = limitedOptions.map((option) => {
          const existing = option.id ? existingOptions.get(option.id) : null;
          return {
            id: existing?.id || new ObjectId().toString(),
            text: option.text,
            voterIds: existing?.voterIds || [],
          };
        });

        updateDoc.$set.poll = {
          question,
          allowMultiple,
          options: nextOptions,
          createdAt: post.poll?.createdAt || new Date(),
          updatedAt: new Date(),
        };
        hasUpdates = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, "audience")) {
      if (
        updates.audience &&
        typeof updates.audience === "object" &&
        (updates.audience.type === "class" ||
          (updates.audience.type === "group" && updates.audience.groupId))
      ) {
        updateDoc.$set.audience = {
          type: updates.audience.type,
          groupId: updates.audience.type === "group" ? updates.audience.groupId : null,
        };
      } else {
        // Default to class
        updateDoc.$set.audience = { type: "class", groupId: null };
      }
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    updateDoc.$set.updatedAt = new Date();

    const result = await streamsCollection.updateOne({ _id: postObjectId }, updateDoc);

    if (!result.acknowledged || result.matchedCount !== 1) {
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ message: "Post updated" }, { status: 200 });
  } catch (err) {
    console.error("Error updating stream post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { postId, requesterId, classId } = await request.json();

    if (!postId || !requesterId) {
      return NextResponse.json(
        { error: "Missing required fields: postId, requesterId" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const streamsCollection = await getStreamsCollection();
    const usersCollection = await getUsersCollection();

    const postObjectId = new ObjectId(postId);
    const post = await streamsCollection.findOne({ _id: postObjectId });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (classId && post.classId !== classId) {
      return NextResponse.json({ error: "Post not found in this class" }, { status: 404 });
    }

    const requester = await usersCollection.findOne({ uid: requesterId });
    const requesterRole = requester?.role;
    const isAuthorized =
      requesterId === post.authorId ||
      requesterRole === "instructor" ||
      requesterRole === "admin";

    if (!isAuthorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const result = await streamsCollection.deleteOne({ _id: postObjectId });

    if (!result.acknowledged || result.deletedCount !== 1) {
      return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }

    return NextResponse.json({ message: "Post deleted" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting stream post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

