// API route to get analytics for instructors on a specific course
import { NextResponse } from "next/server";
import {
  getAssignmentsCollection,
  getSubmissionsCollection,
  getCoursesCollection,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "Missing required parameter: courseId" },
        { status: 400 }
      );
    }

    const coursesCollection = await getCoursesCollection();
    const assignmentsCollection = await getAssignmentsCollection();
    const submissionsCollection = await getSubmissionsCollection();

    // Get course details
    let course;
    try {
      course = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid course ID" },
        { status: 400 }
      );
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const totalStudents = course.students?.length || 0;

    // Get all assignments for this course
    const assignments = await assignmentsCollection
      .find({
        $or: [{ classId: courseId }, { courseId: courseId }],
      })
      .toArray();

    const totalAssignments = assignments.length;

    if (totalAssignments === 0) {
      return NextResponse.json({
        totalStudents,
        totalAssignments: 0,
        totalSubmissions: 0,
        overdueCount: 0,
        lateSubmissions: 0,
        studentsWithOverdue: [],
      });
    }

    // Get all submissions for these assignments
    const assignmentIds = assignments.map((a) => a._id.toString());

    const submissions = await submissionsCollection
      .find({
        assignmentId: { $in: assignmentIds },
      })
      .toArray();

    const totalSubmissions = submissions.length;

    // Calculate overdue and late submissions
    const now = new Date();
    let overdueCount = 0;
    let lateSubmissions = 0;

    // Create a map of assignment deadlines
    const assignmentDeadlines = {};
    assignments.forEach((a) => {
      assignmentDeadlines[a._id.toString()] = a.deadline
        ? new Date(a.deadline)
        : null;
    });

    // Track submissions by student
    const studentSubmissions = {};
    submissions.forEach((sub) => {
      const deadline = assignmentDeadlines[sub.assignmentId];
      const submittedAt = new Date(sub.submittedAt);

      // Check if submission was late
      if (deadline && submittedAt > deadline) {
        lateSubmissions++;
      }

      // Track student submissions
      if (!studentSubmissions[sub.studentId]) {
        studentSubmissions[sub.studentId] = {
          studentId: sub.studentId,
          studentName: sub.studentName,
          submittedAssignments: new Set(),
        };
      }
      studentSubmissions[sub.studentId].submittedAssignments.add(
        sub.assignmentId
      );
    });

    // Calculate overdue assignments (not submitted and past deadline)
    const studentsWithOverdue = [];
    
    if (course.students && course.students.length > 0) {
      course.students.forEach((student) => {
        const studentId = student.userId;
        const studentData = studentSubmissions[studentId] || {
          studentId,
          studentName: student.name || student.email || "Unknown",
          submittedAssignments: new Set(),
        };

        let studentOverdueCount = 0;

        assignments.forEach((assignment) => {
          const assignmentId = assignment._id.toString();
          const deadline = assignmentDeadlines[assignmentId];
          const isSubmitted = studentData.submittedAssignments.has(assignmentId);

          if (!isSubmitted && deadline && deadline < now) {
            studentOverdueCount++;
            overdueCount++;
          }
        });

        if (studentOverdueCount > 0) {
          studentsWithOverdue.push({
            studentId,
            studentName: studentData.studentName,
            overdueCount: studentOverdueCount,
          });
        }
      });
    }

    // Sort students by overdue count (descending)
    studentsWithOverdue.sort((a, b) => b.overdueCount - a.overdueCount);

    return NextResponse.json({
      totalStudents,
      totalAssignments,
      totalSubmissions,
      overdueCount,
      lateSubmissions,
      studentsWithOverdue,
    });
  } catch (err) {
    console.error("[API /api/instructor/analytics] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
