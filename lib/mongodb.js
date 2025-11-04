// lib/mongodb.js
import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};
if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local");
}
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global;
  globalWithMongo._mongoClientPromise = globalWithMongo._mongoClientPromise || null;
  
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Helper function to get database instance
export async function getDatabase() {
  const client = await clientPromise;
  return client.db(); // Uses the database name from the connection string
}

// Helper function to get collections
export async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection('users');
}

export async function getClassroomsCollection() {
  const db = await getDatabase();
  return db.collection('classrooms');
}

export async function getAssignmentsCollection() {
  const db = await getDatabase();
  return db.collection('assignments');
}

export async function getSubmissionsCollection() {
  const db = await getDatabase();
  return db.collection('submissions');
}

export async function getCoursesCollection() {
  const db = await getDatabase();
  return db.collection('courses');
}

// Notifications collection helper
export async function getNotificationsCollection() {
  const db = await getDatabase();
  return db.collection('notifications');
}
export async function getClassroomChatsCollection() {
  const db = await getDatabase();
  return db.collection('classroomChats');
}