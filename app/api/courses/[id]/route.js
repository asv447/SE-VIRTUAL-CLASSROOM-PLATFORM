import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getCoursesCollection,
  getStreamsCollection,
  getAssignmentsCollection,
  getSubmissionsCollection,
} from "../../../../lib/mongodb";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }

    const uid = request.headers.get("x-uid") || null;

    const coursesCol = await getCoursesCollection();
    const course = await coursesCol.findOne({ _id: new ObjectId(id) });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (uid && course.instructorId && course.instructorId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await coursesCol.deleteOne({ _id: new ObjectId(id) });

    try {
      const [streamsCol, assignmentsCol, submissionsCol] = await Promise.all([
        getStreamsCollection(),
        getAssignmentsCollection(),
        getSubmissionsCollection(),
      ]);

      await Promise.allSettled([
        streamsCol.deleteMany({ classId: id }),
        assignmentsCol.deleteMany({ $or: [{ classId: id }, { courseId: id }] }),
        submissionsCol.deleteMany({ classId: id }),
      ]);
    } catch (_) {}

    return NextResponse.json({ message: "Course deleted" }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/courses/:id] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
