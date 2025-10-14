"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  fetchAssignments,
  uploadAssignment,
  deleteAssignment,
  fetchSubmissions,
  uploadSubmission,
} from "@/lib/assignment";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { format } from "date-fns";

export default function AssignmentPage() {
  const { classId } = useParams();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [file, setFile] = useState(null);
  const [submissions, setSubmissions] = useState({}); // {assignmentId: [submissions]}
  const [loading, setLoading] = useState(false);

  // Track logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => setUser(usr));
    return () => unsubscribe();
  }, []);

  // Fetch assignments
  const loadAssignments = async () => {
    const data = await fetchAssignments(classId);
    setAssignments(data);
  };

  useEffect(() => {
    if (classId) loadAssignments();
  }, [classId]);

  // Upload assignment
  const handleUpload = async () => {
    if (!title || !description || !deadline) return alert("Please fill all required fields.");
    if (file && file.size > 10 * 1024 * 1024) return alert("File too large (>10MB).");

    setLoading(true);
    await uploadAssignment({ classId, title, description, deadline, file });
    setTitle(""); setDescription(""); setDeadline(""); setFile(null);
    await loadAssignments();
    setLoading(false);
    alert("Assignment uploaded successfully!");
  };

  // Delete assignment
  const handleDelete = async (assignmentId) => {
    if (!confirm("Delete this assignment?")) return;
    await deleteAssignment({ classId, assignmentId });
    await loadAssignments();
  };

  // Upload student submission
  const handleSubmit = async (assignmentId, submissionFile) => {
    if (!submissionFile) return alert("Select a file!");
    if (submissionFile.size > 10 * 1024 * 1024) return alert("File too large (>10MB).");
    setLoading(true);
    await uploadSubmission({
      classId,
      assignmentId,
      studentId: user.uid,
      studentName: user.displayName || "Student",
      file: submissionFile,
    });
    setLoading(false);
    alert("Submission uploaded!");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Assignments</h1>

      {/* Instructor Upload */}
      {user?.email?.includes("@instructor.com") && (
        <div className="mb-6 p-4 border rounded shadow">
          <h2 className="font-semibold mb-2">Create Assignment</h2>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 w-full mb-2 rounded"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 w-full mb-2 rounded"
          />
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="border p-2 w-full mb-2 rounded"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-2"
          />
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Assignment"}
          </button>
        </div>
      )}

      {/* Assignments List */}
      <div>
        {assignments.map((a) => (
          <div key={a.id} className="mb-4 p-4 border rounded shadow">
            <h3 className="font-semibold">{a.title}</h3>
            <p>{a.description}</p>
            <p className="text-sm text-gray-500">Deadline: {format(new Date(a.deadline), "PPP p")}</p>
            {a.fileUrl && (
              <a href={a.fileUrl} target="_blank" className="text-blue-500 underline">
                Download Assignment
              </a>
            )}

            {/* Instructor Delete */}
            {user?.email?.includes("@instructor.com") && (
              <button
                onClick={() => handleDelete(a.id)}
                className="ml-2 text-red-500 underline"
              >
                Delete
              </button>
            )}

            {/* Student Submission */}
            {!user?.email?.includes("@instructor.com") && (
              <div className="mt-2">
                <input type="file" onChange={(e) => handleSubmit(a.id, e.target.files[0])} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
