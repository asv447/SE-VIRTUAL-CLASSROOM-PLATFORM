import { NextResponse } from "next/server";
import {
  getCoursesCollection,
  getAssignmentsCollection,
  getSubmissionsCollection,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = 'force-dynamic';

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (typeof value.toString === "function") return value.toString();
  return `${value}`;
};

const toObjectId = (value) => {
  if (!value) return null;
  try {
    return new ObjectId(value);
  } catch (error) {
    return null;
  }
};

const buildIdMatchers = (field, ids) => {
  const clauses = [];
  ids.forEach((id) => {
    clauses.push({ [field]: id });
    const objectId = toObjectId(id);
    if (objectId) {
      clauses.push({ [field]: objectId });
    }
  });
  return clauses;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get("instructorId");

    if (!instructorId) {
      return NextResponse.json(
        { error: "Missing required parameter: instructorId" },
        { status: 400 }
      );
    }

    const [coursesCollection, assignmentsCollection, submissionsCollection] =
      await Promise.all([
        getCoursesCollection(),
        getAssignmentsCollection(),
        getSubmissionsCollection(),
      ]);

    const courses = await coursesCollection
      .find({ instructorId })
      .sort({ createdAt: -1 })
      .toArray();

    const courseIdList = courses.map((course) => normalizeId(course._id));
    const courseIdSet = new Set(courseIdList);

    const assignmentFilters = [{ instructorId }];
    if (courseIdList.length > 0) {
      assignmentFilters.push({ courseId: { $in: courseIdList } });
      assignmentFilters.push({ classId: { $in: courseIdList } });
    }

    const assignments = await assignmentsCollection
      .find({ $or: assignmentFilters })
      .sort({ deadline: 1 })
      .toArray();

    const assignmentIdList = assignments.map((assignment) =>
      normalizeId(assignment._id)
    );

    const submissionQueryClauses = buildIdMatchers(
      "assignmentId",
      assignmentIdList
    );

    const submissions = submissionQueryClauses.length
      ? await submissionsCollection
          .find({ $or: submissionQueryClauses })
          .toArray()
      : [];

    const studentsSet = new Set();
    courses.forEach((course) => {
      (course.students || []).forEach((student) => {
        if (student?.userId) {
          studentsSet.add(student.userId);
        } else if (student?.email) {
          studentsSet.add(student.email);
        }
      });
    });

    const courseMap = new Map();
    courses.forEach((course) => {
      courseMap.set(normalizeId(course._id), course);
    });

    const submissionsByAssignment = new Map();
    submissions.forEach((submission) => {
      const key = normalizeId(submission.assignmentId);
      if (!submissionsByAssignment.has(key)) {
        submissionsByAssignment.set(key, []);
      }
      submissionsByAssignment.get(key).push(submission);
    });

    const assignmentStats = [];
    let onTimeTotal = 0;
    let lateTotal = 0;
    let gradedTotal = 0;
    let gradeSum = 0;
    let expectedSubmissions = 0;
    let pendingTotal = 0;
    let missingTotal = 0;

    const currentDate = new Date();

    assignments.forEach((assignment) => {
      const assignmentId = normalizeId(assignment._id);
      const courseId =
        normalizeId(assignment.courseId) || normalizeId(assignment.classId);
      const course = courseMap.get(courseId) || null;
      const courseStudentCount = course?.students?.length || 0;

      const relatedSubmissions = submissionsByAssignment.get(assignmentId) || [];

      let onTime = 0;
      let late = 0;
      let graded = 0;
      let gradeAccumulator = 0;
      const deadline = assignment.deadline ? new Date(assignment.deadline) : null;

      relatedSubmissions.forEach((submission) => {
        if (deadline && submission.submittedAt) {
          const submittedAt = new Date(submission.submittedAt);
          if (submittedAt > deadline) {
            late += 1;
          } else {
            onTime += 1;
          }
        } else {
          onTime += 1;
        }

        if (typeof submission.grade === "number") {
          graded += 1;
          gradeAccumulator += submission.grade;
        }
      });

      const notSubmitted = Math.max(courseStudentCount - relatedSubmissions.length, 0);
      
      // Calculate pending vs missing
      let pending = 0;
      let missing = 0;
      if (notSubmitted > 0) {
        if (deadline && currentDate > deadline) {
          // Deadline passed - these are missing
          missing = notSubmitted;
          missingTotal += missing;
        } else {
          // Deadline not passed or no deadline - these are pending
          pending = notSubmitted;
          pendingTotal += pending;
        }
      }
      
      const averageGrade = graded ? Number((gradeAccumulator / graded).toFixed(1)) : null;

      onTimeTotal += onTime;
      lateTotal += late;
      gradedTotal += graded;
      gradeSum += gradeAccumulator;
      expectedSubmissions += courseStudentCount;

      assignmentStats.push({
        assignmentId,
        title: assignment.title || "Untitled assignment",
        courseId,
        courseTitle: course?.title || course?.name || "Untitled course",
        deadline: assignment.deadline || null,
        totalStudents: courseStudentCount,
        submissions: relatedSubmissions.length,
        onTime,
        late,
        notSubmitted,
        pending,
        missing,
        averageGrade,
        completionRate:
          courseStudentCount > 0
            ? Math.round((relatedSubmissions.length / courseStudentCount) * 100)
            : 0,
      });
    });

    const courseSummaries = courses.map((course) => {
      const courseId = normalizeId(course._id);
      const courseAssignments = assignmentStats.filter(
        (assignment) => assignment.courseId === courseId
      );
      const assignmentCount = courseAssignments.length;
      const submissionCount = courseAssignments.reduce(
        (acc, assignment) => acc + assignment.submissions,
        0
      );
      const lateSubmissions = courseAssignments.reduce(
        (acc, assignment) => acc + assignment.late,
        0
      );
      const expected = (course.students?.length || 0) * (assignmentCount || 1);
      const completionRate = expected
        ? Math.round((submissionCount / expected) * 100)
        : 0;

      return {
        id: courseId,
        title: course.title || course.name || "Untitled course",
        subject: course.subject || "General",
        studentCount: course.students?.length || 0,
        assignmentCount,
        submissionCount,
        completionRate,
        lateSubmissions,
        lastUpdated: course.updatedAt || course.createdAt || new Date(),
      };
    });

    const bestCourse = [...courseSummaries]
      .filter((course) => course.assignmentCount > 0)
      .sort((a, b) => b.completionRate - a.completionRate)[0];

    const mostChallengingCourse = [...courseSummaries]
      .filter((course) => course.assignmentCount > 0)
      .sort((a, b) => a.completionRate - b.completionRate)[0];

    const overallExpectedSubmissions = assignmentStats.reduce(
      (acc, assignment) => acc + assignment.totalStudents,
      0
    );

    const overview = {
      totalCourses: courses.length,
      totalStudents: studentsSet.size,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      gradedSubmissions: gradedTotal,
      averageGrade: gradedTotal ? Number((gradeSum / gradedTotal).toFixed(1)) : null,
      averageSubmissionRate: overallExpectedSubmissions
        ? Math.round((submissions.length / overallExpectedSubmissions) * 100)
        : 0,
      onTimePercentage:
        onTimeTotal + lateTotal > 0
          ? Math.round((onTimeTotal / (onTimeTotal + lateTotal)) * 100)
          : null,
      latePercentage:
        onTimeTotal + lateTotal > 0
          ? Math.round((lateTotal / (onTimeTotal + lateTotal)) * 100)
          : null,
      bestCourse: bestCourse
        ? { title: bestCourse.title, completionRate: bestCourse.completionRate }
        : null,
      mostChallengingCourse: mostChallengingCourse
        ? {
            title: mostChallengingCourse.title,
            completionRate: mostChallengingCourse.completionRate,
          }
        : null,
      engagementBreakdown: {
        onTime: onTimeTotal,
        late: lateTotal,
        pending: pendingTotal,
        missing: missingTotal,
      },
    };

    return NextResponse.json(
      {
        overview,
        courses: courseSummaries,
        assignments: assignmentStats,
        metadata: {
          generatedAt: new Date().toISOString(),
          instructorId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/instructor/analytics] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
