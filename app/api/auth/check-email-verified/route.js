// API route to check if an email has been verified
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const usersCollection = await getUsersCollection();
    
    // Find user by email
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { emailVerified: false, message: "User not found" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { emailVerified: user.emailVerified || false },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/auth/check-email-verified] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
