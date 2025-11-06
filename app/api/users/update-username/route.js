import {
  getUsersCollection,
  getCoursesCollection,
  getStreamsCollection,
  getClassroomChatsCollection,
  getSubmissionsCollection, // Added all collections
} from "../../../../lib/mongodb"; // [FIX] Corrected import path
import { NextResponse } from "next/server"; // [FIX] Use NextResponse for consistency

async function handleUpdate(req) {
  try {
    const body = await req.json();
    console.log("update-username request body:", body);

    const uid = body?.uid || body?.userId || body?.id;
    const rawNew = body?.newUsername ?? body?.username ?? body?.name;

    if (!uid) {
      return NextResponse.json({ message: "Missing uid" }, { status: 400 });
    }
    if (!rawNew || String(rawNew).trim() === "") {
      return NextResponse.json(
        { message: "Missing or empty newUsername" },
        { status: 400 }
      );
    }

    const newUsername = String(rawNew).trim();
    const usersCollection = await getUsersCollection();

    // 1. Update the main user document
    const result = await usersCollection.updateOne(
      { uid },
      {
        $set: {
          username: newUsername,
          updatedAt: new Date(),
        },
      }
    );

    console.log("MongoDB main update result:", result);

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // 2. [NEW] If the update was successful, start the cascading update
    if (result.modifiedCount > 0) {
      console.log(`Cascading username update for ${uid} to "${newUsername}"...`);
      
      // Get all other collections
      const coursesCollection = await getCoursesCollection();
      const streamsCollection = await getStreamsCollection();
      const chatsCollection = await getClassroomChatsCollection();
      const submissionsCollection = await getSubmissionsCollection();

      // Run all updates in parallel
      const [
        courseInstructorRes,
        courseStudentRes,
        streamCommentRes,
        chatAuthorRes,
        submissionAuthorRes
      ] = await Promise.allSettled([
        
        // Update where they are the instructor
        coursesCollection.updateMany(
          { instructorId: uid },
          { $set: { instructorName: newUsername } }
        ),
        
        // Update where they are a student
        coursesCollection.updateMany(
          { "students.userId": uid },
          { $set: { "students.$[elem].name": newUsername } },
          { arrayFilters: [{ "elem.userId": uid }] }
        ),
        
        // Update their name in post comments
        streamsCollection.updateMany(
          { "comments.author.id": uid },
          { $set: { "comments.$[elem].author.name": newUsername } },
          { arrayFilters: [{ "elem.author.id": uid }] }
        ),

        // Update their name in chat messages
        chatsCollection.updateMany(
          { "author.id": uid },
          { $set: { "author.name": newUsername } }
        ),
        
        // Update their name in submissions
        submissionsCollection.updateMany(
          { "author.id": uid },
          { $set: { "author.name": newUsername } }
        )
      ]);

      console.log("Cascade Results:");
      console.log("- Courses (Instructor):", courseInstructorRes.status);
      console.log("- Courses (Student):", courseStudentRes.status);
      console.log("- Stream Comments:", streamCommentRes.status);
      console.log("- Chat Messages:", chatAuthorRes.status);
      console.log("- Submissions:", submissionAuthorRes.status);
    }

    return NextResponse.json(
      { message: "Username updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  return handleUpdate(req);
}

export async function PATCH(req) {
  return handleUpdate(req);
}