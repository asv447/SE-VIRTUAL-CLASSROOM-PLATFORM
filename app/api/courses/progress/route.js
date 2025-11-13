// API route to get assignment progress for a student in a course
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getSubmissionsCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");

    if (!courseId || !studentId) {
      return NextResponse.json(
        { error: "Missing required parameters: courseId and studentId" },
        { status: 400 }
      );
    }

    const assignmentsCollection = await getAssignmentsCollection();
    const submissionsCollection = await getSubmissionsCollection();

    // Get all assignments for this course
    const assignments = await assignmentsCollection
      .find({
        $or: [{ classId: courseId }, { courseId: courseId }],
      })
      .toArray();

    const totalAssignments = assignments.length;

    if (totalAssignments === 0) {
      return NextResponse.json({
        totalAssignments: 0,
        submittedAssignments: 0,
        percentage: 0,
      });
    }

    // Get all submissions by this student for these assignments
    const assignmentIds = assignments.map((a) => a._id.toString());
    
    const submissions = await submissionsCollection
      .find({
        studentId: studentId,
        assignmentId: { $in: assignmentIds },
      })
      .toArray();

    const submittedAssignments = submissions.length;
    const percentage = Math.round((submittedAssignments / totalAssignments) * 100);

    return NextResponse.json({
      totalAssignments,
      submittedAssignments,
      percentage,
    });
  } catch (err) {
    console.error("[API /api/courses/progress] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
