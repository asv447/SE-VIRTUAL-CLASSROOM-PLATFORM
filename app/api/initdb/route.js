// app/api/initdb/route.js
import { getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();

    // Insert empty docs to make sure collections are created
    await db.collection("students").insertOne({ initialized: true });
    await db.collection("assignments").insertOne({ initialized: true });
    await db.collection("streams").insertOne({ initialized: true });
    await db.collection("submissions").insertOne({ initialized: true });
    await db.collection("classrooms").insertOne({ initialized: true });
    await db.collection("users").insertOne({ initialized: true });

    return Response.json({ message: "✅ Collections initialized successfully!" });
  } catch (error) {
    console.error("Init DB Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
