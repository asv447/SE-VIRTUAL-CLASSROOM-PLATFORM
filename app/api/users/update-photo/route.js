import { getUsersCollection } from "@/lib/mongodb";

export async function PATCH(req) {
  try {
    const body = await req.json();
    console.log("update-photo request body:", body);

    const { uid, photoURL } = body || {};
    if (!uid || !photoURL) {
      return new Response(
        JSON.stringify({ message: "Missing uid or photoURL" }),
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const result = await users.updateOne(
      { uid },
      { $set: { photoURL, updatedAt: new Date() } }
    );

    console.log("update-photo result:", result);

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "PhotoURL saved" }), {
      status: 200,
    });
  } catch (err) {
    console.error("update-photo error", err);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  return PATCH(req);
}
