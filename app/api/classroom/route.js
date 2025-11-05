import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getClassroomsCollection, getAssignmentsCollection } from '@/lib/mongodb';

function buildClassroomQuery(classId) {
  const clauses = [];

  clauses.push({ classroomId: classId });
  clauses.push({ classCode: classId });
  clauses.push({ courseCode: classId });
  clauses.push({ _id: classId });

  if (ObjectId.isValid(classId)) {
    clauses.push({ _id: new ObjectId(classId) });
  }

  return { $or: clauses };
}

function normalizeDocument(doc) {
  if (!doc) {
    return null;
  }
  const id = doc._id?.toString ? doc._id.toString() : doc._id;
  return {
    ...doc,
    id,
    _id: undefined,
  };
}

function mergePosts(sourcePosts = [], assignmentPosts = []) {
  const merged = [];
  const seen = new Set();

  const register = (post) => {
    if (!post) {
      return;
    }
    const key = post.id || post._id || `${post.title || ''}-${post.timestamp || ''}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(post);
  };

  sourcePosts.forEach(register);
  assignmentPosts.forEach(register);

  return merged;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || searchParams.get('id');

    if (!classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 });
    }

    const classroomsCollection = await getClassroomsCollection();
    const assignmentsCollection = await getAssignmentsCollection();

    const classroomDoc = await classroomsCollection.findOne(buildClassroomQuery(classId));

    if (!classroomDoc) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classroom = normalizeDocument(classroomDoc);
    classroom.classroomId = classroom.classroomId || classroom.id;

    const postCandidates = Array.isArray(classroomDoc.posts)
      ? classroomDoc.posts.map(normalizeDocument)
      : [];

    const assignmentQuery = {
      $or: [
        { classId },
        { classId: classroom.classroomId },
        { classId: classroom.id },
        { courseId: classId },
        { courseId: classroom.classroomId },
        { courseId: classroom.id },
      ],
    };

    const assignmentDocs = await assignmentsCollection.find(assignmentQuery).toArray();
    const assignments = assignmentDocs.map(normalizeDocument);

    classroom.posts = mergePosts(postCandidates, assignments);

    return NextResponse.json(classroom, { status: 200 });
  } catch (error) {
    console.error('[API /api/classroom] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, classId, data } = body;

    if (action === 'addComment') {
      if (!data?.postId) {
        return NextResponse.json({ error: 'postId is required' }, { status: 400 });
      }

      const assignments = await getAssignmentsCollection();
      const postFilters = [];
      if (data?.postId) {
        postFilters.push({ _id: data.postId });
        if (ObjectId.isValid(data.postId)) {
          postFilters.push({ _id: new ObjectId(data.postId) });
        }
      }

      const classFilters = [classId];
      if (data?.classroomId) {
        classFilters.push(data.classroomId);
      }

      await assignments.updateOne(
        {
          $and: [
            { $or: postFilters },
            { classId: { $in: classFilters.filter(Boolean) } },
          ],
        },
        {
          $push: {
            chats: {
              author: { name: data?.authorName || 'You', uid: data?.authorId || 'currentUserUid' },
              text: data?.text,
              timestamp: new Date(),
            },
          },
        },
      );
    } else if (action === 'addGlobalChat') {
      if (!classId) {
        return NextResponse.json({ error: 'classId is required' }, { status: 400 });
      }

      const classrooms = await getClassroomsCollection();
      await classrooms.updateOne(
        buildClassroomQuery(classId),
        {
          $push: {
            classroomChat: {
              author: { name: data?.authorName || 'You', uid: data?.authorId || 'currentUserUid' },
              text: data?.text,
              timestamp: new Date(),
            },
          },
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/classroom] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}