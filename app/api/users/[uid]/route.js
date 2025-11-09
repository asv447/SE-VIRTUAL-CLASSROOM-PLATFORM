// app/api/users/[uid]/route.js
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const { uid } = params;
    
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const usersCollection = await getUsersCollection();
    
    // Find user by uid
    const user = await usersCollection.findOne({ uid });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user data without MongoDB internal fields
    const { _id, ...userData } = user;
    
    return NextResponse.json({ 
      user: {
        id: _id.toString(),
        ...userData
      }
    }, { status: 200 });
  } catch (err) {
    console.error("[API /api/users/[uid]] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
