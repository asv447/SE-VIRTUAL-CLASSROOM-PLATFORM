// lib/mongodb.js
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {

  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;


export async function getDatabase() {
  const client = await clientPromise;
  return client.db(); // Uses the DB name from the URI (e.g. ...mongodb.net/<dbName>)
}


async function getCollection(name) {
  const db = await getDatabase();
  return db.collection(name);
}

export async function getUsersCollection() {
  return getCollection("users");
}

export async function getClassroomsCollection() {
  return getCollection("classrooms");
}

export async function getAssignmentsCollection() {
  return getCollection("assignments");
}

export async function getSubmissionsCollection() {
  return getCollection("submissions");
}

export async function getCoursesCollection() {
  return getCollection("courses");
}

export async function getNotificationsCollection() {
  return getCollection("notifications");
}

export async function getClassroomChatsCollection() {
  return getCollection("classroomChats");
}

export async function getStudentsCollection() {
  return getCollection("students");
}


export async function getStreamsCollection() {
  return getCollection("streams");
}

export async function getGroupsCollection() {
  return getCollection("groups");
}