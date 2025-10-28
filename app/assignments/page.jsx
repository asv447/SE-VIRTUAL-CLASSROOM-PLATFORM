"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  const [pageLoading, setPageLoading] = useState(true);

  // Track logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => setUser(usr));
    return () => unsubscribe();
  }, []);

    const loadAssignments = async () => {
    console.log("Loading assignments for classId:", classId);
    setPageLoading(true);
    try {
      // If classId exists, filter by it. Otherwise, load all assignments
      const url = classId ? `/api/assignments?classId=${classId}` : '/api/assignments';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("Assignments loaded:", data);
        setAssignments(data);
      } else {
        console.error("Failed to load assignments:", res.status);
      }
    } catch (err) {
      console.error("Error loading assignments:", err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    // Always load assignments (with or without classId)
    loadAssignments();
  }, [classId]);

  // Upload assignment
  const handleUpload = async () => {
    if (!title || !description || !deadline) return alert("Please fill all required fields.");
    if (file && file.size > 10 * 1024 * 1024) return alert("File too large (>10MB).");

    setLoading(true);
    try {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append("courseId", classId || "default"); // Use default if no classId
      formData.append("title", title);
      formData.append("description", description);
      formData.append("deadline", deadline);
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/assignments", {
        method: "POST",
        body: formData, // No Content-Type header when using FormData
      });

      if (res.ok) {
        setTitle(""); setDescription(""); setDeadline(""); setFile(null);
        await loadAssignments();
        alert("Assignment uploaded successfully!");
      } else {
        const error = await res.json();
        alert("Failed to upload assignment: " + error.error);
      }
    } catch (err) {
      console.error("Error uploading assignment:", err);
      alert("Failed to upload assignment");
    } finally {
      setLoading(false);
    }
  };

  // Delete assignment
  const handleDelete = async (assignmentId) => {
    if (!confirm("Delete this assignment?")) return;
    
    try {
      const res = await fetch(`/api/assignments/${assignmentId}?classId=${classId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        await loadAssignments();
        alert("Assignment deleted successfully!");
      } else {
        const error = await res.json();
        alert("Failed to delete assignment: " + error.error);
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
      alert("Failed to delete assignment");
    }
  };

  // Upload student submission
  const handleSubmit = async (assignmentId, submissionFile) => {
    if (!submissionFile) return alert("Select a file!");
    if (submissionFile.size > 10 * 1024 * 1024) return alert("File too large (>10MB).");
    
    setLoading(true);
    try {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("studentId", user.uid);
      formData.append("studentName", user.displayName || "Student");
      formData.append("classId", classId || "default");
      formData.append("file", submissionFile);

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData, // No Content-Type header when using FormData
      });

      if (res.ok) {
        alert("Submission uploaded successfully!");
        // Reload assignments to show updated submission status if needed
        await loadAssignments();
      } else {
        const error = await res.json();
        alert("Failed to upload submission: " + error.error);
      }
    } catch (err) {
      console.error("Error uploading submission:", err);
      alert("Failed to upload submission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {classId ? `Assignments - Course ${classId}` : "All Assignments"}
      </h1>

      {/* Loading State */}
      {pageLoading && (
        <div className="text-center py-8">
          <p>Loading assignments...</p>
        </div>
      )}

      {/* No Assignments */}
      {!pageLoading && assignments.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <p>No assignments found.</p>
          {user?.email?.includes("@instructor.com") && (
            <p>Create your first assignment using the form below.</p>
          )}
          {!user && (
            <p>Please log in to view or create assignments.</p>
          )}
        </div>
      )}

      {/* Instructor Upload */}
      {user?.email?.includes("@instructor.com") && !pageLoading && (
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
      {!pageLoading && assignments.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4">Assignments ({assignments.length})</h2>
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
                  <input 
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleSubmit(a.id, file);
                      }
                    }}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select a file to submit</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
