"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ClassroomDetails() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [activeTab, setActiveTab] = useState("stream");
  const [error, setError] = useState(null);

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

  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!classroom) return <p className="text-center text-gray-500">Loading...</p>;

  return (
    <div className="min-h-screen bg-white text-black p-8">
      {/* Header Section */}
      <div className="border-b border-gray-300 pb-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{classroom.name}</h1>
        <p className="text-gray-600">Instructor: {classroom.instructor}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-sm text-gray-700">Class ID: {classroom.classId}</span>
          <button
            onClick={() => navigator.clipboard.writeText(classroom.classId)}
            className="border border-black text-sm px-2 py-1 rounded hover:bg-black hover:text-white transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-6 mb-6 border-b border-gray-300 pb-2">
        {["stream", "assignments", "chat", "people"].map((tab) => (
          <button
            key={tab}
            className={`uppercase font-semibold tracking-wide ${
              activeTab === tab
                ? "border-b-2 border-black"
                : "text-gray-500 hover:text-black"
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
                <div key={idx} className="border p-4 rounded-xl mb-3 hover:shadow">
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
                <div key={idx} className="border p-4 rounded-xl mb-3 hover:shadow">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p>{a.description}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Deadline: {new Date(a.deadline).toLocaleString()}
                  </p>
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
                <div key={idx} className="border p-3 rounded-xl mb-2 hover:bg-gray-50">
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
                <div key={idx} className="border p-3 rounded-xl hover:bg-gray-50">
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
