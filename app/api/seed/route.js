// app/api/seed/route.js
import { NextResponse } from "next/server";
import { getCoursesCollection, getAssignmentsCollection } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    // Clear existing data (optional - remove if you want to keep existing data)
    const coursesCollection = await getCoursesCollection();
    const assignmentsCollection = await getAssignmentsCollection();
    
    // Check if data already exists
    const existingCourse = await coursesCollection.findOne({ code: 'CS101' });
    if (existingCourse) {
      return NextResponse.json({ 
        message: "Default data already exists",
        course: existingCourse,
        assignments: await assignmentsCollection.find({ courseId: existingCourse._id.toString() }).toArray()
      }, { status: 200 });
    }
    
    // Create default course
    const defaultCourse = {
      name: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'Fundamentals of programming and computer science concepts',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const courseResult = await coursesCollection.insertOne(defaultCourse);
    const courseId = courseResult.insertedId.toString();
    
    // Create default assignment
    const defaultAssignment = {
      classId: courseId, // Using courseId as classId for compatibility
      courseId: courseId,
      title: 'Hello World Program',
      description: 'Write a simple program that prints "Hello, World!" and submit your source code file. You can submit any programming language file (.py, .js, .java, .cpp, etc.)',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      fileUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const assignmentResult = await assignmentsCollection.insertOne(defaultAssignment);
    const assignmentId = assignmentResult.insertedId.toString();
    
    // Create another assignment
    const sampleAssignment = {
      classId: courseId,
      courseId: courseId,
      title: 'Data Structures Assignment',
      description: 'Implement basic data structures: arrays, linked lists, and stacks. Include test cases and documentation in your submission.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      fileUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const sampleResult = await assignmentsCollection.insertOne(sampleAssignment);
    
    return NextResponse.json({ 
      message: "Default data seeded successfully!",
      course: { id: courseId, ...defaultCourse },
      assignments: [
        { id: assignmentId, ...defaultAssignment },
        { id: sampleResult.insertedId.toString(), ...sampleAssignment }
      ]
    }, { status: 201 });
    
  } catch (err) {
    console.error("[API /api/seed] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const coursesCollection = await getCoursesCollection();
    const assignmentsCollection = await getAssignmentsCollection();
    
    const course = await coursesCollection.findOne({ code: 'CS101' });
    if (!course) {
      return NextResponse.json({ message: "No default data found" }, { status: 404 });
    }
    
    const assignments = await assignmentsCollection.find({ courseId: course._id.toString() }).toArray();
    
    return NextResponse.json({ 
      course: { id: course._id.toString(), ...course },
      assignments: assignments.map(a => ({ id: a._id.toString(), ...a }))
    }, { status: 200 });
    
  } catch (err) {
    console.error("[API /api/seed] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
