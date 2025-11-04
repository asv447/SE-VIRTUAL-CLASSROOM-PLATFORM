"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy, Send } from "lucide-react";

export default function ClassroomPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("stream");
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchClassroom = async () => {
      try {
        const res = await fetch(`/api/classroom/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load classroom");
        setClassroom(data.classroom);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load classroom details.");
      }
    };
    fetchClassroom();

    // Dummy posts data with separate comments for each post
    setPosts([
      {
        id: 1,
        title: "Lecture 1: Introduction",
        content: "Welcome to the class! Please review the course syllabus.",
        comments: [
          { id: 1, name: "Alice", text: "Excited to start!" },
          { id: 2, name: "Bob", text: "When is the first assignment?" },
        ],
        newComment: "",
      },
      {
        id: 2,
        title: "Lecture 2: Basics of Programming",
        content: "We will cover variables, loops, and conditionals today.",
        comments: [],
        newComment: "",
      },
    ]);
  }, [id]);

  const handleCopy = () => {
    if (classroom?.classCode) {
      navigator.clipboard.writeText(classroom.classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddComment = (postId) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId && post.newComment.trim()
          ? {
              ...post,
              comments: [
                ...post.comments,
                { id: Date.now(), name: "You", text: post.newComment },
              ],
              newComment: "",
            }
          : post
      )
    );
  };

  if (error) {
    return <p className="text-center text-red-500 mt-10">{error}</p>;
  }

  if (!classroom) {
    return <p className="text-center text-gray-500 mt-10">Loading classroom...</p>;
  }

  return (
    <div className="min-h-screen bg-white text-black px-6 py-10 flex justify-center">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header - description box */}
        <Card className="border border-gray-300 shadow-sm">
          <CardHeader className="text-left space-y-3">
            <CardTitle className="text-3xl font-semibold">{classroom.title}</CardTitle>
            <p className="text-gray-700 max-w-2xl">{classroom.description}</p>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">Instructor:</span> {classroom.instructor}
              </p>
              <div className="flex items-center gap-3">
                <p>
                  <span className="font-semibold">Class Code:</span>{" "}
                  <span className="bg-gray-100 border px-3 py-1 rounded-md text-black">
                    {classroom.classCode}
                  </span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-400 text-gray-800 hover:bg-gray-200"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-1" /> {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-4 border-b border-gray-300 pb-2">
          {["stream", "assignments", "chat", "people"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              className={`capitalize ${
                activeTab === tab
                  ? "bg-black text-white hover:bg-gray-800"
                  : "text-gray-800 border-gray-400 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "stream" && (
            <Card className="border border-gray-300 h-[550px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800">Class Stream</CardTitle>
              </CardHeader>

              <CardContent className="overflow-y-auto flex-1 space-y-6 pr-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 border border-gray-200 rounded-md hover:shadow-sm transition-all duration-150"
                  >
                    <p className="text-sm font-semibold text-gray-800 text-left">{post.title}</p>
                    <p className="text-xs text-gray-600 mt-1 text-left">{post.content}</p>

                    {/* Comments for this post */}
                    <div className="mt-4">
                      <p className="font-semibold text-gray-800 text-left mb-2">Comments</p>
                      <div className="space-y-3 max-h-32 overflow-y-auto pr-1">
                        {post.comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 border border-gray-200 rounded-md text-left hover:bg-gray-50 transition"
                          >
                            <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{c.text}</p>
                          </div>
                        ))}
                        {post.comments.length === 0 && (
                          <p className="text-xs text-gray-500 italic">No comments yet</p>
                        )}
                      </div>

                      {/* Add Comment for this post */}
                      <div className="flex items-center mt-3 gap-2">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={post.newComment}
                          onChange={(e) =>
                            setPosts((prev) =>
                              prev.map((p) =>
                                p.id === post.id ? { ...p, newComment: e.target.value } : p
                              )
                            )
                          }
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddComment(post.id)}
                          className="bg-black text-white hover:bg-gray-800"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "assignments" && (
            <Card className="border border-gray-300 p-6 text-center text-gray-600">
              No assignments yet.
            </Card>
          )}

          {activeTab === "chat" && (
            <Card className="border border-gray-300 p-6 text-center text-gray-600">
              Chat feature coming soon.
            </Card>
          )}

          {activeTab === "people" && (
            <Card className="border border-gray-300 p-6 text-center text-gray-600">
              No students enrolled yet.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
