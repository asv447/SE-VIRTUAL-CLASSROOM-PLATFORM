import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getStreamsCollection,
  getCoursesCollection,
  getNotificationsCollection,
} from "@/lib/mongodb";
import {
  uploadToGoogleDrive,
} from "@/lib/google-drive";

// Creates an announcement (stream post) with an optional file attachment (material)
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload = null;
    let file = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const classId = formData.get("classId");
      const authorId = formData.get("authorId");
      const authorName = formData.get("authorName") || "";
      const title = formData.get("title") || "Announcement";
      const content = formData.get("content") || "";
      const notesText = formData.get("notesText") || "";
      file = formData.get("file");
      payload = { classId, authorId, authorName, title, content, notesText };
    } else {
      // Fallback JSON body (without file)
      payload = await request.json();
    }

    const { classId, authorId, authorName = "", title, content = "", notesText = "" } = payload || {};

    if (!classId || !authorId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: classId, authorId, title" },
        { status: 400 }
      );
    }

    const streamsCollection = await getStreamsCollection();

    let materials = [];
    if (file && file.size > 0) {
      try {
        const uploaded = await uploadToGoogleDrive(
          file,
          file.name || "class-material",
          file.type || "application/octet-stream"
        );
        materials = [
          {
            ...uploaded,
            uploadedAt: new Date(),
          },
        ];
      } catch (e) {
        console.error("Failed to upload announcement file to Drive:", e);
        return NextResponse.json(
          { error: "Failed to upload file to Google Drive" },
          { status: 500 }
        );
      }
    }

    const newPost = {
      classId,
      authorId,
      author: { name: authorName, id: authorId },
      title,
      content,
      type: "announcement",
      link:
        materials.length > 0
          ? { url: materials[0].viewLink, text: materials[0].fileName || "Material" }
          : null,
      materials,
      notesText: notesText || "",
      comments: [],
      createdAt: new Date(),
    };

    const result = await streamsCollection.insertOne(newPost);

    // Fanout notifications to enrolled students
    try {
      const coursesCollection = await getCoursesCollection();
      const notificationsCollection = await getNotificationsCollection();

      let courseDoc = null;
      try {
        courseDoc = await coursesCollection.findOne({ _id: new ObjectId(classId) });
      } catch (_) {}

      const students = courseDoc?.students || [];
      if (students.length > 0) {
        const notifDocs = students
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
              hasAttachment: materials.length > 0,
            },
          }));
        if (notifDocs.length > 0) {
          await notificationsCollection.insertMany(notifDocs, { ordered: false });
        }
      }
    } catch (notifErr) {
      console.error("Failed to create notifications for announcement:", notifErr);
    }

    return NextResponse.json(
      { id: result.insertedId.toString(), message: "Announcement created" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API /api/announcements] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
