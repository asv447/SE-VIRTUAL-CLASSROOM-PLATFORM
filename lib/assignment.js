import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";

// Upload assignment file and create assignment
export const uploadAssignment = async ({ classId, title, description, deadline, file }) => {
  const assignmentRef = doc(collection(db, "classrooms", classId, "assignments"));
  let fileUrl = "";

  if (file) {
    const storageRef = ref(storage, `assignments/${classId}/${assignmentRef.id}/${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  }

  await setDoc(assignmentRef, {
    title,
    description,
    deadline,
    fileUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: assignmentRef.id, fileUrl };
};

// Fetch assignments for a classroom
export const fetchAssignments = async (classId) => {
  const assignmentsCol = collection(db, "classrooms", classId, "assignments");
  const snapshot = await getDocs(assignmentsCol);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Delete assignment
export const deleteAssignment = async ({ classId, assignmentId }) => {
  const assignmentDocRef = doc(db, "classrooms", classId, "assignments", assignmentId);

  // Delete assignment file in storage
  const storageRef = ref(storage, `assignments/${classId}/${assignmentId}`);
  await deleteObject(storageRef).catch(() => {}); // Ignore if no file

  await deleteDoc(assignmentDocRef);
};

// Upload student submission
export const uploadSubmission = async ({ classId, assignmentId, studentId, studentName, file, groupId }) => {
  const submissionRef = doc(
    db,
    "classrooms",
    classId,
    "assignments",
    assignmentId,
    "submissions",
    studentId
  );

  let fileUrl = "";
  if (file) {
    const storageRef = ref(storage, `submissions/${classId}/${assignmentId}/${studentId}/${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  }

  await setDoc(submissionRef, {
    studentId,
    studentName,
    fileUrl,
    submittedAt: serverTimestamp(),
    groupId: groupId || null,
  });

  return { id: submissionRef.id, fileUrl };
};

// Fetch submissions
export const fetchSubmissions = async (classId, assignmentId) => {
  const submissionsCol = collection(db, "classrooms", classId, "assignments", assignmentId, "submissions");
  const snapshot = await getDocs(submissionsCol);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
