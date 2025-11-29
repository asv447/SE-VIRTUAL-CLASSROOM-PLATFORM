'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Copy, Plus, Link as LinkIcon, Trash2, Pencil, Search, Users, UserPlus } from "lucide-react";
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
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import Link from "next/link";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import { formatFileSize } from "@/lib/client-utils";

const MAX_POLL_OPTIONS = 6;
const MATERIAL_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MATERIAL_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MATERIAL_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

const isAllowedMaterialFile = (file) => {
  if (!file) return false;
  if (file.type && MATERIAL_MIME_TYPES.has(file.type)) {
    return true;
  }
  const lowerName = (file.name || "").toLowerCase();
  return MATERIAL_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
};

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
  audienceType: "class",
  audienceGroupId: null,
  allowMultiplePollSelections: false,
  isPinned: false,
  materialFiles: [],
});

// --- Create Group Dialog ---
const CreateGroupDialog = ({
  open,
  onOpenChange,
  onSubmit,
  classroom,
  newGroupData,
  setNewGroupData,
}) => {
  const students = classroom?.students || [];

  const handleMemberToggle = (checked, userId) => {
    setNewGroupData((prev) => {
      const newMemberIds = new Set(prev.memberIds);
      let nextRepresentativeId = prev.representativeId;
      if (checked) {
        newMemberIds.add(userId);
      } else {
        newMemberIds.delete(userId);
        if (nextRepresentativeId === userId) {
          nextRepresentativeId = "";
        }
      }
      return {
        ...prev,
        representativeId: nextRepresentativeId,
        memberIds: newMemberIds,
      };
    });
  };

  const handleRepChange = (userId) => {
    setNewGroupData((prev) => {
      const newMemberIds = new Set(prev.memberIds);
      newMemberIds.add(userId);
      return {
        ...prev,
        representativeId: userId,
        memberIds: newMemberIds,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., Project Group A"
              value={newGroupData.name}
              onChange={(e) =>
                setNewGroupData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Group Representative</Label>
            <Select
              value={newGroupData.representativeId}
              onValueChange={handleRepChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a representative" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.userId} value={student.userId}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Group Members</Label>
            <Card className="max-h-[250px] overflow-y-auto p-4">
              <div className="space-y-3">
                {students.map((student) => {
                  const isRep =
                    student.userId === newGroupData.representativeId;
                  return (
                    <div
                      key={student.userId}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`member-${student.userId}`}
                        checked={
                          newGroupData.memberIds.has(student.userId) || isRep
                        }
                        disabled={isRep}
                        onCheckedChange={(checked) =>
                          handleMemberToggle(checked, student.userId)
                        }
                      />
                      <Label
                        htmlFor={`member-${student.userId}`}
                        className="font-normal"
                      >
                        {student.name}{" "}
                        {isRep && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            (Rep)
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Edit Group Dialog ---
const EditGroupDialog = ({ open, onOpenChange, group, classroom, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({ name: "", representativeId: "", memberIds: new Set() });
  const students = classroom?.students || [];

  useEffect(() => {
    if (group && open) {
      setFormData({
        name: group.name || "",
        representativeId: group.representative?.userId || "",
        memberIds: new Set(group.members?.map(m => m.userId) || []),
      });
    }
  }, [group, open]);

  const handleMemberToggle = (checked, userId) => {
    setFormData((prev) => {
      const newMemberIds = new Set(prev.memberIds);
      let nextRepresentativeId = prev.representativeId;
      if (checked) {
        newMemberIds.add(userId);
      } else {
        newMemberIds.delete(userId);
        if (nextRepresentativeId === userId) nextRepresentativeId = "";
      }
      return { ...prev, representativeId: nextRepresentativeId, memberIds: newMemberIds };
    });
  };

  const handleRepChange = (userId) => {
    setFormData((prev) => {
      const newMemberIds = new Set(prev.memberIds);
      newMemberIds.add(userId);
      return { ...prev, representativeId: userId, memberIds: newMemberIds };
    });
  };

  const handleSubmit = () => {
    onUpdate(group._id, formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Group: {group?.name}</DialogTitle>
          <DialogDescription>Modify group details, members, or delete the group.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto">
          <div className="grid gap-2">
            <Label>Group Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Representative</Label>
            <Select value={formData.representativeId} onValueChange={handleRepChange}>
              <SelectTrigger><SelectValue placeholder="Select Rep" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.userId} value={s.userId}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Members</Label>
            <Card className="max-h-[200px] overflow-y-auto p-4">
              <div className="space-y-2">
                {students.map((student) => {
                  const isRep = student.userId === formData.representativeId;
                  return (
                    <div key={student.userId} className="flex items-center space-x-2">
                      <Checkbox checked={formData.memberIds.has(student.userId) || isRep} disabled={isRep} onCheckedChange={(c) => handleMemberToggle(c, student.userId)} />
                      <Label className="font-normal">{student.name} {isRep && "(Rep)"}</Label>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center w-full gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" type="button"><Trash2 className="w-4 h-4 mr-2" />Delete Group</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. All group posts will remain but loose their group tag.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(group._id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function ClassroomPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classroom, setClassroom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return ['stream', 'assignments', 'chat', 'people'].includes(tabFromUrl) ? tabFromUrl : 'stream';
  });

  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("Student");
  const [isInstructor, setIsInstructor] = useState(false);

  // Group Management State
  const [groups, setGroups] = useState([]);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: "",
    representativeId: "",
    memberIds: new Set(),
  });

  // Selected Group for Editing
  const [selectedGroup, setGroup] = useState(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);

  const [streamPosts, setStreamPosts] = useState([]);
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPostData, setNewPostData] = useState(() =>
    createInitialPostState()
  );
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostData, setEditPostData] = useState(() =>
    createInitialPostState()
  );
  const [editingPollOptionIds, setEditingPollOptionIds] = useState([]);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [pollSelections, setPollSelections] = useState({});
  const [pollSubmitting, setPollSubmitting] = useState({});
  const messagesEndRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState({});
  const [deadlineInputs, setDeadlineInputs] = useState({});

  const DynamicWhiteboard = dynamic(
    () => import("@/components/whiteboard/WhiteboardViewer"),
    { ssr: false }
  );
  const wbInputRef = useRef(null);
  const materialInputRef = useRef(null);

  const [wbSelectedFile, setWbSelectedFile] = useState(null);
  const [wbCurrentFile, setWbCurrentFile] = useState(null);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  const isSearchingAnnouncements = announcementSearch.trim().length > 0;
  const visibleStreamPosts = useMemo(() => {
    const term = announcementSearch.trim().toLowerCase();
    if (!term) {
      return streamPosts;
    }

    return streamPosts.filter((post) => {
      const postType =
        post?.type || (post?.assignmentRef ? "assignment" : "announcement");
      if (postType !== "announcement") {
        return false;
      }

      const values = [
        post?.title,
        post?.content,
        post?.author?.name,
        post?.notesText,
        post?.link?.text,
        post?.link?.url,
      ];

      if (Array.isArray(post?.materials)) {
        post.materials.forEach((material) => {
          values.push(material?.fileName);
        });
      }

      return values.some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(term)
      );
    });
  }, [announcementSearch, streamPosts]);
  const hasStreamPosts = streamPosts.length > 0;

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
            // Accept multiple role strings that mean "can edit/manage class/groups"
            const role = (data.user?.role || "").toString().toLowerCase();
            const canEdit = ["instructor", "teacher", "admin"].includes(role);
            setIsInstructor(canEdit);
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
      setClassroom(data.classroom || null);
    } catch (err) {
      console.error("Failed to fetch classroom:", err);
      setError("Failed to load classroom");
    }
  };

  // Fetch groups for this class
  const fetchGroups = async () => {
    if (!id) return;
    setIsGroupsLoading(true);
    try {
      const res = await fetch(`/api/groups?courseId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroups([]);
    } finally {
      setIsGroupsLoading(false);
    }
  };

  // Fetch stream posts for this class
  const fetchStreamPosts = async () => {
    if (!id || !user?.uid) return;
    try {
      const res = await fetch(
        `/api/stream?classId=${encodeURIComponent(id)}`,
        {
          headers: {
            "x-uid": user.uid,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch stream posts");

      const posts = await res.json();
      setStreamPosts(sortStreamPosts(Array.isArray(posts) ? posts : []));
    } catch (err) {
      console.error("Error fetching stream posts:", err);
      setStreamPosts([]);
    }
  };

  // Fetch chat messages for this class
  const fetchChatMessages = async (background = false) => {
    if (!id) return;
    if (!background) setIsChatLoading(true);
    try {
      const res = await fetch(`/api/chat?classId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch chat messages");
      const msgs = await res.json();
      setChatMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
      setChatMessages([]);
    } finally {
      if (!background) setIsChatLoading(false);
    }
  };

  // Fetch assignments for this class
  const fetchAssignments = async () => {
    if (!id) return;
    setIsAssignmentsLoading(true);
    try {
      const role = isInstructor ? "instructor" : "student";
      const userId = user?.uid || "";
      const res = await fetch(
        `/api/assignments?classId=${encodeURIComponent(
          id
        )}&role=${encodeURIComponent(role)}&userId=${encodeURIComponent(
          userId
        )}`
      );
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
    setDeadlineInputs((p) => ({
      ...p,
      [assignmentId]: toLocalDatetimeInput(existing),
    }));
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
      fetchAssignments();
    } catch (e) {
      console.error("Update deadline error:", e);
      toast.error(e.message || "Failed to update deadline", { id: loadingId });
    }
  };

  // Main useEffect to fetch data based on tab
  useEffect(() => {
    if (!id || !user) return;

    fetchClassroom();

    if (activeTab === "stream") {
      fetchStreamPosts();
      fetchGroups();
    } else if (activeTab === "chat") {
      fetchChatMessages();
    } else if (activeTab === "assignments") {
      fetchAssignments();
    } else if (activeTab === "people") {
      fetchGroups();
    }
  }, [id, user, activeTab]);

  // Chat polling
  useEffect(() => {
    if (activeTab === 'chat' && id) {
      // Poll in the background to avoid showing the loading state and
      // avoid janky UI refreshes while the user is reading history.
      const interval = setInterval(() => fetchChatMessages(true), 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, id]);

  // Auto-scrolling chat: only auto-scroll when the user is already
  // near the bottom. This prevents jumping to the bottom while the
  // user is reading earlier messages.
  useEffect(() => {
    const end = messagesEndRef.current;
    if (!end) return;

    const container = end.parentElement;
    if (!container) {
      end.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // distance from bottom in pixels
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const THRESHOLD = 200; // if within 200px of bottom, auto-scroll
    if (distanceFromBottom < THRESHOLD) {
      end.scrollIntoView({ behavior: "smooth" });
    }
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
  const openLocalPdfForWhiteboard = () => {
    if (!wbSelectedFile) return toast.error("Please choose a PDF to edit");
    const url = URL.createObjectURL(wbSelectedFile);
    setWbCurrentFile({
      fileUrl: url,
      fileName: wbSelectedFile.name,
      _id: `local-${Date.now()}`,
    });
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
    } catch (_) { }
    setIsWhiteboardOpen(false);
    setWbCurrentFile(null);
  };

  const handleWhiteboardSave = async (payload, filename) => {
    try {
      closeWhiteboard();
      await fetchStreamPosts();
      setWbSelectedFile(null);
      toast.success("Announcement posted successfully!");
    } catch (e) {
      console.error("Whiteboard save failed:", e);
      toast.error("Failed to refresh announcements");
    }
  };

  const handleMaterialFileChange = (event) => {
    const selectedFiles = Array.from(event?.target?.files || []);
    if (!selectedFiles.length) return;

    const validFiles = [];
    let rejectedCount = 0;

    selectedFiles.forEach((file) => {
      if (isAllowedMaterialFile(file)) {
        validFiles.push(file);
      } else {
        rejectedCount += 1;
      }
    });

    if (rejectedCount > 0) {
      toast.error("Only PDF, DOC, DOCX, or TXT files are supported.");
    }

    if (validFiles.length === 0) {
      if (event?.target) event.target.value = "";
      return;
    }

    setNewPostData((prev) => {
      const existingKeys = new Set(
        prev.materialFiles.map(
          (file) => `${file.name}-${file.size}-${file.lastModified}`
        )
      );
      const deduped = validFiles.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });
      if (!deduped.length) {
        toast.info("Those files are already attached.");
        return prev;
      }
      return {
        ...prev,
        materialFiles: [...prev.materialFiles, ...deduped],
      };
    });

    if (event?.target) event.target.value = "";
  };

  const removeMaterialFile = (index) => {
    setNewPostData((prev) => {
      const nextFiles = [...prev.materialFiles];
      nextFiles.splice(index, 1);
      return { ...prev, materialFiles: nextFiles };
    });
  };

  const clearAllMaterialFiles = () => {
    setNewPostData((prev) => ({ ...prev, materialFiles: [] }));
    if (materialInputRef.current) {
      materialInputRef.current.value = "";
    }
  };

  const handleCopy = () => {
    if (classroom?.courseCode) {
      navigator.clipboard.writeText(classroom.courseCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateGroup = async () => {
    const { name, representativeId, memberIds } = newGroupData;

    if (!name.trim()) {
      return toast.error("Group name is required.");
    }
    if (!representativeId) {
      return toast.error("Please select a group representative.");
    }
    if (memberIds.size === 0) {
      return toast.error("Please select at least one group member.");
    }

    const allStudents = classroom?.students || [];

    const getStudent = (userId) => allStudents.find((s) => s.userId === userId);

    const representative = getStudent(representativeId);
    if (!representative) {
      return toast.error("Representative details not found.");
    }

    const finalMemberIds = new Set(memberIds);
    finalMemberIds.add(representativeId);

    const members = Array.from(finalMemberIds)
      .map(getStudent)
      .filter(Boolean);

    const loadingId = toast.loading("Creating group...");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-uid": user.uid },
        body: JSON.stringify({
          courseId: id,
          name: name.trim(),
          representative: {
            userId: representative.userId,
            name: representative.name,
          },
          members: members.map((m) => ({ userId: m.userId, name: m.name })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create group");
      }

      toast.success("Group created!", { id: loadingId });
      setIsCreateGroupOpen(false);
      setNewGroupData({
        name: "",
        representativeId: "",
        memberIds: new Set(),
      });
      fetchGroups();
    } catch (err) {
      console.error("Create group error:", err);
      toast.error(err.message, { id: loadingId });
    }
  };

  const handleUpdateGroup = async (groupId, updatedData) => {
    if (!updatedData.name.trim()) return toast.error("Group name required");

    const loadingId = toast.loading("Updating group...");

    // Reconstruct full member objects
    const allStudents = classroom?.students || [];
    const rep = allStudents.find(s => s.userId === updatedData.representativeId);
    const finalMemberIds = new Set(updatedData.memberIds); finalMemberIds.add(updatedData.representativeId);
    const members = Array.from(finalMemberIds).map(uid => allStudents.find(s => s.userId === uid)).filter(Boolean);

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-uid": user.uid },
        body: JSON.stringify({
          name: updatedData.name,
          representative: { userId: rep.userId, name: rep.name },
          members: members.map(m => ({ userId: m.userId, name: m.name }))
        })
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Group updated successfully", { id: loadingId });
      setIsEditGroupOpen(false);
      setGroup(null);
      fetchGroups();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update group", { id: loadingId });
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const loadingId = toast.loading("Deleting group...");
    try {
      const res = await fetch(`/api/groups/${groupId}?courseId=${id}`, {
        method: "DELETE",
        headers: { "x-uid": user.uid }
      });
      if (!res.ok) throw new Error("Failed");

      toast.success("Group deleted", { id: loadingId });
      setIsEditGroupOpen(false);
      setGroup(null);
      fetchGroups();
    } catch (e) {
      toast.error("Failed to delete group", { id: loadingId });
    }
  };

  const handleCreatePost = async () => {
    if (!newPostData.title.trim() || !newPostData.content.trim() || !user) {
      toast.error("Title and Content are required.");
      return;
    }

    if (newPostData.audienceType === "group" && !newPostData.audienceGroupId) {
      toast.error("Please select a group to post to.");
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
    const audiencePayload = {
      type: newPostData.audienceType,
      groupId:
        newPostData.audienceType === "group"
          ? newPostData.audienceGroupId
          : null,
    };
    const payload = {
      classId: id,
      authorId: user.uid,
      authorName: username,
      title: newPostData.title,
      content: newPostData.content,
      isImportant: newPostData.isImportant,
      isUrgent: newPostData.isUrgent,
      link: linkUrl ? { url: linkUrl, text: linkText || "View Link" } : null,
      isPinned: newPostData.isPinned,
      poll: pollPayload,
      audience: audiencePayload,
      notesText: "",
      type: "announcement",
    };
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    if (Array.isArray(newPostData.materialFiles)) {
      newPostData.materialFiles.forEach((file) => {
        formData.append("materials", file);
      });
    }
    const optimisticPost = {
      id: `temp-${Date.now()}`,
      classId: id,
      title: newPostData.title,
      content: newPostData.content,
      isImportant: newPostData.isImportant,
      isUrgent: newPostData.isUrgent,
      link: linkUrl ? { url: linkUrl, text: linkText || "View Link" } : null,
      createdAt: new Date().toISOString(),
      author: { name: username, id: user.uid },
      comments: [],
      isPinned: newPostData.isPinned,
      audience: audiencePayload,
      materials: Array.isArray(newPostData.materialFiles)
        ? newPostData.materialFiles.map((file) => ({
          fileName: file.name,
          fileSize: file.size,
        }))
        : [],
      notesText: "",
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

    if (audiencePayload.type === "group" && !audiencePayload.groupId) {
      toast.error("Please select a group to post to.");
      return;
    }
    setStreamPosts((prev) => sortStreamPosts([optimisticPost, ...prev]));
    setIsCreatePostOpen(false);
    setNewPostData(createInitialPostState());
    if (materialInputRef.current) {
      materialInputRef.current.value = "";
    }
    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to save post");
      toast.success("Post created!", { id: loadingToastId });
      fetchStreamPosts();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: loadingToastId });
      setStreamPosts((prev) =>
        sortStreamPosts(
          prev.filter((p) => (p._id ?? p.id) !== optimisticPost.id)
        )
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

    const hasPoll = Array.isArray(post.poll?.options) && post.poll.options.length > 0;

    let baseState = {
      ...createInitialPostState(),
      id: pid,
      title: post.title || "",
      content: post.content || "",
      isImportant: !!post.isImportant,
      isUrgent: !!post.isUrgent,
      isPinned: !!post.isPinned,
      linkUrl: post.link?.url || "",
      linkText: post.link?.text || "",
      audienceType: post.audience?.type || "class",
      audienceGroupId: post.audience?.groupId || (post.audience?.groupIds && post.audience.groupIds[0]) || null,
      includePoll: hasPoll,
      allowMultiplePollSelections: hasPoll ? post.poll.allowMultiple : false,
    };

    if (hasPoll) {
      const existingOptions = (post.poll?.options || []).slice(
        0,
        MAX_POLL_OPTIONS
      );
      const sanitizedOptions = existingOptions.map((option) =>
        typeof option?.text === "string" ? option.text : ""
      );
      while (sanitizedOptions.length < 2) {
        sanitizedOptions.push("");
      }
      baseState.pollOptions = sanitizedOptions.length
        ? sanitizedOptions
        : ["", ""];

      const optionIds = existingOptions.map((option) => option?.id || null);
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
      pollOptions: prev.pollOptions.filter(
        (_, optionIndex) => optionIndex !== index
      ),
    }));
    setEditingPollOptionIds((prev) =>
      prev.filter((_, optionIndex) => optionIndex !== index)
    );
  };

  const handleUpdatePost = async () => {
    if (!editingPostId || !user) return;

    const title = editPostData.title.trim();
    const content = editPostData.content.trim();

    if (!title || !content) {
      toast.error("Title and Content are required.");
      return;
    }

    const pollQuestion = editPostData.includePoll
      ? editPostData.pollQuestion.trim()
      : "";
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

    const pollPayload = editPostData.includePoll
      ? {
        question: pollQuestion,
        allowMultiple: editPostData.allowMultiplePollSelections,
        options: trimmedOptions.map((text, index) => ({
          id: editingPollOptionIds[index] || null,
          text: text,
        })),
      }
      : null;
    const linkUrl = (editPostData.linkUrl || "").trim();
    const linkText = (editPostData.linkText || "").trim();

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
        name: username,
        id: user.uid,
      },
    };

    // Optimistic update
    setChatMessages((prev) => [...prev, optimisticMessage]);
    setChatInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id,
          author: { id: user.uid, name: username },
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
      setChatMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    }
  };

  const handleDeleteChatMessage = async (messageId) => {
    if (!messageId || !user) return;

    const initialMessages = [...chatMessages];
    const loadingId = toast.loading("Deleting message...");

    // Optimistic update
    setChatMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    try {
      const res = await fetch(
        `/api/chat?messageId=${encodeURIComponent(
          messageId
        )}&userId=${encodeURIComponent(user.uid)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete message");
      }

      toast.success("Message deleted", { id: loadingId });
      fetchChatMessages();
    } catch (error) {
      console.error("Error deleting chat message:", error);
      toast.error(error.message || "Failed to delete message", { id: loadingId });
      setChatMessages(initialMessages);
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
        pollOptions: prev.pollOptions.filter(
          (_, optionIndex) => optionIndex !== index
        ),
      };
    });
  };

  // --- Render Logic ---
  if (error) {
    return <p className="text-center text-red-500 mt-10">{error}</p>;
  }

  if (!classroom) {
    return (
      <p className="text-center text-foreground mt-10">Loading classroom...</p>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 flex justify-center bg-background text-foreground">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="text-left space-y-3">
            <CardTitle className="text-3xl font-semibold">
              {classroom.title}
            </CardTitle>
            <p className="text-muted-foreground max-w-2xl">
              {classroom.description}
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-semibold">Instructor:</span>{" "}
                {classroom.instructorName}
              </p>
              <div className="flex items-center gap-3">
                <p>
                  <span className="font-semibold">Class Code:</span>{" "}
                  <span className="bg-muted/30 border px-3 py-1 rounded-md text-foreground">
                    {classroom.courseCode}
                  </span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-none text-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-1" />{" "}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-4 border-b border-border pb-2">
          {["stream", "assignments", "chat", "people"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              className={`capitalize ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground border-none hover:bg-muted/60 hover:text-foreground"
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
              <Card className="border border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-xl">Whiteboard</CardTitle>
                  <CardDescription>
                    Edit a PDF and post as an announcement
                  </CardDescription>
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
                      className="cursor-pointer border-none text-foreground hover:bg-accent hover:text-white"
                      onClick={() =>
                        wbInputRef.current && wbInputRef.current.click()
                      }
                    >
                      Choose PDF
                    </Button>
                    <Button
                      onClick={openLocalPdfForWhiteboard}
                      disabled={!wbSelectedFile}
                    >
                      Open in Whiteboard
                    </Button>
                    {wbSelectedFile && (
                      <span className="text-sm text-muted-foreground truncate">
                        {wbSelectedFile.name}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* "Create Post" Dialog for instructors */}
              {isInstructor && (
                <Dialog
                  open={isCreatePostOpen}
                  onOpenChange={setIsCreatePostOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-16 border-none text-foreground hover:bg-muted/60 hover:text-foreground"
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
                        <Label htmlFor="post-title">
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="post-title"
                          placeholder="e.g., Welcome to Class!"
                          value={newPostData.title}
                          onChange={(e) =>
                            setNewPostData({
                              ...newPostData,
                              title: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="post-content">
                          Content <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="post-content"
                          placeholder="What's on your mind?"
                          className="min-h-[120px]"
                          value={newPostData.content}
                          onChange={(e) =>
                            setNewPostData({
                              ...newPostData,
                              content: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="post-link-url">
                            Link URL (Optional)
                          </Label>
                          <Input
                            id="post-link-url"
                            placeholder="https://example.com"
                            value={newPostData.linkUrl}
                            onChange={(e) =>
                              setNewPostData({
                                ...newPostData,
                                linkUrl: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="post-link-text">
                            Link Text (Optional)
                          </Label>
                          <Input
                            id="post-link-text"
                            placeholder="e.g., View Resource"
                            value={newPostData.linkText}
                            onChange={(e) =>
                              setNewPostData({
                                ...newPostData,
                                linkText: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="post-material">
                          Attach materials (PDF, DOC, DOCX, TXT)
                        </Label>
                        <input
                          id="post-material"
                          ref={materialInputRef}
                          type="file"
                          accept={MATERIAL_ACCEPT}
                          multiple
                          className="hidden"
                          onChange={handleMaterialFileChange}
                        />
                        <div className="rounded-md border border-dashed border-border p-3">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  materialInputRef.current?.click()
                                }
                                className="w-full sm:w-auto border-none bg-primary/5 text-foreground font-semibold hover:bg-primary/15"
                              >
                                Choose Files
                              </Button>
                              {newPostData.materialFiles.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="self-start p-0 text-red-600"
                                  onClick={clearAllMaterialFiles}
                                >
                                  Remove all
                                </Button>
                              )}
                            </div>
                            {newPostData.materialFiles.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Optional. You can attach multiple files; they
                                will be stored securely in the course Drive.
                              </p>
                            ) : (
                              <ul className="space-y-2 text-sm">
                                {newPostData.materialFiles.map((file, idx) => (
                                  <li
                                    key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                                    className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium text-card-foreground truncate">
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="p-0 text-red-600"
                                      onClick={() => removeMaterialFile(idx)}
                                    >
                                      Remove
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 border-t pt-4">
                        <Label>Audience</Label>
                        <RadioGroup
                          value={newPostData.audienceType}
                          onValueChange={(value) =>
                            setNewPostData({
                              ...newPostData,
                              audienceType: value,
                              audienceGroupId: null,
                            })
                          }
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="class" id="r-class" />
                            <Label htmlFor="r-class">Whole Class</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="group" id="r-group" />
                            <Label htmlFor="r-group">Specific Group</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {newPostData.audienceType === "group" && (
                        <div className="grid gap-2">
                          <Label htmlFor="group-select">Select Group</Label>
                          <Select
                            value={newPostData.audienceGroupId}
                            onValueChange={(value) =>
                              setNewPostData({
                                ...newPostData,
                                audienceGroupId: value,
                              })
                            }
                          >
                            <SelectTrigger id="group-select">
                              <SelectValue placeholder="Select a group..." />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.length === 0 ? (
                                <SelectItem disabled>
                                  No groups found.
                                </SelectItem>
                              ) : (
                                groups.map((group) => (
                                  <SelectItem key={group._id} value={group._id}>
                                    {group.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="post-important"
                            checked={newPostData.isImportant}
                            onCheckedChange={(checked) =>
                              setNewPostData({
                                ...newPostData,
                                isImportant: checked,
                              })
                            }
                          />
                          <Label htmlFor="post-important">Important</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="post-urgent"
                            checked={newPostData.isUrgent}
                            onCheckedChange={(checked) =>
                              setNewPostData({
                                ...newPostData,
                                isUrgent: checked,
                              })
                            }
                          />
                          <Label htmlFor="post-urgent">Urgent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="post-pinned"
                            checked={newPostData.isPinned}
                            onCheckedChange={(checked) =>
                              setNewPostData({
                                ...newPostData,
                                isPinned: checked,
                              })
                            }
                          />
                          <Label htmlFor="post-pinned">Pin to top</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                        <div>
                          <Label htmlFor="include-poll" className="font-medium">
                            Include poll
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Collect responses alongside your announcement.
                          </p>
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
                        <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
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
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  placeholder={`Option ${index + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    setNewPostData((prev) => {
                                      const nextOptions = [...prev.pollOptions];
                                      nextOptions[index] = e.target.value;
                                      return {
                                        ...prev,
                                        pollOptions: nextOptions,
                                      };
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
                              disabled={
                                newPostData.pollOptions.length >=
                                MAX_POLL_OPTIONS
                              }
                              className="border-none bg-primary/5 text-foreground font-semibold"
                            >
                              Add option
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="poll-allow-multiple">
                                Allow multiple selections
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Give students the option to select more than one
                                response.
                              </p>
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
                        <Button
                          variant="outline"
                          className="border-none bg-card text-foreground font-semibold hover:bg-muted"
                        >
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        onClick={handleCreatePost}
                        className="bg-primary text-primary-foreground font-semibold shadow-lg"
                      >
                        Post
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex w-full items-center gap-2 sm:max-w-sm">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                      <Input
                        value={announcementSearch}
                        onChange={(e) => setAnnouncementSearch(e.target.value)}
                        placeholder="Search announcements..."
                        className="pl-9"
                      />
                    </div>
                    {announcementSearch && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAnnouncementSearch("")}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {isSearchingAnnouncements && (
                    <span className="text-xs text-muted-foreground">
                      {visibleStreamPosts.length} match
                      {visibleStreamPosts.length === 1 ? "" : "es"}
                    </span>
                  )}
                </div>
              </div>

              {isInstructor && (
                <Dialog
                  open={isEditPostOpen}
                  onOpenChange={handleEditDialogChange}
                >
                  <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Announcement</DialogTitle>
                      <DialogDescription>
                        Make updates to your announcement. Changes will be
                        visible to everyone immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-post-title">
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-post-title"
                          placeholder="e.g., Updated schedule"
                          value={editPostData.title}
                          onChange={(e) =>
                            setEditPostData((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-post-content">
                          Content <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="edit-post-content"
                          placeholder="Share your updates..."
                          className="min-h-[120px]"
                          value={editPostData.content}
                          onChange={(e) =>
                            setEditPostData((prev) => ({
                              ...prev,
                              content: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-post-link-url">
                            Link URL (Optional)
                          </Label>
                          <Input
                            id="edit-post-link-url"
                            placeholder="https://example.com"
                            value={editPostData.linkUrl}
                            onChange={(e) =>
                              setEditPostData((prev) => ({
                                ...prev,
                                linkUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-post-link-text">
                            Link Text (Optional)
                          </Label>
                          <Input
                            id="edit-post-link-text"
                            placeholder="e.g., View Resource"
                            value={editPostData.linkText}
                            onChange={(e) =>
                              setEditPostData((prev) => ({
                                ...prev,
                                linkText: e.target.value,
                              }))
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
                              setEditPostData((prev) => ({
                                ...prev,
                                isImportant: checked,
                              }))
                            }
                          />
                          <Label htmlFor="edit-post-important">Important</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-post-urgent"
                            checked={editPostData.isUrgent}
                            onCheckedChange={(checked) =>
                              setEditPostData((prev) => ({
                                ...prev,
                                isUrgent: checked,
                              }))
                            }
                          />
                          <Label htmlFor="edit-post-urgent">Urgent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-post-pinned"
                            checked={editPostData.isPinned}
                            onCheckedChange={(checked) =>
                              setEditPostData((prev) => ({
                                ...prev,
                                isPinned: checked,
                              }))
                            }
                          />
                          <Label htmlFor="edit-post-pinned">Pin to top</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                        <div>
                          <Label
                            htmlFor="edit-include-poll"
                            className="font-medium"
                          >
                            Include poll
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Edit or remove the poll attached to this
                            announcement.
                          </p>
                        </div>
                        <Switch
                          id="edit-include-poll"
                          checked={editPostData.includePoll}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const currentLength =
                                editPostData.pollOptions.length;
                              setEditPostData((prev) => ({
                                ...prev,
                                includePoll: true,
                                pollOptions:
                                  prev.pollOptions.length >= 2
                                    ? prev.pollOptions
                                    : ["", ""],
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
                        <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-poll-question">
                              Poll question
                            </Label>
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
                              <div
                                key={`${index}-${
                                  editingPollOptionIds[index] || "new"
                                }`}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  placeholder={`Option ${index + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    setEditPostData((prev) => {
                                      const nextOptions = [...prev.pollOptions];
                                      nextOptions[index] = e.target.value;
                                      return {
                                        ...prev,
                                        pollOptions: nextOptions,
                                      };
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
                              disabled={
                                editPostData.pollOptions.length >=
                                MAX_POLL_OPTIONS
                              }
                            >
                              Add option
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="edit-poll-allow-multiple">
                                Allow multiple selections
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Let students pick more than one answer.
                              </p>
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
              {!hasStreamPosts ? (
                <Card className="border border-border p-6 text-center text-muted-foreground">
                  No posts yet.
                </Card>
              ) : visibleStreamPosts.length === 0 ? (
                <Card className="border border-border bg-card p-6 text-center text-muted-foreground">
                  No announcements match your search.
                </Card>
              ) : (
                <div className="space-y-4">
                  {visibleStreamPosts.map((post, index) => {
                    const rawId = post._id ?? post.id;
                    const pid =
                      typeof rawId === "string" ? rawId : rawId?.toString?.();
                    const createdAt = post.createdAt
                      ? new Date(post.createdAt).toLocaleString()
                      : "";
                    return (
                      <div
                        key={pid || `post-${index}`}
                        className="border border-border rounded-md p-4 hover:shadow-sm transition bg-card"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <span className="block font-semibold text-foreground">
                              {post.author?.name || "Unknown"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {createdAt}
                            </span>
                          </div>
                          {isInstructor && pid && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-foreground hover:text-primary hover:bg-primary/10"
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
                                    className="h-8 w-8 text-foreground hover:text-destructive hover:bg-destructive/10"
                                    aria-label="Delete announcement"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete this announcement?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. The
                                      announcement and any poll data will be
                                      permanently removed for everyone in the
                                      class.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePost(pid)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                          <h3 className="text-lg font-semibold">
                            {post.title}
                          </h3>
                          {isInstructor && post.audience?.type === "group" && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center">
                              <Users className="w-3 h-3 inline-block mr-1" />
                              {groups.find((g) => g._id === post.audience.groupId)?.name || "Group Post"}
                            </span>
                          )}
                          {post.isPinned && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-100 text-xs font-medium">
                              PINNED
                            </span>
                          )}
                          {(post.type === "assignment" ||
                            post.assignmentRef) && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-900 dark:text-purple-100 text-xs font-medium">
                              ASSIGNMENT
                            </span>
                          )}
                          {post.isImportant && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-900 dark:text-blue-100 text-xs font-medium">
                              IMPORTANT
                            </span>
                          )}
                          {post.isUrgent && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-900 dark:text-red-100 text-xs font-medium">
                              URGENT
                            </span>
                          )}
                        </div>

                        <p className="text-foreground mb-3 text-left">
                          {post.content}
                        </p>

                        {/* Post Link (e.g., annotated PDF) */}
                        {post.link?.url && (
                          <div className="mb-3">
                            <a
                              href={post.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {post.link.text || "Annotated Material"}
                            </a>
                          </div>
                        )}

                        {/* Notes (from whiteboard) shown separately */}
                        {post.notesText && post.notesText.trim() !== "" && (
                          <div className="mb-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-left">
                            <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                              Notes
                            </div>
                            <pre className="whitespace-pre-wrap wrap-break-word text-sm text-amber-900 dark:text-amber-50">
                              {post.notesText}
                            </pre>
                          </div>
                        )}

                        {Array.isArray(post.materials) &&
                          post.materials.length > 0 && (
                            <div className="mb-3 rounded-md border border-border bg-muted/30 p-3 text-left">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Materials
                              </div>
                              <div className="mt-2 space-y-3">
                                {post.materials.map((material, idx) => (
                                  <div
                                    key={`${pid || idx}-material-${
                                      material?.fileId || idx
                                    }`}
                                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <p className="font-medium text-foreground">
                                        {material?.fileName || "Attachment"}
                                      </p>
                                      {material?.fileSize ? (
                                        <p className="text-xs text-muted-foreground">
                                          {formatFileSize(material.fileSize)}
                                        </p>
                                      ) : null}
                                    </div>
                                  <div className="flex flex-wrap gap-2">
                                    {material?.viewLink && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-none"
                                        asChild
                                      >
                                        <a
                                          href={material.viewLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Open
                                        </a>
                                      </Button>
                                    )}
                                    {material?.downloadLink && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="border-none"
                                        asChild
                                      >
                                        <a
                                          href={material.downloadLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Download
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {post.poll &&
                          post.poll.options &&
                          post.poll.options.length > 0 && (
                            <div className="mb-4 rounded-md border border-border bg-muted/30 p-4">
                              <div className="mb-3">
                                <p className="font-semibold text-foreground">
                                  {post.poll.question}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {post.poll.allowMultiple
                                    ? "Select all options that apply."
                                    : "Select one option."}
                                </p>
                              </div>

                              {(() => {
                                const pidString = pid || '';
                                const pollOptions = post.poll?.options || [];
                                const selectedIds = (
                                  pollSelections[pidString] || []
                                ).map(String);
                                const totalSelections = pollOptions.reduce(
                                  (sum, option) =>
                                    sum + (option.voterIds?.length || 0),
                                  0
                                );
                                const participantIds = new Set();
                                pollOptions.forEach((option) => {
                                  (option.voterIds || []).forEach((voterId) =>
                                    participantIds.add(voterId)
                                  );
                                });
                                const participantCount = participantIds.size;
                                const hasVoted = user
                                  ? participantIds.has(user.uid)
                                  : false;
                                const allowMultipleSelections = Boolean(
                                  post.poll?.allowMultiple
                                );
                                const buttonDisabled =
                                  !selectedIds.length ||
                                  pollSubmitting[pidString];

                                const selectionSummary =
                                  totalSelections === 0
                                    ? "No votes yet"
                                    : allowMultipleSelections
                                    ? `${totalSelections} selection${
                                        totalSelections === 1 ? "" : "s"
                                      } • ${participantCount} participant${
                                        participantCount === 1 ? "" : "s"
                                      }`
                                    : `${totalSelections} vote${
                                        totalSelections === 1 ? "" : "s"
                                      }`;

                                return (
                                  <div className="space-y-3">
                                    {pollOptions.map((option) => {
                                      const optionVotes = option.voterIds?.length || 0;
                                      const percentage = totalSelections ? Math.round((optionVotes / totalSelections) * 100) : 0;
                                      const isSelected = selectedIds.includes(option.id);
                                      return (
                                        <div
                                          key={option.id}
                                          className={`rounded-md border bg-card px-3 py-2 transition ${isSelected ? "border-primary shadow-sm" : "border-border"}`}
                                        >
                                          <label className="flex items-center gap-3 text-sm text-foreground">
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
                                            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                                              <span>
                                                {optionVotes} vote{optionVotes === 1 ? "" : "s"}
                                              </span>
                                              <span>{percentage}%</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Assignments</CardTitle>
                  <CardDescription>
                    Course assignments and deadlines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAssignmentsLoading && (
                    <p className="text-foreground">Loading assignments...</p>
                  )}
                  {!isAssignmentsLoading && assignments.length === 0 && (
                    <p className="text-muted-foreground">No assignments available.</p>
                  )}
                  {!isAssignmentsLoading && assignments.length > 0 && (
                    <div className="space-y-4">
                      {assignments
                        .filter((a) => String(a.classId || a.courseId) === String(id))
                        .map((a) => (
                          <div key={a.id} className="border rounded-md p-4 hover:shadow-sm transition">
                            {isInstructor ? (
                              <Link
                                href="/admin"
                                className="font-semibold text-lg text-left text-primary hover:underline"
                                title="Open assignments page"
                              >
                                {a.title}
                              </Link>
                            ) : (
                              <Link
                                href="/student"
                                className="font-semibold text-lg text-left text-primary hover:underline"
                                title="Open assignments page"
                              >
                                {a.title}
                              </Link>
                            )}
                            {a.description && (
                              <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Deadline: {a.deadline ? new Date(a.deadline).toLocaleString() : "No deadline"}
                            </p>
                            {isInstructor && (
                              <div className="mt-2">
                                {!editingDeadline[a.id] ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-none"
                                    onClick={() => startEditDeadline(a.id, a.deadline)}
                                  >
                                    Edit Deadline
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Input
                                      type="datetime-local"
                                      value={deadlineInputs[a.id] || ""}
                                      onChange={(e) =>
                                        setDeadlineInputs((p) => ({ ...p, [a.id]: e.target.value }))
                                      }
                                    />
                                    <Button size="sm" onClick={() => saveDeadline(a.id)}>
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-none"
                                      onClick={() => cancelEditDeadline(a.id)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                            {a.fileUrl && (
                              <div className="mt-3">
                                <Button variant="outline" size="sm" className="border-none" asChild>
                                  <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                                    Download File
                                  </a>
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
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl">Class Chat</CardTitle>
                <CardDescription>
                  Discuss with your classmates and instructor
                </CardDescription>
              </CardHeader>
              <CardContent
                className="p-0 flex flex-col"
                style={{ height: "600px" }}
              >
                {/* Chat Message List */}
                <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                  {isChatLoading ? (
                    <p className="text-center text-foreground">
                      Loading chat...
                    </p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    <ChatMessageList
                      messages={chatMessages}
                      currentUserId={user?.uid}
                      messagesEndRef={messagesEndRef}
                      onDeleteMessage={handleDeleteChatMessage}
                    />
                  )}
                </div>
                {/* Chat Input Box */}
                <div className="border-t border-border p-4 bg-card">
                  <ChatMessageInput
                    newMessage={chatInput}
                    setNewMessage={setChatInput}
                    onSendMessage={handleSendChatMessage}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* PEOPLE */}
          {activeTab === "people" && (
            <div className="space-y-6">
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl">Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center text-lg font-semibold">
                      {classroom.instructorName
                        ? classroom.instructorName[0].toUpperCase()
                        : "I"}
                    </div>
                    <span className="font-medium text-foreground">
                      {classroom.instructorName}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Classmates ({classroom.students?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!classroom.students || classroom.students.length === 0 ? (
                    <p className="text-muted-foreground">
                      No students enrolled yet.
                    </p>
                  ) : (
                    classroom.students.map((student) => (
                      <div
                        key={student.userId}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center text-lg font-semibold">
                          {student.name ? student.name[0].toUpperCase() : "S"}
                        </div>
                        <span className="font-medium text-foreground">
                          {student.name}
                        </span>
                      </div>
                    )))
                  }
                </CardContent>
              </Card>

              <Card className="border border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">
                    Groups ({groups.length})
                  </CardTitle>
                  {isInstructor && (
                    <Button
                      size="sm"
                      onClick={() => setIsCreateGroupOpen(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGroupsLoading && (
                    <p className="text-foreground">Loading groups...</p>
                  )}
                  {!isGroupsLoading && groups.length === 0 && (
                    <p className="text-muted-foreground">
                      No groups created yet.
                    </p>
                  )}
                  {!isGroupsLoading && groups.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groups.map((group) => (
                        <div
                          key={group._id}
                          onClick={() => {
                            // Both instructors and students view group details page
                            router.push(`/classroom/${id}/group/${group._id}`);
                          }}
                          className="transition-shadow cursor-pointer"
                        >
                          <Card className="hover:shadow-md h-full">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg text-primary hover:underline">
                                  {group.name}
                                </CardTitle>
                                {isInstructor ? (
                                  // explicit Edit button for instructors (stop propagation)
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setGroup(group);
                                        setIsEditGroupOpen(true);
                                      }}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                              <CardDescription>
                                {group.members.length} member(s)
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm font-medium">
                                Rep: {group.representative.name}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
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
        
        {/* Modals */}
        {isInstructor && (
          <>
            <CreateGroupDialog
              open={isCreateGroupOpen}
              onOpenChange={setIsCreateGroupOpen}
              onSubmit={handleCreateGroup}
              classroom={classroom}
              newGroupData={newGroupData}
              setNewGroupData={setNewGroupData}
            />
            
            <EditGroupDialog 
              open={isEditGroupOpen}
              onOpenChange={setIsEditGroupOpen}
              group={selectedGroup}
              classroom={classroom}
              onUpdate={handleUpdateGroup}
              onDelete={handleDeleteGroup}
            />
          </>
        )}
      </div>
    </div>
  );
}            