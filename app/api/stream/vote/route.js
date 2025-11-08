import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getStreamsCollection } from "../../../../lib/mongodb";

export async function POST(request) {
  try {
    const { postId, userId, selectedOptionIds } = await request.json();

    console.log("Received vote", { postId, userId, selectedOptionIds });

    if (!postId || !userId || !Array.isArray(selectedOptionIds)) {
      return NextResponse.json(
        { error: "Missing required fields: postId, userId, selectedOptionIds" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const trimmedSelections = selectedOptionIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean);

    if (trimmedSelections.length === 0) {
      return NextResponse.json(
        { error: "At least one poll option must be selected" },
        { status: 400 }
      );
    }

    const streamsCollection = await getStreamsCollection();
    const post = await streamsCollection.findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!post.poll) {
      return NextResponse.json({ error: "Poll not found for this post" }, { status: 400 });
    }

    const { allowMultiple, options = [] } = post.poll;

    const uniqueSelections = Array.from(new Set(trimmedSelections));
    if (!allowMultiple && uniqueSelections.length > 1) {
      uniqueSelections.splice(1);
    }

    const optionIds = new Set(options.map((option) => option.id));
    const invalidSelection = uniqueSelections.find((id) => !optionIds.has(id));
    if (invalidSelection) {
      return NextResponse.json({ error: "Invalid poll option selected" }, { status: 400 });
    }

    const updatedOptions = options.map((option) => ({
      ...option,
      voterIds: (option.voterIds || []).filter((voterId) => voterId !== userId),
    }));

    uniqueSelections.forEach((selectionId) => {
      const option = updatedOptions.find((opt) => opt.id === selectionId);
      if (option && !option.voterIds.includes(userId)) {
        option.voterIds.push(userId);
      }
    });

    const now = new Date();
    const updatedPoll = {
      ...post.poll,
      options: updatedOptions,
      updatedAt: now,
    };

    const updateResult = await streamsCollection.updateOne(
      { _id: post._id },
      { $set: { poll: updatedPoll } }
    );

    console.log("Vote update result", updateResult);

    const totalSelections = updatedOptions.reduce(
      (sum, option) => sum + (option.voterIds?.length || 0),
      0
    );

    return NextResponse.json(
      {
        poll: {
          ...updatedPoll,
          totalSelections,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error recording poll vote:", error);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
