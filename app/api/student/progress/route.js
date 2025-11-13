// API route to get detailed progress for a student in a course
import { NextResponse } from "next/server";
import {
  getAssignmentsCollection,
  getSubmissionsCollection,
} from "@/lib/mongodb";
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
        pendingAssignments: 0,
        overdueAssignments: 0,
        percentage: 0,
        overdueAssignmentsList: [],
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

    const submittedAssignmentIds = new Set(
      submissions.map((s) => s.assignmentId)
    );

    // Calculate statistics
    const submittedAssignments = submissions.length;
    const now = new Date();

    // Find overdue assignments (not submitted and past deadline)
    const overdueAssignments = assignments.filter((assignment) => {
      const isSubmitted = submittedAssignmentIds.has(
        assignment._id.toString()
      );
      const deadline = assignment.deadline
        ? new Date(assignment.deadline)
        : null;
      return !isSubmitted && deadline && deadline < now;
    });

    const overdueCount = overdueAssignments.length;
    const pendingAssignments =
      totalAssignments - submittedAssignments - overdueCount;
    const percentage = Math.round(
      (submittedAssignments / totalAssignments) * 100
    );

    // Format overdue assignments list
    const overdueAssignmentsList = overdueAssignments.map((assignment) => ({
      id: assignment._id.toString(),
      title: assignment.title,
      deadline: assignment.deadline,
      description: assignment.description,
    }));

    return NextResponse.json({
      totalAssignments,
      submittedAssignments,
      pendingAssignments: Math.max(0, pendingAssignments),
      overdueAssignments: overdueCount,
      percentage,
      overdueAssignmentsList,
    });
  } catch (err) {
    console.error("[API /api/student/progress] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
