// API routes for assignment operations
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getSubmissionsCollection } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "../../../../lib/firebase";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    if (!id || !classId) {
      return NextResponse.json({ error: "Missing id or classId" }, { status: 400 });
    }

    const assignmentsCollection = await getAssignmentsCollection();
    
    // Delete assignment file from Firebase Storage
    try {
      const storageRef = ref(storage, `assignments/${classId}/${id}`);
      await deleteObject(storageRef);
    } catch (err) {
      console.log("No file to delete or file deletion failed:", err);
    }
    
    // Delete assignment from MongoDB
    const result = await assignmentsCollection.deleteOne({ 
      _id: new ObjectId(id) 
    });
    
    // Delete related submissions
    const submissionsCollection = await getSubmissionsCollection();
    await submissionsCollection.deleteMany({ assignmentId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Assignment deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments/[id]] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
