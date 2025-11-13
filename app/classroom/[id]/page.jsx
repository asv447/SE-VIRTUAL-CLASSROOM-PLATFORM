"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Copy, Plus, Link as LinkIcon, Trash2, Pencil, FileText, Download, Upload, X } from "lucide-react";
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
import { formatFileSize } from "@/lib/utils-client";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
// [DELETED] All socket.io imports are gone

const MAX_POLL_OPTIONS = 6;

const sortStreamPosts = (posts) => {
  if (!Array.isArray(posts)) {
    return [];
  }

  return [...posts].sort((a, b) => {
    const aPinned = a?.isPinned ? 1 : 0;
    const bPinned = b?.isPinned ? 1 : 0;

    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }

    const aDate = new Date(a?.createdAt || 0).getTime();
    const bDate = new Date(b?.createdAt || 0).getTime();

    return bDate - aDate;
  });
};

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
  isPinned: false,
  file: null, // NEW: for file attachment
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
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostData, setEditPostData] = useState(createInitialPostState);
  const [editingPollOptionIds, setEditingPollOptionIds] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false); // NEW: upload state
  const fileInputRef = useRef(null); // NEW: for file input

  // [NEW] Chat state (back to simple version)
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [chatInput, setChatInput] = useState(""); // NEW: chat input state
  const [pollSelections, setPollSelections] = useState({});
  const [pollSubmitting, setPollSubmitting] = useState({});
  const messagesEndRef = useRef(null); // For auto-scrolling chat

  const [assignments, setAssignments] = useState([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  // Inline deadline edit state (per-assignment)
  const [editingDeadline, setEditingDeadline] = useState({}); // { [assignmentId]: true|false }
  const [deadlineInputs, setDeadlineInputs] = useState({});   // { [assignmentId]: 'YYYY-MM-DDTHH:mm' }
  const DynamicWhiteboard = dynamic(() => import("@/components/whiteboard/WhiteboardViewer"), {
    ssr: false,
  });
  const wbInputRef = useRef(null);

  // Whiteboard state (per-course)
  const [wbSelectedFile, setWbSelectedFile] = useState(null); // local PDF File
  const [wbCurrentFile, setWbCurrentFile] = useState(null);   // { fileUrl, fileName, _id }
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

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
      // API returns { classroom }
      setClassroom(data.classroom || null);
    } catch (err) {
      console.error("Failed to fetch classroom:", err);
      setError("Failed to load classroom");
    } finally {
      // no-op for assignments here
    }
  };

  // Fetch stream posts for this class
  const fetchStreamPosts = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/stream?classId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch stream posts");
      const posts = await res.json();
      setStreamPosts(sortStreamPosts(Array.isArray(posts) ? posts : []));
    } catch (err) {
      console.error("Error fetching stream posts:", err);
      setStreamPosts([]);
    }
  };

  // Fetch chat messages for this class
  const fetchChatMessages = async () => {
    if (!id) return;
    setIsChatLoading(true);
    try {
      const res = await fetch(`/api/chat?classId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch chat messages");
      const msgs = await res.json();
      setChatMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
      setChatMessages([]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Fetch assignments for this class
  const fetchAssignments = async () => {
    if (!id) return;
    setIsAssignmentsLoading(true);
    try {
      const res = await fetch(`/api/assignments?classId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const list = await res.json();
      setAssignments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setAssignments([]);
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  // Helpers for deadline editing
  const toLocalDatetimeInput = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch (_) {
      return "";
    }
  };

  const startEditDeadline = (assignmentId, existing) => {
    setEditingDeadline((p) => ({ ...p, [assignmentId]: true }));
    setDeadlineInputs((p) => ({ ...p, [assignmentId]: toLocalDatetimeInput(existing) }));
  };

  const cancelEditDeadline = (assignmentId) => {
    setEditingDeadline((p) => ({ ...p, [assignmentId]: false }));
    setDeadlineInputs((p) => ({ ...p, [assignmentId]: "" }));
  };

  const saveDeadline = async (assignmentId) => {
    const newVal = deadlineInputs[assignmentId];
    if (!newVal) {
      toast.error("Please select a deadline");
      return;
    }
    const loadingId = toast.loading("Saving deadline...");
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: newVal }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update deadline");
      }
      toast.success("Deadline updated", { id: loadingId });
      setEditingDeadline((p) => ({ ...p, [assignmentId]: false }));
      // refresh list
      fetchAssignments();
    } catch (e) {
      console.error("Update deadline error:", e);
      toast.error(e.message || "Failed to update deadline", { id: loadingId });
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
    }, [id, user, activeTab]);
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
  // Whiteboard helpers
  const openLocalPdfForWhiteboard = () => {
    if (!wbSelectedFile) return toast.error("Please choose a PDF to edit");
    const url = URL.createObjectURL(wbSelectedFile);
    setWbCurrentFile({ fileUrl: url, fileName: wbSelectedFile.name, _id: `local-${Date.now()}` });
    setIsWhiteboardOpen(true);
  };

  const handleWbFileChange = (e) => {
    const f = e?.target?.files?.[0];
    if (f && f.type === "application/pdf") {
      setWbSelectedFile(f);
    } else if (f) {
      toast.error("Please select a PDF file");
      setWbSelectedFile(null);
    }
  };

  const closeWhiteboard = () => {
    try {
      if (wbCurrentFile && String(wbCurrentFile._id).startsWith("local-")) {
        URL.revokeObjectURL(wbCurrentFile.fileUrl);
      }
    } catch (_) {}
    setIsWhiteboardOpen(false);
    setWbCurrentFile(null);
  };

  const handleWhiteboardSave = async (payload, filename) => {
    console.log('handleWhiteboardSave called', { payload, filename });
    // The WhiteboardViewer now uploads directly to /api/announcements
    // This handler just needs to close and refresh
    try {
      closeWhiteboard();
      // Refresh stream to show the new announcement
      await fetchStreamPosts();
      setWbSelectedFile(null);
      toast.success("Announcement posted successfully!");
    } catch (e) {
      console.error("Whiteboard save failed:", e);
      toast.error("Failed to refresh announcements");
    }
  };

  const handleCopy = () => {
    if (classroom?.courseCode) {
      navigator.clipboard.writeText(classroom.courseCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // NEW: Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (50MB limit for Google Drive)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 50MB limit");
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not allowed. Please upload PDF, DOCX, PPTX, or images.");
      return;
    }

    setNewPostData({ ...newPostData, file });
  };

  // NEW: Remove selected file
  const handleRemoveFile = () => {
    setNewPostData({ ...newPostData, file: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    const linkUrl = (newPostData.linkUrl || "").trim();
    const linkText = (newPostData.linkText || "").trim();
    const loadingToastId = toast.loading("Creating post...");

    // NEW: Upload file to Google Drive if present
    let attachmentData = null;
    if (newPostData.file) {
      try {
        setIsUploadingFile(true);
        toast.loading("Uploading file to Google Drive...", { id: loadingToastId });
        
        const formData = new FormData();
        formData.append('file', newPostData.file);
        
        const uploadResponse = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Upload failed');
        }
        
        const uploadResult = await uploadResponse.json();
        attachmentData = {
          fileId: uploadResult.file.fileId,
          fileName: uploadResult.file.fileName,
          fileSize: uploadResult.file.fileSize,
          contentType: uploadResult.file.contentType,
          viewLink: uploadResult.file.viewLink,
          downloadLink: uploadResult.file.downloadLink,
        };
        
        toast.loading("Creating post...", { id: loadingToastId });
      } catch (error) {
        console.error("File upload error:", error);
        toast.error(`File upload failed: ${error.message}`, { id: loadingToastId });
        setIsUploadingFile(false);
        return;
      } finally {
        setIsUploadingFile(false);
      }
    }

    const optimisticPost = {
      id: `temp-${Date.now()}`,
      classId: id,
      title: newPostData.title,
      content: newPostData.content,
      isImportant: newPostData.isImportant,
      isUrgent: newPostData.isUrgent,
      link: linkUrl ? { url: linkUrl, text: linkText || "View Link" } : null,
      attachment: attachmentData, // NEW: include attachment
      createdAt: new Date().toISOString(),
      author: { name: username, id: user.uid },
      comments: [],
      isPinned: newPostData.isPinned,
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
    setStreamPosts((prev) => sortStreamPosts([optimisticPost, ...prev]));
    setIsCreatePostOpen(false);
    setNewPostData(createInitialPostState());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    try {
      const response = await fetch("/api/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id, authorId: user.uid, title: newPostData.title,
          content: newPostData.content, isImportant: newPostData.isImportant,
          isUrgent: newPostData.isUrgent,
          link: linkUrl ? { url: linkUrl, text: linkText || "View Link" } : null,
          attachment: attachmentData, // NEW: send attachment data
          isPinned: newPostData.isPinned,
          poll: pollPayload,
        }),
      });
      if (!response.ok) throw new Error("Failed to save post");
      toast.success("Post created!", { id: loadingToastId });
      fetchStreamPosts();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: loadingToastId });
      setStreamPosts((prev) =>
        sortStreamPosts(prev.filter((p) => (p._id ?? p.id) !== optimisticPost.id))
      );
    }
  };

  const resetEditState = () => {
    setEditingPostId(null);
    setEditPostData(createInitialPostState());
    setEditingPollOptionIds([]);
  };

  const handleEditDialogChange = (open) => {
    if (!open) {
      resetEditState();
    }
    setIsEditPostOpen(open);
  };

  const handleOpenEditPost = (post) => {
    if (!post) return;

    const pid = (post._id ?? post.id)?.toString?.();
    if (!pid) return;

    const baseState = createInitialPostState();
    baseState.title = post.title || "";
    baseState.content = post.content || "";
    baseState.isImportant = !!post.isImportant;
    baseState.isUrgent = !!post.isUrgent;
    baseState.isPinned = !!post.isPinned;
    baseState.linkUrl = post.link?.url || "";
    baseState.linkText = post.link?.text || "";

    const hasPoll = Boolean(post.poll);
    baseState.includePoll = hasPoll;
    baseState.pollQuestion = hasPoll ? post.poll?.question || "" : "";
    baseState.allowMultiplePollSelections = hasPoll ? !!post.poll?.allowMultiple : false;

    if (hasPoll) {
      const existingOptions = (post.poll?.options || []).slice(0, MAX_POLL_OPTIONS);
      const sanitizedOptions = existingOptions.map((option) =>
        typeof option?.text === "string" ? option.text : ""
      );
      while (sanitizedOptions.length < 2) {
        sanitizedOptions.push("");
      }
      baseState.pollOptions = sanitizedOptions.length ? sanitizedOptions : ["", ""];

      const optionIds = existingOptions.map((option) => option?.id || null);
      while (optionIds.length < baseState.pollOptions.length) {
        optionIds.push(null);
      }
      setEditingPollOptionIds(optionIds);
    } else {
      baseState.pollOptions = ["", ""];
      setEditingPollOptionIds([]);
    }

    setEditingPostId(pid);
    setEditPostData(baseState);
    setIsEditPostOpen(true);
  };

  const addEditPollOption = () => {
    if (editPostData.pollOptions.length >= MAX_POLL_OPTIONS) return;

    setEditPostData((prev) => ({
      ...prev,
      pollOptions: [...prev.pollOptions, ""],
    }));
    setEditingPollOptionIds((prev) => [...prev, null]);
  };

  const removeEditPollOption = (index) => {
    if (editPostData.pollOptions.length <= 2) return;

    setEditPostData((prev) => ({
      ...prev,
      pollOptions: prev.pollOptions.filter((_, optionIndex) => optionIndex !== index),
    }));
    setEditingPollOptionIds((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleUpdatePost = async () => {
    if (!editingPostId || !user) return;

    const title = editPostData.title.trim();
    const content = editPostData.content.trim();

    if (!title || !content) {
      toast.error("Title and Content are required.");
      return;
    }

    const pollQuestion = editPostData.includePoll ? editPostData.pollQuestion.trim() : "";
    const trimmedOptions = editPostData.includePoll
      ? editPostData.pollOptions.map((option) => option.trim()).filter(Boolean)
      : [];

    if (editPostData.includePoll) {
      if (!pollQuestion) {
        toast.error("Poll question is required.");
        return;
      }

      if (trimmedOptions.length < 2) {
        toast.error("Add at least two poll options.");
        return;
      }
    }

    const linkUrl = (editPostData.linkUrl || "").trim();
    const linkText = (editPostData.linkText || "").trim();

    const pollPayload = editPostData.includePoll
      ? {
          question: pollQuestion,
          allowMultiple: editPostData.allowMultiplePollSelections,
          options: editPostData.pollOptions
            .map((option, index) => ({
              id: editingPollOptionIds[index] || null,
              text: option.trim(),
            }))
            .filter((option) => option.text),
        }
      : null;

    const updatesPayload = {
      title,
      content,
      isImportant: !!editPostData.isImportant,
      isUrgent: !!editPostData.isUrgent,
      isPinned: !!editPostData.isPinned,
      link: linkUrl ? { url: linkUrl, text: linkText || "View Link" } : null,
      poll: pollPayload,
    };

    const loadingId = toast.loading("Updating post...");

    try {
      const res = await fetch("/api/stream", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: editingPostId,
          requesterId: user.uid,
          classId: id,
          updates: updatesPayload,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update post");
      }

      toast.success("Post updated", { id: loadingId });
      setIsEditPostOpen(false);
      resetEditState();
      fetchStreamPosts();
    } catch (error) {
      console.error("Error updating stream post:", error);
      toast.error(error.message || "Failed to update post", { id: loadingId });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!postId || !user) return;

    const pid = postId.toString();
    const initialPosts = [...streamPosts];
    const loadingId = toast.loading("Deleting post...");

    setStreamPosts((prev) =>
      sortStreamPosts(
        prev.filter((candidate) => {
          const candidateId = (candidate._id ?? candidate.id)?.toString();
          return candidateId !== pid;
        })
      )
    );

    try {
      const res = await fetch("/api/stream", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: pid,
          classId: id,
          requesterId: user.uid,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete post");
      }

      toast.success("Post deleted", { id: loadingId });
      if (editingPostId === pid) {
        setIsEditPostOpen(false);
        resetEditState();
      }
      fetchStreamPosts();
    } catch (error) {
      console.error("Error deleting stream post:", error);
      toast.error(error.message || "Failed to delete post", { id: loadingId });
      setStreamPosts(sortStreamPosts(initialPosts));
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
              {/* Whiteboard quick editor for this course */}
              <Card className="border border-gray-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Whiteboard</CardTitle>
                  <CardDescription>Edit a PDF and post as an announcement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      id="wb-course-pdf"
                      ref={wbInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleWbFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => wbInputRef.current && wbInputRef.current.click()}
                    >
                      Choose PDF
                    </Button>
                    <Button onClick={openLocalPdfForWhiteboard} disabled={!wbSelectedFile}>
                      Open in Whiteboard
                    </Button>
                    {wbSelectedFile && (
                      <span className="text-sm text-gray-600 truncate">{wbSelectedFile.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
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

                      {/* NEW: File Upload Section */}
                      <div className="grid gap-2 border-t border-gray-200 pt-4">
                        <Label htmlFor="post-file">Attach File (Optional)</Label>
                        <p className="text-xs text-gray-500 mb-2">
                          Upload course materials, lecture notes, PDFs, DOCX files (max 15MB)
                        </p>
                        
                        {!newPostData.file ? (
                          <div className="flex gap-2">
                            <input
                              id="post-file"
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Choose File
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{newPostData.file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(newPostData.file.size)}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveFile}
                              className="ml-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-2">
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
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="post-pinned"
                            checked={newPostData.isPinned}
                            onCheckedChange={(checked) =>
                              setNewPostData({ ...newPostData, isPinned: checked })
                            }
                          />
                          <Label htmlFor="post-pinned">Pin to top</Label>
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
                        <Button variant="outline" disabled={isUploadingFile}>Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleCreatePost} disabled={isUploadingFile}>
                        {isUploadingFile ? "Uploading..." : "Post"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {isInstructor && (
                <Dialog open={isEditPostOpen} onOpenChange={handleEditDialogChange}>
                  <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Announcement</DialogTitle>
                      <DialogDescription>
                        Make updates to your announcement. Changes will be visible to everyone immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-post-title">Title</Label>
                        <Input
                          id="edit-post-title"
                          placeholder="e.g., Updated schedule"
                          value={editPostData.title}
                          onChange={(e) =>
                            setEditPostData((prev) => ({ ...prev, title: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-post-content">Content</Label>
                        <Textarea
                          id="edit-post-content"
                          placeholder="Share your updates..."
                          className="min-h-[120px]"
                          value={editPostData.content}
                          onChange={(e) =>
                            setEditPostData((prev) => ({ ...prev, content: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-post-link-url">Link URL (Optional)</Label>
                          <Input
                            id="edit-post-link-url"
                            placeholder="https://example.com"
                            value={editPostData.linkUrl}
                            onChange={(e) =>
                              setEditPostData((prev) => ({ ...prev, linkUrl: e.target.value }))
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-post-link-text">Link Text (Optional)</Label>
                          <Input
                            id="edit-post-link-text"
                            placeholder="e.g., View Resource"
                            value={editPostData.linkText}
                            onChange={(e) =>
                              setEditPostData((prev) => ({ ...prev, linkText: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-post-important"
                            checked={editPostData.isImportant}
                            onCheckedChange={(checked) =>
                              setEditPostData((prev) => ({ ...prev, isImportant: checked }))
                            }
                          />
                          <Label htmlFor="edit-post-important">Important</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-post-urgent"
                            checked={editPostData.isUrgent}
                            onCheckedChange={(checked) =>
                              setEditPostData((prev) => ({ ...prev, isUrgent: checked }))
                            }
                          />
                          <Label htmlFor="edit-post-urgent">Urgent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-post-pinned"
                            checked={editPostData.isPinned}
                            onCheckedChange={(checked) =>
                              setEditPostData((prev) => ({ ...prev, isPinned: checked }))
                            }
                          />
                          <Label htmlFor="edit-post-pinned">Pin to top</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                        <div>
                          <Label htmlFor="edit-include-poll" className="font-medium">Include poll</Label>
                          <p className="text-xs text-gray-500">Edit or remove the poll attached to this announcement.</p>
                        </div>
                        <Switch
                          id="edit-include-poll"
                          checked={editPostData.includePoll}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const currentLength = editPostData.pollOptions.length;
                              setEditPostData((prev) => ({
                                ...prev,
                                includePoll: true,
                                pollOptions: prev.pollOptions.length >= 2 ? prev.pollOptions : ["", ""],
                              }));
                              setEditingPollOptionIds((prev) => {
                                const next = [...prev];
                                const targetLength = Math.min(
                                  MAX_POLL_OPTIONS,
                                  Math.max(2, currentLength || 0)
                                );
                                while (next.length < targetLength) {
                                  next.push(null);
                                }
                                return next.length ? next : [null, null];
                              });
                            } else {
                              setEditPostData((prev) => ({
                                ...prev,
                                includePoll: false,
                                pollQuestion: "",
                                pollOptions: ["", ""],
                                allowMultiplePollSelections: false,
                              }));
                              setEditingPollOptionIds([]);
                            }
                          }}
                        />
                      </div>

                      {editPostData.includePoll && (
                        <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-poll-question">Poll question</Label>
                            <Input
                              id="edit-poll-question"
                              placeholder="e.g., Which topic should we review?"
                              value={editPostData.pollQuestion}
                              onChange={(e) =>
                                setEditPostData((prev) => ({
                                  ...prev,
                                  pollQuestion: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Options</Label>
                            {editPostData.pollOptions.map((option, index) => (
                              <div key={`${index}-${editingPollOptionIds[index] || "new"}`} className="flex items-center gap-2">
                                <Input
                                  placeholder={`Option ${index + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    setEditPostData((prev) => {
                                      const nextOptions = [...prev.pollOptions];
                                      nextOptions[index] = e.target.value;
                                      return { ...prev, pollOptions: nextOptions };
                                    })
                                  }
                                />
                                {editPostData.pollOptions.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEditPollOption(index)}
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
                              onClick={addEditPollOption}
                              disabled={editPostData.pollOptions.length >= MAX_POLL_OPTIONS}
                            >
                              Add option
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="edit-poll-allow-multiple">Allow multiple selections</Label>
                              <p className="text-xs text-gray-500">Let students pick more than one answer.</p>
                            </div>
                            <Switch
                              id="edit-poll-allow-multiple"
                              checked={editPostData.allowMultiplePollSelections}
                              onCheckedChange={(checked) =>
                                setEditPostData((prev) => ({
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
                      <Button onClick={handleUpdatePost}>Save changes</Button>
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
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <span className="block font-semibold text-gray-800">
                              {post.author?.name || "Unknown"}
                            </span>
                            <span className="text-sm text-gray-500">{createdAt}</span>
                          </div>
                          {isInstructor && pid && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                aria-label="Edit announcement"
                                onClick={() => handleOpenEditPost(post)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                    aria-label="Delete announcement"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. The announcement and any poll data will be permanently removed for everyone in the class.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePost(pid)}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>

                        {/* Post Title & Badges */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{post.title}</h3>
                          {post.isPinned && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-medium">
                              PINNED
                            </span>
                          )}
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

                        {/* Post Link (e.g., annotated PDF) */}
                        {post.link?.url && (
                          <div className="mb-3">
                            <a
                              href={post.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {post.link.text || 'Annotated Material'}
                            </a>
                          </div>
                        )}

                        {/* NEW: File Attachment Display */}
                        {post.attachment && post.attachment.fileId && (
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-blue-900 truncate">
                                    {post.attachment.fileName || "Course Material"}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {post.attachment.fileSize ? formatFileSize(post.attachment.fileSize) : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={post.attachment.viewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Open
                                  </a>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={post.attachment.downloadLink}
                                    download={post.attachment.fileName}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Notes (from whiteboard) shown separately */}
                        {post.notesText && post.notesText.trim() !== '' && (
                          <div className="mb-3 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-left">
                            <div className="text-xs font-semibold text-yellow-800 mb-1">Notes</div>
                            <pre className="whitespace-pre-wrap break-words text-sm text-yellow-900">{post.notesText}</pre>
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
              <Card className="border border-gray-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Assignments</CardTitle>
                  <CardDescription>Course assignments and deadlines</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAssignmentsLoading && <p>Loading assignments...</p>}
                  {!isAssignmentsLoading && assignments.length === 0 && (
                    <p className="text-gray-600">No assignments available.</p>
                  )}
                  {!isAssignmentsLoading && assignments.length > 0 && (
                    <div className="space-y-4">
                      {assignments
                        .filter((a) => String(a.classId || a.courseId) === String(id))
                        .map((a) => (
                        <div key={a.id} className="border rounded-md p-4 hover:shadow-sm transition">
                          <button
                            className="font-semibold text-lg text-left text-blue-700 hover:underline"
                            onClick={() => window.location.href = `/assignments`}
                            title="Open assignments page"
                          >
                            {a.title}
                          </button>
                          {a.description && (
                            <p className="text-sm text-gray-700 mt-1">{a.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">Deadline: {a.deadline ? new Date(a.deadline).toLocaleString() : 'No deadline'}</p>
                          {isInstructor && (
                            <div className="mt-2">
                              {!editingDeadline[a.id] ? (
                                <Button variant="outline" size="sm" onClick={() => startEditDeadline(a.id, a.deadline)}>Edit Deadline</Button>
                              ) : (
                                <div className="flex items-center gap-2 mt-2">
                                  <Input
                                    type="datetime-local"
                                    value={deadlineInputs[a.id] || ''}
                                    onChange={(e) => setDeadlineInputs((p) => ({ ...p, [a.id]: e.target.value }))}
                                  />
                                  <Button size="sm" onClick={() => saveDeadline(a.id)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => cancelEditDeadline(a.id)}>Cancel</Button>
                                </div>
                              )}
                            </div>
                          )}
                          {a.fileUrl && (
                            <div className="mt-3">
                              <Button variant="outline" size="sm" asChild>
                                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">Download File</a>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                          <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-semibold mx-2 shrink-0">
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
        {/* Mount the Whiteboard modal when opened */}
        {isWhiteboardOpen && wbCurrentFile && (
          <DynamicWhiteboard
            pdfUrl={wbCurrentFile.fileUrl}
            onSave={handleWhiteboardSave}
            onClose={closeWhiteboard}
            classId={id}
            authorId={user?.uid}
            authorName={username}
          />
        )}
      </div>
    </div>
  );
}
