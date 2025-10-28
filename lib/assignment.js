import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import { 
  getAssignmentsCollection, 
  getSubmissionsCollection 
} from "./mongodb";
import { ObjectId } from "mongodb";

export const uploadAssignment = async ({ classId, title, description, deadline, file }) => {
  const assignmentsCollection = await getAssignmentsCollection();
  let fileUrl = "";
  const assignmentId = new ObjectId().toString();

  if (file) {
    const storageRef = ref(storage, `assignments/${classId}/${assignmentId}/${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  }

  const newAssignment = {
    _id: new ObjectId(assignmentId),
    classId,
    title,
    description,
    deadline,
    fileUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await assignmentsCollection.insertOne(newAssignment);
  return { id: result.insertedId.toString(), fileUrl };
};

export const fetchAssignments = async (classId) => {
  const assignmentsCollection = await getAssignmentsCollection();
  const assignments = await assignmentsCollection.find({ classId }).toArray();
  
  return assignments.map((assignment) => ({
    id: assignment._id.toString(),
    ...assignment,
    _id: undefined,
  }));
};

export const deleteAssignment = async ({ classId, assignmentId }) => {
  const assignmentsCollection = await getAssignmentsCollection();

  const storageRef = ref(storage, `assignments/${classId}/${assignmentId}`);
  await deleteObject(storageRef).catch(() => {});

  const result = await assignmentsCollection.deleteOne({ 
    _id: new ObjectId(assignmentId) 
  });

  const submissionsCollection = await getSubmissionsCollection();
  await submissionsCollection.deleteMany({ assignmentId });

  return result.deletedCount > 0;
};

export const uploadSubmission = async ({ 
  classId, 
  assignmentId, 
  studentId, 
  studentName, 
  file, 
  groupId 
}) => {
  const submissionsCollection = await getSubmissionsCollection();

  let fileUrl = "";
  if (file) {
    const storageRef = ref(storage, `submissions/${classId}/${assignmentId}/${studentId}/${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  }

  const newSubmission = {
    classId,
    assignmentId,
    studentId,
    studentName,
    fileUrl,
    submittedAt: new Date(),
    groupId: groupId || null,
  };

  const result = await submissionsCollection.insertOne(newSubmission);
  return { id: result.insertedId.toString(), fileUrl };
};

export const fetchSubmissions = async (classId, assignmentId) => {
  const submissionsCollection = await getSubmissionsCollection();
  const submissions = await submissionsCollection.find({ 
    classId, 
    assignmentId 
  }).toArray();
  
  return submissions.map((submission) => ({
    id: submission._id.toString(),
    ...submission,
    _id: undefined,
  }));
};
