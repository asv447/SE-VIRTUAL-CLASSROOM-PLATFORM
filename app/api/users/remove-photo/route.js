import { getUsersCollection } from "@/lib/mongodb";

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { uid } = body || {};
    if (!uid) {
      return new Response(JSON.stringify({ message: "Missing uid" }), {
        status: 400,
      });
    }

    const users = await getUsersCollection();
    const result = await users.updateOne(
      { uid },
      {
        $unset: { photoBase64: "", photoContentType: "", photoURL: "" },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Photo removed" }), {
      status: 200,
    });
  } catch (err) {
    console.error("remove-photo error", err);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  return PATCH(req);
}
