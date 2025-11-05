"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea"; // [NEW] Import Textarea
import { toast } from "sonner"; // [NEW] Import toast
import { auth } from "../../../lib/firebase"; // [NEW] Import auth (fixed path)
import { onAuthStateChanged } from "firebase/auth"; // [NEW] Import onAuthStateChanged

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

  // [NEW] State for logged-in user
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("Student");
  const [isInstructor, setIsInstructor] = useState(false);

  // Stream posts from /api/stream?classId=<id>
  const [streamPosts, setStreamPosts] = useState([]);
  const [postContent, setPostContent] = useState(""); // [NEW] State for new post input

  // fetch classroom details
  const fetchClassroom = async () => {
    try {
      // [FIX] Use `id` from params, not `course._id`
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

  // [NEW] Get user role and name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user data from MongoDB API to get role
        try {
          const res = await fetch(`/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            setUsername(data.user.username || "User");
            setIsInstructor(data.user.role === "instructor");
          }
        } catch (err) {
          console.error("Error fetching user details:", err);
        }
      } else {
        setUser(null);
        setUsername("Student");
        setIsInstructor(false);
      }
    });
    return () => unsubscribe();
  }, []);

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

  // [NEW] Function to create a new post
  const handleCreatePost = async () => {
    if (!postContent.trim() || !user) return;

    const postContentTrimmed = postContent.trim();

    // 1. Create the new post for the UI immediately (Optimistic Update)
    const optimisticPost = {
      id: `temp-${Date.now()}`, // Temporary ID
      classId: id,
      content: postContentTrimmed,
      createdAt: new Date().toISOString(),
      author: {
        name: username, // Use the 'username' from state
        id: user.uid,
      },
      comments: [],
    };

    // 2. Add it to the top of the stream
    setStreamPosts([optimisticPost, ...streamPosts]);
    setPostContent("");

    // 3. Send the *real* data to the database
    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id,
          authorId: user.uid, // The API expects authorId
          content: postContentTrimmed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }
      
      // On success, re-fetch to get the real data from DB
      toast.success("Post created!");
      fetchStreamPosts(); // This will replace the temp post with the real one
    
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      // If it fails, roll back the optimistic update
      setStreamPosts(streamPosts.filter(p => p.id !== optimisticPost.id));
    }
  };


  // Submit comment when user presses Enter inside a post input
  // optimistic update + send to /api/comments
  const handleCommentSubmit = async (e, post) => {
    if (e.key !== "Enter" || !user) return;
    const text = e.target.value.trim();
    if (!text) return;

    // resolve post id - different APIs return either _id or id
    const postId = post._id ?? post.id;
    if (!postId) return console.error("Missing post id");

    // [FIX] optimistic update with new comment object
    const newComment = {
      author: { name: username }, // [FIX] Use the username from state
      text,
      createdAt: new Date().toISOString(),
    };

    setStreamPosts((prev) =>
      prev.map((p) =>
        (p._id === post._id || p.id === post.id)
          ? { ...p, comments: [...(p.comments || []), newComment] }
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
          author: { name: username, id: user.uid }, // Send the author object
          text,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Failed to save comment:", body);
        toast.error("Failed to save comment.");
        // Rollback on failure
        fetchStreamPosts();
      }
    } catch (err) {
      console.error("Error sending comment:", err);
      toast.error("Error sending comment.");
      // Rollback on failure
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
                <span className="font-semibold">Instructor:</span> {classroom.instructorName}
              </p>

              <div className="flex items-center gap-3">
                <p>
                  <span className="font-semibold">Class Code:</span>{" "}
                  <span className="bg-gray-100 border px-3 py-1 rounded-md text-black">
                    {classroom.courseCode}
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
            <div className="space-y-4">
              {/* [NEW] "Create Post" card for instructors */}
              {isInstructor && (
                <Card className="border border-gray-300 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Create a new post</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder={`Announce something to your class, ${username}...`}
                      className="min-h-[80px] border-gray-300 focus:ring-gray-400"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleCreatePost}
                        disabled={!postContent.trim()}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stream Posts List */}
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
                            {/* [FIX] Safer render for author name, prevents crash */}
                            {post.author?.name || "Unknown"}
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
                                  <p className="text-sm font-semibold text-gray-800">
                                    {/* [FIX] Safer render for comment author */}
                                    {c.author?.name || c.author || "Unknown"}
                                  </p>
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

