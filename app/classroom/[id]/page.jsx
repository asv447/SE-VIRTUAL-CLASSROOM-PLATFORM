"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Copy, Plus, Link as LinkIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { auth } from "../../../lib/firebase"; // Corrected path
import { onAuthStateChanged } from "firebase/auth";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
// [DELETED] All socket.io imports are gone

const MAX_POLL_OPTIONS = 6;

const createInitialPostState = () => ({
  title: "",
  content: "",
  linkUrl: "",
  linkText: "",
  isImportant: false,
  isUrgent: false,
  includePoll: false,
  pollQuestion: "",
  pollOptions: ["", ""],
  allowMultiplePollSelections: false,
});

export default function ClassroomPage() {
  const { id } = useParams(); // This is the Course ID
  const [classroom, setClassroom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("stream");

  // User state
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("Student");
  const [isInstructor, setIsInstructor] = useState(false);

  // Stream state
  const [streamPosts, setStreamPosts] = useState([]);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPostData, setNewPostData] = useState(createInitialPostState);

  // [NEW] Chat state (back to simple version)
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [pollSelections, setPollSelections] = useState({});
  const [pollSubmitting, setPollSubmitting] = useState({});
  const messagesEndRef = useRef(null); // For auto-scrolling chat

  const [assignments, setAssignments] = useState([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);

  // --- Data Fetching ---

  // Get user role and name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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

  // Fetch classroom details
  const fetchClassroom = async () => {
    try {
      const res = await fetch(`/api/classroom/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load classroom");
      setClassroom(data.classroom);
    } catch (err) {
      console.error("Error fetching classroom:", err);
      setError("Failed to load classroom details.");
    }
  };

  // Fetch stream posts
  const fetchStreamPosts = async () => {
    try {
      const res = await fetch(`/api/stream?classId=${id}`);
      if (!res.ok) {
        console.error("fetchStreamPosts failed", await res.text());
        return setStreamPosts([]);
      }
      const data = await res.json();
      setStreamPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching stream posts:", err);
      setStreamPosts([]);
    }
  };

  // Fetch chat messages
  const fetchChatMessages = async () => {
    if (!id) return;
    setIsChatLoading(true);
    try {
      const res = await fetch(`/api/chat?classId=${id}`);
      if (!res.ok) {
        throw new Error("Failed to load chat");
      }
      const data = await res.json();
      setChatMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching chat:", err);
      toast.error(err.message);
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!id) return;
    setIsAssignmentsLoading(true);
    try {
      const res = await fetch(`/api/assignments?classId=${id}`);
      if (!res.ok) {
        setAssignments([]);
        return;
      }
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setAssignments([]);
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  // Main useEffect to fetch data based on tab
  useEffect(() => {
    if (!id || !user) return; // Wait for user and id

    // Fetch classroom details (always needed)
    fetchClassroom();

    if (activeTab === "stream") {
      fetchStreamPosts();
    } else if (activeTab === "chat") {
      fetchChatMessages();
    } else if (activeTab === "assignments") {
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, activeTab]); // Re-run when tab, user, or class ID changes

  // [NEW] useEffect for chat polling (auto-refresh)
  useEffect(() => {
    if (activeTab === 'chat' && id) {
      // Fetch messages every 10 seconds
      const interval = setInterval(fetchChatMessages, 10000);

      // Clear interval on cleanup
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  // useEffect for auto-scrolling chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!user) {
      setPollSelections({});
      setPollSubmitting({});
      return;
    }

    setPollSelections((prev) => {
      const next = { ...prev };
      streamPosts.forEach((post) => {
        if (!post.poll) return;
        const pid = (post._id ?? post.id)?.toString();
        if (!pid) return;
        const serverSelections = (post.poll.options || [])
          .filter((option) => (option.voterIds || []).includes(user.uid))
          .map((option) => option.id);

        if (prev[pid] === undefined || prev[pid].length === 0) {
          next[pid] = serverSelections;
        }
      });
      return next;
    });
  }, [streamPosts, user]);

  // --- Handlers ---

  const handleCopy = () => {
    if (classroom?.courseCode) {
      navigator.clipboard.writeText(classroom.courseCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handler for creating a new advanced post (stream)
  const handleCreatePost = async () => {
    if (!newPostData.title.trim() || !newPostData.content.trim() || !user) {
      toast.error("Title and Content are required.");
      return;
    }

    const pollQuestion = newPostData.includePoll
      ? newPostData.pollQuestion.trim()
      : "";
    const pollOptions = newPostData.includePoll
      ? newPostData.pollOptions.map((option) => option.trim()).filter(Boolean)
      : [];

    if (newPostData.includePoll) {
      if (!pollQuestion) {
        toast.error("Poll question is required.");
        return;
      }

      if (pollOptions.length < 2) {
        toast.error("Add at least two poll options.");
        return;
      }
    }

    const pollPayload = newPostData.includePoll
      ? {
          question: pollQuestion,
          allowMultiple: newPostData.allowMultiplePollSelections,
          options: pollOptions.map((text) => ({ text })),
        }
      : null;

  const loadingToastId = toast.loading("Creating post...");
    const optimisticPost = {
      id: `temp-${Date.now()}`,
      classId: id,
      title: newPostData.title,
      content: newPostData.content,
      isImportant: newPostData.isImportant,
      isUrgent: newPostData.isUrgent,
      link: newPostData.linkUrl ? { url: newPostData.linkUrl, text: newPostData.linkText || "View Link" } : null,
      createdAt: new Date().toISOString(),
      author: { name: username, id: user.uid },
      comments: [],
      poll: pollPayload
        ? {
            question: pollPayload.question,
            allowMultiple: pollPayload.allowMultiple,
            options: pollOptions.map((text, index) => ({
              id: `temp-${Date.now()}-${index}`,
              text,
              voterIds: [],
            })),
          }
        : null,
    };
  setStreamPosts((prev) => [optimisticPost, ...prev]);
    setIsCreatePostOpen(false);
    setNewPostData(createInitialPostState());
    try {
      const response = await fetch("/api/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id, authorId: user.uid, title: newPostData.title,
          content: newPostData.content, isImportant: newPostData.isImportant,
          isUrgent: newPostData.isUrgent,
          link: newPostData.linkUrl ? { url: newPostData.linkUrl, text: newPostData.linkText || "View Link" } : null,
          poll: pollPayload,
        }),
      });
      if (!response.ok) throw new Error("Failed to save post");
      toast.success("Post created!", { id: loadingToastId });
      fetchStreamPosts();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: loadingToastId });
      setStreamPosts((prev) => prev.filter((p) => (p._id ?? p.id) !== optimisticPost.id));
    }
  };

  // Handler for submitting a new comment
  const handleCommentSubmit = async (e, post) => {
    if (e.key !== "Enter" || !user) return;
    const text = e.target.value.trim();
    if (!text) return;
    const postId = post._id ?? post.id;
    if (!postId) return console.error("Missing post id");
    const newComment = {
      _id: `temp-${Date.now()}`,
      author: { name: user.username, id: user.uid },
      text, createdAt: new Date().toISOString(),
    };
    setStreamPosts((prevStreamPosts) =>
      prevStreamPosts.map((p) => {
        const pId = p._id ?? p.id;
        if (pId === postId) {
          return { ...p, comments: [...(p.comments || []), newComment] };
        }
        return p;
      })
    );
    e.target.value = "";
    try {
      const res = await fetch("/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId.toString(),
          author: { name: user.username, id: user.uid }, text,
        }),
      });
      if (!res.ok) throw new Error("Failed to save comment");
      fetchStreamPosts();
    } catch (err) {
      console.error("Error sending comment:", err);
      toast.error("Error sending comment.");
      fetchStreamPosts();
    }
  };

  // [NEW] Handler for sending a new chat message
  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || !user) return;

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      classId: id,
      text: text,
      createdAt: new Date().toISOString(),
      author: {
        name: user.username,
        id: user.uid,
      },
    };

    // Optimistic update
    setChatMessages([...chatMessages, optimisticMessage]);
    setChatInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id,
          author: { id: user.uid, name: user.username },
          text: text,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // On success, refetch to sync
      fetchChatMessages();

    } catch (err) {
      console.error("Error sending chat message:", err);
      toast.error(err.message);
      // Rollback
      setChatMessages(chatMessages.filter(m => m.id !== optimisticMessage.id));
    }
  };

  const handlePollOptionToggle = (postId, optionId, allowMultiple) => {
    setPollSelections((prev) => {
      const current = prev[postId] || [];
      let nextSelection = [];

      if (allowMultiple) {
        nextSelection = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      } else {
        nextSelection = [optionId];
      }

      return { ...prev, [postId]: nextSelection };
    });
  };

  const handlePollSubmit = async (post) => {
    if (!user) {
      toast.error("You need to sign in to vote.");
      return;
    }

    const pid = (post._id ?? post.id)?.toString();
    if (!pid) return;

    const selections = pollSelections[pid] || [];
    if (!selections.length) {
      toast.error("Select at least one option.");
      return;
    }

    setPollSubmitting((prev) => ({ ...prev, [pid]: true }));

    try {
      console.log("Submitting poll vote", { postId: pid, selections });
      const res = await fetch("/api/stream/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: pid,
          userId: user.uid,
          selectedOptionIds: selections,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to submit vote");
      }

      const payload = await res.json().catch(() => ({}));

      if (payload?.poll) {
        setStreamPosts((prev) =>
          prev.map((p) => {
            const currentId = (p._id ?? p.id)?.toString();
            if (currentId === pid) {
              return {
                ...p,
                poll: {
                  ...p.poll,
                  ...payload.poll,
                },
              };
            }
            return p;
          })
        );
      }

      toast.success("Vote saved");
      setPollSelections((prev) => ({ ...prev, [pid]: selections }));
      fetchStreamPosts();
    } catch (err) {
      console.error("Error submitting poll vote:", err);
      toast.error(err.message);
    } finally {
      setPollSubmitting((prev) => ({ ...prev, [pid]: false }));
    }
  };

  const addPollOption = () => {
    setNewPostData((prev) => {
      if (prev.pollOptions.length >= MAX_POLL_OPTIONS) return prev;
      return { ...prev, pollOptions: [...prev.pollOptions, ""] };
    });
  };

  const removePollOption = (index) => {
    setNewPostData((prev) => {
      if (prev.pollOptions.length <= 2) return prev;
      return {
        ...prev,
        pollOptions: prev.pollOptions.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  };

  // --- Render Logic ---

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
              className={`capitalize ${activeTab === tab
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
              {/* "Create Post" Dialog for instructors */}
              {isInstructor && (
                <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-16 border-gray-300 text-gray-600 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create a new post...
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Post</DialogTitle>
                      <DialogDescription>
                        Make an announcement or post to your class.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="post-title">Title</Label>
                        <Input
                          id="post-title"
                          placeholder="e.g., Welcome to Class!"
                          value={newPostData.title}
                          onChange={(e) =>
                            setNewPostData({ ...newPostData, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="post-content">Content</Label>
                        <Textarea
                          id="post-content"
                          placeholder="What's on your mind?"
                          className="min-h-[120px]"
                          value={newPostData.content}
                          onChange={(e) =>
                            setNewPostData({ ...newPostData, content: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="post-link-url">Link URL (Optional)</Label>
                          <Input
                            id="post-link-url"
                            placeholder="https://example.com"
                            value={newPostData.linkUrl}
                            onChange={(e) =>
                              setNewPostData({ ...newPostData, linkUrl: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="post-link-text">Link Text (Optional)</Label>
                          <Input
                            id="post-link-text"
                            placeholder="e.g., View Resource"
                            value={newPostData.linkText}
                            onChange={(e) =>
                              setNewPostData({ ...newPostData, linkText: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="post-important"
                            checked={newPostData.isImportant}
                            onCheckedChange={(checked) =>
                              setNewPostData({ ...newPostData, isImportant: checked })
                            }
                          />
                          <Label htmlFor="post-important">Important</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="post-urgent"
                            checked={newPostData.isUrgent}
                            onCheckedChange={(checked) =>
                              setNewPostData({ ...newPostData, isUrgent: checked })
                            }
                          />
                          <Label htmlFor="post-urgent">Urgent</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                        <div>
                          <Label htmlFor="include-poll" className="font-medium">Include poll</Label>
                          <p className="text-xs text-gray-500">Collect responses alongside your announcement.</p>
                        </div>
                        <Switch
                          id="include-poll"
                          checked={newPostData.includePoll}
                          onCheckedChange={(checked) =>
                            setNewPostData((prev) =>
                              checked
                                ? { ...prev, includePoll: true }
                                : {
                                    ...prev,
                                    includePoll: false,
                                    pollQuestion: "",
                                    pollOptions: ["", ""],
                                    allowMultiplePollSelections: false,
                                  }
                            )
                          }
                        />
                      </div>

                      {newPostData.includePoll && (
                        <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                          <div className="grid gap-2">
                            <Label htmlFor="poll-question">Poll question</Label>
                            <Input
                              id="poll-question"
                              placeholder="e.g., Which topic should we review?"
                              value={newPostData.pollQuestion}
                              onChange={(e) =>
                                setNewPostData((prev) => ({
                                  ...prev,
                                  pollQuestion: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Options</Label>
                            {newPostData.pollOptions.map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  placeholder={`Option ${index + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    setNewPostData((prev) => {
                                      const nextOptions = [...prev.pollOptions];
                                      nextOptions[index] = e.target.value;
                                      return { ...prev, pollOptions: nextOptions };
                                    })
                                  }
                                />
                                {newPostData.pollOptions.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePollOption(index)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addPollOption}
                              disabled={newPostData.pollOptions.length >= MAX_POLL_OPTIONS}
                            >
                              Add option
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="poll-allow-multiple">Allow multiple selections</Label>
                              <p className="text-xs text-gray-500">Give students the option to select more than one response.</p>
                            </div>
                            <Switch
                              id="poll-allow-multiple"
                              checked={newPostData.allowMultiplePollSelections}
                              onCheckedChange={(checked) =>
                                setNewPostData((prev) => ({
                                  ...prev,
                                  allowMultiplePollSelections: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleCreatePost}>Post</Button>
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
                  {streamPosts.map((post, index) => {
                    const rawId = post._id ?? post.id;
                    const pid = typeof rawId === "string" ? rawId : rawId?.toString?.();
                    const createdAt = post.createdAt ? new Date(post.createdAt).toLocaleString() : "";
                    return (
                      <div
                        key={pid || `post-${index}`}
                        className="border border-gray-200 rounded-md p-4 hover:shadow-sm transition"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">
                            {post.author?.name || "Unknown"}
                          </span>
                          <span className="text-sm text-gray-500">{createdAt}</span>
                        </div>

                        {/* Post Title & Badges */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{post.title}</h3>
                          {(post.type === "assignment" || post.assignmentRef) && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                              ASSIGNMENT
                            </span>
                          )}
                          {post.isImportant && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              IMPORTANT
                            </span>
                          )}
                          {post.isUrgent && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              URGENT
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3 text-left">{post.content}</p>

                        {/* Post Link */}
                        {post.link?.url && (
                          <div className="mb-3">
                            <a
                              href={post.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {post.link.text || post.link.url}
                            </a>
                          </div>
                        )}

                        {post.poll && post.poll.options && post.poll.options.length > 0 && (
                          <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3">
                              <p className="font-semibold text-gray-800">{post.poll.question}</p>
                              <p className="text-xs text-gray-500">
                                {post.poll.allowMultiple
                                  ? "Select all options that apply."
                                  : "Select one option."}
                              </p>
                            </div>

                            {(() => {
                              const pidString = pid;
                              if (!pidString) {
                                return (
                                  <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500">
                                    Poll responses will be available once this post finishes syncing.
                                  </div>
                                );
                              }
                              const pollOptions = post.poll?.options || [];
                              const selectedIds = (pollSelections[pidString] || []).map(String);
                              const totalSelections = pollOptions.reduce(
                                (sum, option) => sum + (option.voterIds?.length || 0),
                                0
                              );
                              const participantIds = new Set();
                              pollOptions.forEach((option) => {
                                (option.voterIds || []).forEach((voterId) => participantIds.add(voterId));
                              });
                              const participantCount = participantIds.size;
                              const hasVoted = user ? participantIds.has(user.uid) : false;
                              const allowMultipleSelections = Boolean(post.poll?.allowMultiple);
                              const buttonDisabled = !selectedIds.length || pollSubmitting[pidString];

                              const selectionSummary = totalSelections === 0
                                ? "No votes yet"
                                : allowMultipleSelections
                                  ? `${totalSelections} selection${totalSelections === 1 ? "" : "s"} • ${participantCount} participant${participantCount === 1 ? "" : "s"}`
                                  : `${totalSelections} vote${totalSelections === 1 ? "" : "s"}`;

                              return (
                                <div className="space-y-3">
                                  {pollOptions.map((option) => {
                                    const optionVotes = option.voterIds?.length || 0;
                                    const percentage = totalSelections
                                      ? Math.round((optionVotes / totalSelections) * 100)
                                      : 0;
                                    const isSelected = selectedIds.includes(option.id);

                                    return (
                                      <div
                                        key={option.id}
                                        className={`rounded-md border bg-white px-3 py-2 transition ${
                                          isSelected ? "border-black shadow-sm" : "border-gray-200"
                                        }`}
                                      >
                                        <label className="flex items-center gap-3 text-sm text-gray-800">
                                          <input
                                            type={allowMultipleSelections ? "checkbox" : "radio"}
                                            name={`poll-${pidString}`}
                                            checked={isSelected}
                                            onChange={() => handlePollOptionToggle(pidString, option.id, allowMultipleSelections)}
                                            className="h-4 w-4"
                                          />
                                          <span>{option.text}</span>
                                        </label>
                                        <div className="mt-2">
                                          <Progress value={percentage} />
                                          <div className="mt-1 flex justify-between text-xs text-gray-500">
                                            <span>{optionVotes} vote{optionVotes === 1 ? "" : "s"}</span>
                                            <span>{percentage}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                                    <span>{selectionSummary}</span>
                                    {user && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handlePollSubmit(post)}
                                        disabled={buttonDisabled}
                                      >
                                        {pollSubmitting[pidString]
                                          ? "Saving..."
                                          : hasVoted
                                            ? "Update Vote"
                                            : "Submit Vote"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Post-specific comments */}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                            {(post.comments || []).length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No comments yet</p>
                            ) : (
                              (post.comments || []).map((c, idx) => (
                                <div key={c._id || idx} className="text-left">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {c.author?.name || c.author || "Unknown"}
                                  </p>
                                  <p className="text-xs text-gray-600">{c.text}</p>
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
            <div className="space-y-4">
              {isAssignmentsLoading ? (
                <Card className="border border-gray-300 p-6 text-center text-gray-600">
                  Loading assignments...
                </Card>
              ) : assignments.length === 0 ? (
                <Card className="border border-gray-300 p-6 text-center text-gray-600">
                  No assignments yet.
                </Card>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a) => {
                    const deadline = a.deadline ? new Date(a.deadline).toLocaleString() : null;
                    const idKey = a._id || a.id;
                    return (
                      <div key={idKey} className="border border-gray-200 rounded-md p-4 text-left">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-800">{a.title}</h3>
                          {deadline && (
                            <span className="text-sm text-gray-500">Due: {deadline}</span>
                          )}
                        </div>
                        {a.description && (
                          <p className="text-gray-700 mt-1">{a.description}</p>
                        )}
                        {a.fileUrl && (
                          <div className="mt-2">
                            <a
                              href={a.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Download attachment
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {activeTab === "chat" && (
            <Card className="border border-gray-300">
              <CardContent className="p-0 flex flex-col" style={{ height: "600px" }}>

                {/* Chat Message List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isChatLoading ? (
                    <p className="text-center text-gray-500">Loading chat...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.author.id === user?.uid ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`flex items-end max-w-xs md:max-w-md ${msg.author.id === user?.uid ? "flex-row-reverse" : "flex-row"
                            }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-semibold mx-2 flex-shrink-0">
                            {msg.author.name ? msg.author.name[0].toUpperCase() : "?"}
                          </div>
                          <div
                            className={`p-3 rounded-lg ${msg.author.id === user?.uid
                              ? "bg-black text-white"
                              : "bg-gray-200 text-black"
                              }`}
                          >
                            <span className="text-xs font-semibold block mb-1">
                              {msg.author.name || "Unknown"}
                            </span>
                            <p className="text-sm">{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Box */}
                <div className="border-t border-gray-300 p-4 bg-white">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={handleSendChatMessage}
                  >
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 border-gray-300 focus:ring-gray-400"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <Button
                      type="submit"
                      className="bg-black text-white hover:bg-gray-800"
                      disabled={!chatInput.trim()}
                    >
                      Send
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PEOPLE */}
          {activeTab === "people" && (
            <div className="space-y-6">
              <Card className="border border-gray-300">
                <CardHeader>
                  <CardTitle className="text-xl">Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center text-lg font-semibold">
                      {classroom.instructorName ? classroom.instructorName[0].toUpperCase() : "I"}
                    </div>
                    <span className="font-medium text-gray-800">
                      {classroom.instructorName}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-300">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Classmates ({classroom.students?.length || 0})
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
