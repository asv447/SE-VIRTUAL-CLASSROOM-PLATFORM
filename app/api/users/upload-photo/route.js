import { getUsersCollection } from "@/lib/mongodb";

export async function PATCH(req) {
  try {
    const body = await req.json();
    console.log("upload-photo request body keys:", Object.keys(body || {}));
    const { uid, photoBase64, photoContentType } = body || {};
    if (!uid || !photoBase64 || !photoContentType) {
      return new Response(
        JSON.stringify({ message: "Missing uid or photo data" }),
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const result = await users.updateOne(
      { uid },
      { $set: { photoBase64, photoContentType, updatedAt: new Date() } }
    );

    console.log("upload-photo result:", result);
    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Photo saved to Mongo" }), {
      status: 200,
    });
  } catch (err) {
    console.error("upload-photo error", err);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  return PATCH(req);
}
