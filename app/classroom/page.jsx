"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function ClassroomDetails() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [activeTab, setActiveTab] = useState("stream");
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [editingDeadline, setEditingDeadline] = useState({});
  const [deadlineInputs, setDeadlineInputs] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchClassroom = async () => {
      try {
        const res = await fetch(`/api/classroom/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load classroom");
        setClassroom(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchClassroom();
  }, [id]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleFileSelect = (assignmentId, file) => {
    setSelectedFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  const startEditDeadline = (assignmentId, currentDeadline) => {
    // format to datetime-local: YYYY-MM-DDTHH:mm
    let v = "";
    try {
      const d = new Date(currentDeadline);
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      v = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch (e) {
      v = currentDeadline || "";
    }
    setDeadlineInputs((p) => ({ ...p, [assignmentId]: v }));
    setEditingDeadline((p) => ({ ...p, [assignmentId]: true }));
  };

  const cancelEditDeadline = (assignmentId) => {
    setEditingDeadline((p) => ({ ...p, [assignmentId]: false }));
    setDeadlineInputs((p) => ({ ...p, [assignmentId]: undefined }));
  };

  const saveDeadline = async (assignmentId) => {
    const value = deadlineInputs[assignmentId];
    if (!value) {
      toast({
        title: "Missing deadline",
        description: "Select a new deadline before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}?role=instructor&userId=${encodeURIComponent(
          user?.uid || ""
        )}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-uid": user?.uid || "" },
          body: JSON.stringify({ deadline: value }),
        }
      );
      if (res.ok) {
        // update local classroom assignments to reflect new deadline
        const updated = await res.json();
        setClassroom((c) => {
          const newC = { ...c };
          if (newC.assignments) {
            newC.assignments = newC.assignments.map((a) =>
              a.id === assignmentId ? { ...a, deadline: updated.deadline } : a
            );
          }
          return newC;
        });
        cancelEditDeadline(assignmentId);
        toast({
          title: "Deadline updated",
          description: "Students will now see the new due date.",
        });
      } else {
        const e = await res.json();
        toast({
          title: "Failed to update deadline",
          description:
            e?.error || res.statusText || "Server returned an error.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating deadline:", err);
      toast({
        title: "Failed to update deadline",
        description: err.message || "Unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const submitAssignment = async (assignmentId) => {
    const file = selectedFiles[assignmentId];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Choose a file before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Log in to upload your submission.",
        variant: "destructive",
      });
      return;
    }

    setUploading((p) => ({ ...p, [assignmentId]: true }));
    try {
      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("studentId", user.uid);
      formData.append(
        "studentName",
        user.displayName || user.email || "Student"
      );
      formData.append("file", file);

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast({
          title: "Submission uploaded",
          description: "Your assignment file has been submitted.",
        });
        setSelectedFiles((p) => ({ ...p, [assignmentId]: null }));
      } else {
        const err = await res.json();
        toast({
          title: "Upload failed",
          description:
            err?.error || res.statusText || "Server returned an error.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast({
        title: "Upload failed",
        description: err.message || "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setUploading((p) => ({ ...p, [assignmentId]: false }));
    }
  };

  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!classroom)
    return <p className="text-center text-gray-500">Loading...</p>;

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      {/* Header Section */}
      <div className="border-b border-border pb-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{classroom.name}</h1>
        <p className="text-muted mb-0">Instructor: {classroom.instructor}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-sm text-muted-foreground">Class ID: {classroom.classId}</span>
          <button
            onClick={() => navigator.clipboard.writeText(classroom.classId)}
            className="border border-border text-sm px-2 py-1 rounded hover:bg-muted/60 hover:text-foreground transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-6 mb-6 border-b border-border pb-2">
        {["stream", "assignments", "chat", "people"].map((tab) => (
          <button
            key={tab}
            className={`uppercase font-semibold tracking-wide ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="transition-all">
        {activeTab === "stream" && (
          <div>
            {classroom.posts?.length > 0 ? (
              classroom.posts.map((post, idx) => (
                <div
                  key={idx}
                  className="border p-4 rounded-xl mb-3 hover:shadow"
                >
                  <p>{post.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p>No posts yet.</p>
            )}
          </div>
        )}

        {activeTab === "assignments" && (
          <div>
            {classroom.assignments?.length > 0 ? (
              classroom.assignments.map((a, idx) => (
                <div
                  key={idx}
                  className="border p-4 rounded-xl mb-3 hover:shadow"
                >
                  <h3 className="font-semibold">{a.title}</h3>
                  <p>{a.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm text-gray-500">
                      Deadline: {new Date(a.deadline).toLocaleString()}
                    </p>
                    {/* Show edit control for instructors only */}
                    {user &&
                      (user.uid === classroom.instructorId ||
                        user.email === classroom.instructorEmail) && (
                        <div>
                          {!editingDeadline[a.id] ? (
                            <button
                              onClick={() =>
                                startEditDeadline(a.id, a.deadline)
                              }
                              className="text-sm text-blue-600 underline"
                            >
                              Edit deadline
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="datetime-local"
                                value={deadlineInputs[a.id] || ""}
                                onChange={(e) =>
                                  setDeadlineInputs((p) => ({
                                    ...p,
                                    [a.id]: e.target.value,
                                  }))
                                }
                                className="border px-2 py-1 rounded"
                              />
                              <button
                                onClick={() => saveDeadline(a.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => cancelEditDeadline(a.id)}
                                className="px-3 py-1 bg-gray-200 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  {a.fileUrl && (
                    <div className="mt-2">
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 underline"
                      >
                        Download assignment file
                      </a>
                    </div>
                  )}

                  <div className="mt-4">
                    {user ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          onChange={(e) =>
                            handleFileSelect(a.id, e.target.files[0])
                          }
                          accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png,.py,.js,.java,.cpp"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {selectedFiles[a.id] && (
                          <p className="text-xs text-gray-600">
                            Selected: {selectedFiles[a.id].name}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => submitAssignment(a.id)}
                            disabled={uploading[a.id]}
                            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
                          >
                            {uploading[a.id] ? "Uploading..." : "Submit"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Please sign in to submit your work.
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p>No assignments available.</p>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div>
            {classroom.chat?.length > 0 ? (
              classroom.chat.map((msg, idx) => (
                <div
                  key={idx}
                  className="border p-3 rounded-xl mb-2 hover:bg-gray-50"
                >
                  <p>
                    <strong>{msg.user}</strong>: {msg.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p>No chat messages yet.</p>
            )}
          </div>
        )}

        {activeTab === "people" && (
          <div className="grid grid-cols-2 gap-2">
            {classroom.people?.length > 0 ? (
              classroom.people.map((p, idx) => (
                <div
                  key={idx}
                  className="border p-3 rounded-xl hover:bg-gray-50"
                >
                  {p}
                </div>
              ))
            ) : (
              <p>No people enrolled.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
