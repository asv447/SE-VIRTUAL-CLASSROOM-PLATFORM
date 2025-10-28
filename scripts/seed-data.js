// scripts/seed-data.js
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-classroom';

async function seedData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Create default course
    const coursesCollection = db.collection('courses');
    const defaultCourse = {
      name: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'Fundamentals of programming and computer science concepts',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const courseResult = await coursesCollection.insertOne(defaultCourse);
    const courseId = courseResult.insertedId.toString();
    console.log('Created default course with ID:', courseId);
    
    // Create default assignment
    const assignmentsCollection = db.collection('assignments');
    const defaultAssignment = {
      classId: courseId, // Using courseId as classId for compatibility
      courseId: courseId,
      title: 'Hello World Program',
      description: 'Write a simple program that prints "Hello, World!" and submit your source code file.',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      fileUrl: '', // No file attached to this assignment
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const assignmentResult = await assignmentsCollection.insertOne(defaultAssignment);
    const assignmentId = assignmentResult.insertedId.toString();
    console.log('Created default assignment with ID:', assignmentId);
    
    // Create another assignment with a sample file description
    const sampleAssignment = {
      classId: courseId,
      courseId: courseId,
      title: 'Data Structures Assignment',
      description: 'Implement basic data structures: arrays, linked lists, and stacks. Include test cases for each implementation.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      fileUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const sampleResult = await assignmentsCollection.insertOne(sampleAssignment);
    console.log('Created sample assignment with ID:', sampleResult.insertedId.toString());
    
    console.log('✅ Default data seeded successfully!');
    console.log('\nSummary:');
    console.log('- Course: Introduction to Computer Science (CS101)');
    console.log('- Assignment 1: Hello World Program (Due in 7 days)');
    console.log('- Assignment 2: Data Structures Assignment (Due in 14 days)');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedData().catch(console.error);
