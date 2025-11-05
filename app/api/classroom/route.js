import { NextResponse } from 'next/server';
import { getClassroomsCollection, getAssignmentsCollection } from '@/lib/mongodb';  // Your file

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || '1';  // From query param

    const classrooms = await getClassroomsCollection();
    const assignments = await getAssignmentsCollection();

    const classroom = await classrooms.findOne({ _id: classId });
    if (!classroom) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Fetch related posts/assignments
    classroom.posts = await assignments.find({ classId }).toArray();

    return NextResponse.json(classroom);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, classId, data } = body;

    if (action === 'addComment') {
      // data: { postId, text }
      const assignments = await getAssignmentsCollection();
      await assignments.updateOne(
        { _id: data.postId, classId },
        { $push: { chats: { author: { name: 'You', uid: 'currentUserUid' }, text: data.text, timestamp: new Date() } } }  // Replace 'currentUserUid' with Firebase auth
      );
    } else if (action === 'addGlobalChat') {
      // Add to classrooms.classroomChat or separate collection
      const classrooms = await getClassroomsCollection();
      await classrooms.updateOne(
        { _id: classId },
        { $push: { classroomChat: { author: { name: 'You', uid: 'currentUserUid' }, text: data.text, timestamp: new Date() } } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}