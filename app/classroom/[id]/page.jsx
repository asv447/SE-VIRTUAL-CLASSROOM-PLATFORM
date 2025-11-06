"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy, Link as LinkIcon } from "lucide-react"; // [NEW] Import LinkIcon
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// [NEW] Imports for the advanced post form
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge"; // [NEW] Import Badge

export default function ClassroomPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("stream");

  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("Student");
  const [isInstructor, setIsInstructor] = useState(false);

  const [streamPosts, setStreamPosts] = useState([]);

  // [NEW] State for the advanced post form
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // ... (fetchClassroom, fetchStreamPosts, and auth useEffect are all perfect, no changes) ...
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

  // [MAJOR UPDATE] This function now collects all form data
  const handleCreatePost = async () => {
    const postContentTrimmed = postContent.trim();
    const postTitleTrimmed = postTitle.trim();

    if (!postContentTrimmed || !postTitleTrimmed || !user) {
      toast.error("Title and Content are required to make a post.");
      return;
    }
    
    // 1. Create the new post for the UI immediately (Optimistic Update)
    const optimisticPost = {
      id: `temp-${Date.now()}`,
      classId: id,
      title: postTitleTrimmed, // [NEW]
      content: postContentTrimmed,
      isImportant: isImportant, // [NEW]
      isUrgent: isUrgent, // [NEW]
      link: linkUrl.trim() ? { url: linkUrl.trim(), text: linkText.trim() || "View Link" } : null, // [NEW]
      createdAt: new Date().toISOString(),
      author: {
        name: username,
        id: user.uid,
      },
      comments: [],
    };

    // 2. Add it to the top of the stream
    setStreamPosts([optimisticPost, ...streamPosts]);
    
    // 3. Reset form and close dialog
    setPostTitle("");
    setPostContent("");
    setIsImportant(false);
    setIsUrgent(false);
    setLinkUrl("");
    setLinkText("");
    setIsPostDialogOpen(false);

    // 4. Send the *real* data to the database
    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id,
          authorId: user.uid,
          title: postTitleTrimmed,
          content: postContentTrimmed,
          isImportant: isImportant,
          isUrgent: isUrgent,
          link: optimisticPost.link, // Send the link object
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }
      
      toast.success("Post created!");
      fetchStreamPosts(); // This will replace the temp post with the real one
    
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      // If it fails, roll back the optimistic update
      setStreamPosts(streamPosts.filter(p => p.id !== optimisticPost.id));
    }
  };

  // ... (handleCommentSubmit is perfect, no changes) ...
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
        p._id === post._id || p.id === post.id
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
    return (
      <p className="text-center text-gray-500 mt-10">Loading classroom...</p>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black px-6 py-10 flex justify-center">
      <div className="w-full max-w-5xl space-y-8">
        {/* ... (Header Card is fine, no changes) ... */}
        <Card className="border border-gray-300 shadow-sm">
          <CardHeader className="text-left space-y-3">
            <CardTitle className="text-3xl font-semibold">
              {classroom.title}
            </CardTitle>
            <p className="text-gray-700 max-w-2xl">{classroom.description}</p>

            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">Instructor:</span>{" "}
                {classroom.instructorName}
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
                  <Copy className="w-4 h-4 mr-1" />{" "}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* ... (Tab Buttons are fine, no changes) ... */}
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
              {/* [MAJOR UPDATE] "Create Post" card replaced with a Dialog */}
              {isInstructor && (
                <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-20 text-left justify-start p-4 border-gray-300 shadow-sm text-gray-500 hover:bg-gray-50"
                    >
                      Announce something to your class, {username}...
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl bg-white text-black">
                    <DialogHeader>
                      <DialogTitle>Create New Post</DialogTitle>
                      <DialogDescription>
                        Make an announcement or create a new assignment link.
                      </DialogDescription>
                    </DialogHeader>
                    {/* New advanced form */}
                    <div className="grid gap-6 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="post-title" className="text-left">Title</Label>
                        <Input
                          id="post-title"
                          placeholder="e.g., New Assignment or Welcome!"
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="post-content" className="text-left">Content</Label>
                        <Textarea
                          id="post-content"
                          placeholder="What's on your mind?"
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          className="min-h-[120px] border-gray-300"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="link-url" className="text-left">Link URL (Optional)</Label>
                          <Input
                            id="link-url"
                            placeholder="https://google-drive-link.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="border-gray-300"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="link-text" className="text-left">Link Text (Optional)</Label>
                          <Input
                            id="link-text"
                            placeholder="e.g., View Assignment 1"
                            value={linkText}
                            onChange={(e) => setLinkText(e.target.value)}
                            className="border-gray-300"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isImportant"
                            checked={isImportant}
                            onCheckedChange={setIsImportant}
                          />
                          <Label htmlFor="isImportant">Important</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isUrgent"
                            checked={isUrgent}
                            onCheckedChange={setIsUrgent}
                          />
                          <Label htmlFor="isUrgent">Urgent</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsPostDialogOpen(false)}
                        className="text-black border-gray-400"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreatePost}
                        disabled={!postTitle.trim() || !postContent.trim()}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        Post
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Stream Posts List */}
              {streamPosts.length === 0 ? (
                <Card className="border border-gray-300 p-6 text-center text-gray-600">
                  No posts yet.
                </Card>
              ) : (
                <div className="space-y-4">
                  {streamPosts.map((post) => {
                    const pid = post._id ?? post.id;
                    const createdAt = post.createdAt
                      ? new Date(post.createdAt).toLocaleString()
                      : "";
                    return (
                      <div
                        key={pid}
                        className="border border-gray-200 rounded-md p-4 hover:shadow-sm transition"
                      >
                        {/* [NEW] Updated Post Header */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {post.title || "Post"}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {post.author?.name || "Unknown"} • {createdAt}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {post.isUrgent && (
                              <Badge variant="destructive">URGENT</Badge>
                            )}
                            {post.isImportant && (
                              <Badge className="bg-yellow-500 text-black">
                                IMPORTANT
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-700 mb-3 text-left">
                          {post.content}
                        </p>
                        
                        {/* [NEW] Show Link Button */}
                        {post.link?.url && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              asChild
                              className="border-gray-400 text-gray-800 hover:bg-gray-200"
                            >
                              <a href={post.link.url} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="w-4 h-4 mr-2" />
                                {post.link.text || "View Link"}
                              </a>
                            </Button>
                          </div>
                        )}

                        {/* ... (Comment section is perfect, no changes) ... */}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                            {(post.comments || []).length === 0 ? (
                              <p className="text-sm text-gray-500 italic">
                                No comments yet
                              </p>
                            ) : (
                              (post.comments || []).map((c, idx) => (
                                <div key={idx} className="text-left">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {c.author?.name || c.author || "Unknown"}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {c.text}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>

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

          {/* ... (People tab is perfect from last time, no changes) ... */}
          {activeTab === "people" && (
            <div className="space-y-6">
              {/* Instructor List */}
              <Card className="border border-gray-300">
                <CardHeader>
                  <CardTitle className="text-xl">Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center text-lg font-semibold">
                      {classroom.instructorName
                        ? classroom.instructorName[0].toUpperCase()
                        : "I"}
                    </div>
                    <span className="font-medium text-gray-800">
                      {classroom.instructorName}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Student List */}
              <Card className="border border-gray-300">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Students ({classroom.students?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!classroom.students || classroom.students.length === 0 ? (
                    <p className="text-gray-600">No students enrolled yet.</p>
                  ) : (
                    classroom.students.map((student) => (
                      <div key={student.userId} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-500 text-white flex items-center justify-center text-lg font-semibold">
                          {student.name ? student.name[0].toUpperCase() : "S"}
                        </div>
                        <span className="font-medium text-gray-800">
                          {student.name}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

