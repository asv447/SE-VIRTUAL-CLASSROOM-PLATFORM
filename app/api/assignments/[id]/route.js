// API routes for assignment operations
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getCoursesCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    if (!id || !classId) {
      return NextResponse.json({ error: "Missing id or classId" }, { status: 400 });
    }

    const assignmentsCollection = await getAssignmentsCollection();
    
    // Delete assignment from MongoDB
    const result = await assignmentsCollection.deleteOne({ 
      _id: new ObjectId(id) 
    });
    
    // Delete related submissions
    // const submissionsCollection = await getSubmissionsCollection();
    // await submissionsCollection.deleteMany({ assignmentId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Assignment deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments/[id]] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const assignmentsCollection = await getAssignmentsCollection();
    const assignment = await assignmentsCollection.findOne({ _id: new ObjectId(id) });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    // Enrich with course title
    let courseTitle = null;
    const cid = assignment.classId || assignment.courseId;
    if (cid) {
      try {
        const courses = await getCoursesCollection();
        const courseDoc = await courses.findOne({ _id: new ObjectId(cid) });
        courseTitle = courseDoc?.title || null;
      } catch (_) {}
    }

    const result = {
      id: assignment._id.toString(),
      ...assignment,
      courseTitle,
      _id: undefined,
    };
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments/[id]] GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    console.log("PATCH called for id:", id);
    if (!id) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }

    const body = await request.json();
    const { deadline } = body;
    if (!deadline) {
      return NextResponse.json({ error: "Missing deadline field" }, { status: 400 });
    }

    const assignmentsCollection = await getAssignmentsCollection();

    const update = {
      updatedAt: new Date(),
    };

    // attempt to parse deadline into a Date
    const parsed = new Date(deadline);
    if (!isNaN(parsed.getTime())) {
      update.deadline = parsed;
    } else {
      // if parsing failed, store as string
      update.deadline = deadline;
    }

    const result = await assignmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ id, deadline: result.value.deadline }, { status: 200 });
  } catch (err) {
    console.error("[API /api/assignments/[id]] PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
