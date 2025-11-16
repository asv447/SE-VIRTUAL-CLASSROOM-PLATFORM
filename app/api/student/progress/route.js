// API route to get detailed assignment progress for a student in a course
import { NextResponse } from "next/server";
import { getAssignmentsCollection, getSubmissionsCollection } from "@/lib/mongodb";

export const dynamic = 'force-dynamic';

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
        overdueAssignmentsList: [],
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

    // Create a map of submissions for quick lookup
    const submissionsMap = new Map(
      submissions.map((s) => [s.assignmentId, s])
    );

    const submittedAssignments = submissions.length;
    
    // Calculate on-time, late, pending, and missing assignments
    const now = new Date();
    let onTimeAssignments = 0;
    let lateAssignments = 0;
    let pendingAssignments = 0;
    let missingAssignments = 0;
    const missingAssignmentsList = [];

    assignments.forEach((assignment) => {
      const assignmentId = assignment._id.toString();
      const submission = submissionsMap.get(assignmentId);
      const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
      
      if (submission) {
        // Assignment is submitted - check if on-time or late
        const submittedAt = new Date(submission.submittedAt);
        if (deadline && submittedAt > deadline) {
          lateAssignments++;
        } else {
          onTimeAssignments++;
        }
      } else {
        // Assignment is not submitted - check if pending or missing
        if (deadline) {
          if (deadline < now) {
            // Deadline passed - missing
            missingAssignments++;
            missingAssignmentsList.push({
              id: assignmentId,
              title: assignment.title,
              deadline: assignment.deadline,
            });
          } else {
            // Deadline still active - pending
            pendingAssignments++;
          }
        } else {
          // No deadline set - count as pending
          pendingAssignments++;
        }
      }
    });

    const percentage = Math.round((submittedAssignments / totalAssignments) * 100);

    return NextResponse.json({
      totalAssignments,
      submittedAssignments,
      onTimeAssignments,
      lateAssignments,
      pendingAssignments,
      missingAssignments,
      missingAssignmentsList,
      percentage,
      submissions, // Include submissions for grade calculation
    });
  } catch (err) {
    console.error("[API /api/student/progress] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
