import { getUsersCollection } from "@/lib/mongodb";

async function handleUpdate(req) {
  try {
    const body = await req.json();
    console.log("update-username request body:", body);

    const uid = body?.uid || body?.userId || body?.id;
    const rawNew = body?.newUsername ?? body?.username ?? body?.name;

    if (!uid) {
      return new Response(JSON.stringify({ message: "Missing uid" }), {
        status: 400,
      });
    }
    if (!rawNew || String(rawNew).trim() === "") {
      return new Response(
        JSON.stringify({ message: "Missing or empty newUsername" }),
        { status: 400 }
      );
    }

    const newUsername = String(rawNew).trim();

    const usersCollection = await getUsersCollection();

    const result = await usersCollection.updateOne(
      { uid },
      {
        $set: {
          username: newUsername,
          updatedAt: new Date(),
        },
      }
    );

    console.log("MongoDB update result:", result);

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ message: "User not found." }), {
        status: 404,
      });
    }

    // If matched but not modified, still return 200 with informative message
    if (result.modifiedCount === 0) {
      return new Response(
        JSON.stringify({
          message:
            "Matched but not modified — likely same username or update failed.",
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ message: "Username updated successfully!" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating username:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: String(error),
      }),
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
