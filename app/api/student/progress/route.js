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

    // Create a set of submitted assignment IDs for quick lookup
    const submittedAssignmentIds = new Set(
      submissions.map((s) => s.assignmentId)
    );

    const submittedAssignments = submissions.length;
    
    // Calculate overdue and pending assignments
    const now = new Date();
    let overdueAssignments = 0;
    const overdueAssignmentsList = [];

    assignments.forEach((assignment) => {
      const assignmentId = assignment._id.toString();
      const isSubmitted = submittedAssignmentIds.has(assignmentId);
      
      if (!isSubmitted && assignment.deadline) {
        const deadline = new Date(assignment.deadline);
        if (deadline < now) {
          overdueAssignments++;
          overdueAssignmentsList.push({
            id: assignmentId,
            title: assignment.title,
            deadline: assignment.deadline,
          });
        }
      }
    });

    const pendingAssignments = totalAssignments - submittedAssignments - overdueAssignments;
    const percentage = Math.round((submittedAssignments / totalAssignments) * 100);

    return NextResponse.json({
      totalAssignments,
      submittedAssignments,
      pendingAssignments: pendingAssignments >= 0 ? pendingAssignments : 0,
      overdueAssignments,
      overdueAssignmentsList,
      percentage,
    });
  } catch (err) {
    console.error("[API /api/student/progress] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
