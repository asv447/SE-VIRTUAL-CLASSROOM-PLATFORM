import { NextResponse } from "next/server";
// [MODIFIED] Import getGroupsCollection
import {
  getAssignmentsCollection,
  getCoursesCollection,
  getGroupsCollection,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!id || !classId) {
      return NextResponse.json(
        { error: "Missing id or classId" },
        { status: 400 }
      );
    }

    // Authorization: require instructor ownership. Accept role/userId query or x-uid header.
    const role = searchParams.get("role");
    const userId = searchParams.get("userId") || request.headers.get("x-uid");
    if (!role && !userId) {
      // defensive: deny if we can't determine caller
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignmentsCollection = await getAssignmentsCollection();
    // Verify ownership
    const existing = await assignmentsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }
    if (role === "instructor" || userId) {
      const uid = userId;
      if (!uid || (existing.instructorId || "") !== uid) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Delete assignment from MongoDB
    const result = await assignmentsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Delete related submissions
    // const submissionsCollection = await getSubmissionsCollection();
    // await submissionsCollection.deleteMany({ assignmentId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Assignment deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/assignments/[id]] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const userId = searchParams.get("userId");

    const assignmentsCollection = await getAssignmentsCollection();
    const assignment = await assignmentsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!assignment)
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    // [MODIFIED] Enforce access rules
    try {
      if (role === "instructor" && userId) {
        // Instructor may only access assignments they created
        if ((assignment.instructorId || "") !== userId) {
          return NextResponse.json(
            { error: "Forbidden: Not your assignment" },
            { status: 403 }
          );
        }
      }
      if (role === "student" && userId) {
        // Student may only access if enrolled in the course AND in the right group
        const cid = assignment.classId || assignment.courseId;
        if (!cid) {
          return NextResponse.json(
            { error: "Forbidden: No course" },
            { status: 403 }
          );
        }

        // 1. Check if student is enrolled at all
        const courses = await getCoursesCollection();
        const courseDoc = await courses.findOne({ _id: new ObjectId(cid) });
        const enrolled = (courseDoc?.students || []).some(
          (s) => s?.userId === userId
        );

        if (!enrolled) {
          return NextResponse.json(
            { error: "Forbidden: Not enrolled" },
            { status: 403 }
          );
        }

        // 2. [NEW] Check audience
        const audience = assignment.audience;
        if (!audience || audience.type === "class") {
          // It's a class assignment, and they are enrolled. Access granted.
        } else if (audience.type === "group") {
          // It's a group assignment. Check if student is in one of the groups.
          const assignedGroupIds = audience.groupIds || [];
          const groupsCol = await getGroupsCollection();
          const myGroups = await groupsCol
            .find({
              courseId: new ObjectId(cid),
              "members.userId": userId,
            })
            .toArray();
          const myGroupIds = myGroups.map((g) => g._id.toString());

          const isAssignedToGroup = assignedGroupIds.some((id) =>
            myGroupIds.includes(id)
          );

          if (!isAssignedToGroup) {
            return NextResponse.json(
              { error: "Forbidden: Not assigned to your group" },
              { status: 403 }
            );
          }
        }
      }
    } catch (e) {
      console.error("Access check failed:", e);
      return NextResponse.json(
        { error: "Failed to verify access" },
        { status: 500 }
      );
    }
    // [END MODIFIED]

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
      return NextResponse.json(
        { error: "Missing assignment id" },
        { status: 400 }
      );
    }

    // Authorization: only instructor who created the assignment may PATCH
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const userId = searchParams.get("userId") || request.headers.get("x-uid");
    if (!role && !userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { deadline, maxScore } = body;
    if (!deadline && maxScore === undefined) {
      return NextResponse.json(
        { error: "Missing deadline or maxScore field" },
        { status: 400 }
      );
    }

    const assignmentsCollection = await getAssignmentsCollection();

    const existing = await assignmentsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existing)
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    const uid = userId;
    if (!uid || (existing.instructorId || "") !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = {
      updatedAt: new Date(),
    };

    // attempt to parse deadline into a Date
    if (deadline) {
      const parsed = new Date(deadline);
      if (!isNaN(parsed.getTime())) {
        update.deadline = parsed;
      } else {
        // if parsing failed, store as string
        update.deadline = deadline;
      }
    }

    // Update maxScore if provided
    if (maxScore !== undefined) {
      const parsedMaxScore =
        maxScore === null || maxScore === "" ? null : Number(maxScore);
      if (parsedMaxScore !== null && !isNaN(parsedMaxScore)) {
        update.maxScore = parsedMaxScore;
      } else if (parsedMaxScore === null) {
        update.maxScore = null;
      }
    }

    const result = await assignmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id,
        deadline: result.deadline,
        maxScore: result.maxScore,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/assignments/[id]] PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}