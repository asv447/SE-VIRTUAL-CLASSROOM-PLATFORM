"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy } from "lucide-react";

/**
 * Classroom page
 * - loads classroom details
 * - fetches stream posts from /api/stream?classId=<id>
 * - allows adding comments to each post by pressing Enter
 */

export default function ClassroomPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("stream");

  // Stream posts from /api/stream?classId=<id>
  const [streamPosts, setStreamPosts] = useState([]);

  // fetch classroom details
  const fetchClassroom = async () => {
    try {
      // [FIXED] Use 'id' from useParams(), not 'course._id'
      const res = await fetch(`/api/classroom/${id}`); 
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load classroom");
      setClassroom(data.classroom);
    } catch (err) {
      console.error("Error fetching classroom:", err);
      setError("Failed to load classroom details.");
    }
  };

  // fetch stream posts for this classroom
  const fetchStreamPosts = async () => {
    try {
      const res = await fetch(`/api/stream?classId=${id}`);
      if (!res.ok) {
        console.error("fetchStreamPosts failed", await res.text());
        return setStreamPosts([]);
      }
      const data = await res.json();
      // Expect data to be an array of posts
      setStreamPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching stream posts:", err);
      setStreamPosts([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchClassroom();
    fetchStreamPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCopy = () => {
    if (classroom?.classCode) {
      navigator.clipboard.writeText(classroom.classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Submit comment when user presses Enter inside a post input
  // optimistic update + send to /api/comments
  const handleCommentSubmit = async (e, post) => {
    if (e.key !== "Enter") return;
    const text = e.target.value.trim();
    if (!text) return;

    // resolve post id - different APIs return either _id or id
    const postId = post._id ?? post.id;
    if (!postId) return console.error("Missing post id");

    // optimistic update
    setStreamPosts((prev) =>
      prev.map((p) =>
        (p._id === post._id || p.id === post.id)
          ? { ...p, comments: [...(p.comments || []), { author: "You", text, createdAt: new Date().toISOString() }] }
          : p
      )
    );

    // clear input UI (we'll clear the specific input by removing its value)
    e.target.value = "";

    // send to backend
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId.toString(),
          author: "You",
          text,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Failed to save comment:", body);
        // Optionally: refetch the posts to get canonical data
        fetchStreamPosts();
      }
    } catch (err) {
      console.error("Error sending comment:", err);
      // Optionally: refetch
      fetchStreamPosts();
    }
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
        {/* Header - description box (left-aligned) */}
        <Card className="border border-gray-300 shadow-sm">
          <CardHeader className="text-left space-y-3">
            <CardTitle className="text-3xl font-semibold">{classroom.title}</CardTitle>
            <p className="text-gray-700 max-w-2xl">{classroom.description}</p>

            <div className="text-sm text-gray-700 space-y-1">
              <p>
                {/* [FIXED] Use the 'instructor' field from the API response */}
                <span className="font-semibold">Instructor:</span> {classroom.instructor}
              </p>

              <div className="flex items-center gap-3">
                <p>
                  <span className="font-semibold">Class Code:</span>{" "}
                  {/* [FIXED] Use the 'classCode' field from the API response */}
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
          {/* STREAM */}
          {activeTab === "stream" && (
            <div>
              {streamPosts.length === 0 ? (
                <Card className="border border-gray-300 p-6 text-center text-gray-600">
                  No posts yet.
                </Card>
              ) : (
                <div className="space-y-4">
                  {streamPosts.map((post) => {
                    // handle id field name
                    const pid = post._id ?? post.id;
                    const createdAt = post.createdAt ? new Date(post.createdAt).toLocaleString() : "";
                    return (
                      <div
                        key={pid}
                        className="border border-gray-200 rounded-md p-4 hover:shadow-sm transition"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">
                            {post.author?.name ?? post.author?.username ?? post.author ?? "Unknown"}
                          </span>
                          <span className="text-sm text-gray-500">{createdAt}</span>
                        </div>

                        <p className="text-gray-700 mb-3 text-left">{post.content}</p>

                        {/* Post-specific comments */}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                            {(post.comments || []).length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No comments yet</p>
                            ) : (
                              (post.comments || []).map((c, idx) => (
                                <div key={idx} className="text-left">
                                  <p className="text-sm font-semibold text-gray-800">{c.author ?? c.name}</p>
                                  <p className="text-xs text-gray-600">{c.text}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* add comment input (press Enter) */}
                          <input
                            type="text"
                            placeholder="Add class comment..."
                            className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                            onKeyDown={(e) => handleCommentSubmit(e, post)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ASSIGNMENTS */}
          {activeTab === "assignments" && (
            <Card className="border border-gray-300 p-6 text-center text-gray-600">
              No assignments yet.
            </Card>
          )}

          {/* CHAT */}
          {activeTab === "chat" && (
            <Card className="border border-gray-300 p-6 text-center text-gray-600">
              Chat feature coming soon.
            </Card>
          )}

          {/* PEOPLE */}
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

