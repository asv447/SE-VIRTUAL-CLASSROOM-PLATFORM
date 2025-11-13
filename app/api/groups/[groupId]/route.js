// app/api/groups/[groupId]/route.js

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGroupsCollection } from "@/lib/mongodb";

// GET a single group by its ID
export async function GET(request, { params }) {
  try {
    const { groupId } = params;

    if (!groupId || !ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }

    // TODO: Add security check - is the user in this course?

    const groupsCol = await getGroupsCollection();
    const group = await groupsCol.findOne({ _id: new ObjectId(groupId) });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group, { status: 200 });
  } catch (err) {
    console.error("[GET /api/groups/[groupId]]", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}