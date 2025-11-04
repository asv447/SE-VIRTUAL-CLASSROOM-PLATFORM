// app/api/users/route.js
import { NextResponse } from "next/server";
import { getUsersCollection } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    const usersCollection = await getUsersCollection();
    
    if (uid) {
      // If uid is provided, return specific user
      const user = await usersCollection.findOne({ uid });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ user }, { status: 200 });
    }

    // Otherwise return all users
    const users = await usersCollection.find({}).toArray();
    return NextResponse.json({ users }, { status: 200 });
  } catch (err) {
    console.error("[API /api/users] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { uid, username, email, role = "student" } = await request.json();
    if (!uid || !email) {
      return NextResponse.json({ error: "Missing uid or email" }, { status: 400 });
    }

    const usersCollection = await getUsersCollection();
    
    // Check if user already exists
    const existing = await usersCollection.findOne({ uid });
    if (existing) {
      return NextResponse.json({ message: "User doc already exists" }, { status: 200 });
    }

    // Create new user
    const newUser = {
      uid,
      username,
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json({ 
      message: "User doc created", 
      userId: result.insertedId.toString() 
    }, { status: 201 });
  } catch (err) {
    console.error("[API /api/users] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
