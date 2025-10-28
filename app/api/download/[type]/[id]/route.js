// API routes for file downloads
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getSubmissionsCollection } from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const { type, id } = params;
    
    if (!['assignment', 'submission'].includes(type)) {
      return NextResponse.json({ error: "Invalid download type" }, { status: 400 });
    }

    let collection;
    if (type === 'assignment') {
      collection = await getAssignmentsCollection();
    } else {
      collection = await getSubmissionsCollection();
    }

    const item = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!item) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!item.fileData || !item.fileData.data) {
      return NextResponse.json({ error: "No file data available" }, { status: 404 });
    }

    const base64Data = item.fileData.data.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', item.fileData.type);
    response.headers.set('Content-Disposition', `attachment; filename="${item.fileData.name}"`);
    response.headers.set('Content-Length', buffer.length.toString());

    return response;

  } catch (err) {
    console.error("[API /api/download] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
