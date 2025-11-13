"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // [FIX] Import useRouter
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Trash2,
  Download,
  Users,
  Calendar,
  FileText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { ChevronDown } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter(); // [FIX] Add router
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(""); // [FIX] Add username state
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assignments");
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [studentDirectory, setStudentDirectory] = useState({});
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    grade: "",
    maxScore: "",
    feedback: "",
  });
  const [gradeSaving, setGradeSaving] = useState(false);

  const [formLoading, setFormLoading] = useState(false);
  // [FIX] Changed state names to match what we send to the API
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    deadline: "",
    courseId: "",
    file: null,
  });
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentMaxScore, setAssignmentMaxScore] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [courseGroups, setCourseGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [audienceType, setAudienceType] = useState("class"); // "class" or "group"
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
  const [viewingSubmissions, setViewingSubmissions] = useState(null);
  const [editingDeadline, setEditingDeadline] = useState({});
  const [deadlineInputs, setDeadlineInputs] = useState({});
  const [savingDeadline, setSavingDeadline] = useState({});
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // When selecting an assignment from the submissions tab dropdown
  const handleSelectSubmissionAssignment = async (assignmentId) => {
    const selected = assignments.find((a) => a.id === assignmentId);
    if (!selected) {
      setViewingSubmissions(null);
      setSubmissions([]);
      return;
    }
    setViewingSubmissions(selected);
    await loadSubmissions(selected.id);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        let isInstructorEmail =
          usr.email?.includes("@instructor.com") ||
          usr.email?.includes("@admin.com");

        try {
          const res = await fetch(`/api/users/${usr.uid}`);
          if (res.ok) {
            const data = await res.json();
            const isInstructorRole = data.user.role === "instructor";

            // [FIX] Set the username from the database
            setUsername(data.user.username || usr.email.split("@")[0]);

            if (!isInstructorRole) {
              window.location.href = "/student";
              return;
            }
          } else if (!isInstructorEmail) {
            window.location.href = "/student";
            return;
          } else {
            // [FIX] Fallback for username if DB fetch fails but email is correct
            setUsername(usr.email.split("@")[0]);
          }
        } catch (err) {
          console.error("Error checking user role:", err);
          if (!isInstructorEmail) {
            window.location.href = "/student";
            return;
          }
          // [FIX] Fallback for username on error
          setUsername(usr.email.split("@")[0]);
        }

        setUser(usr);
      } else {
        setUser(null);
        setUsername("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setPageLoading(false);
    }
  }, [user]);

<<<<<<< HEAD
=======
  // [FIXED] This hook fetches groups when the selectedCourse state changes.
  // It is now at the top level of the component, which is correct.
  useEffect(() => {
    const fetchGroupsForCourse = async () => {
      if (!selectedCourse) {
        setCourseGroups([]);
        return;
      }
      setLoadingGroups(true);
      try {
        const res = await fetch(`/api/groups?courseId=${selectedCourse}`);
        if (!res.ok) throw new Error("Failed to fetch groups");
        const data = await res.json();
        setCourseGroups(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching course groups:", err);
        setCourseGroups([]);
        toast.error(err.message);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroupsForCourse();
    // Also reset group selections when course changes
    setSelectedGroupIds(new Set());
  }, [selectedCourse]);

  // [FIXED] This function is now defined at the top level,
  // *before* it is called in loadData.
>>>>>>> cb18a5b3c9257b87998e8e23ac9136be656a755a
  const loadStudentDirectory = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/users?role=student");
      if (!res.ok) return;
      const data = await res.json();
      const directory = {};
      const students = Array.isArray(data?.users) ? data.users : [];
      students.forEach((student) => {
        if (student.role && student.role !== "student") return;
        const key = student.uid || student._id || student.id;
        if (!key) return;
        directory[key] = {
          username:
            student.username || student.email?.split("@")[0] || null,
          email: student.email || null,
        };
      });
      setStudentDirectory(directory);
    } catch (err) {
      console.error("Error loading student directory:", err);
    }
  };

<<<<<<< HEAD
=======
  // [FIXED] loadData now correctly calls the functions defined above it.
>>>>>>> cb18a5b3c9257b87998e8e23ac9136be656a755a
  const loadData = async () => {
    setPageLoading(true);
    try {
      await Promise.all([
        loadCourses(),
        loadAssignments(),
        loadStudentDirectory(),
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const loadCourses = async () => {
    // [FIX] Make sure user is available before fetching
    if (!user) return;
    try {
      // [FIX] Call the API to get *only* this instructor's courses
      const res = await fetch(
        `/api/courses?role=instructor&userId=${user.uid}`
      );
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    }
  };

  const loadAssignments = async () => {
    if (!user?.uid) {
      setAssignments([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        role: "instructor",
        userId: user.uid,
      });
      const res = await fetch(`/api/assignments?${params.toString()}`);
      if (!res.ok) {
        console.error(
          "Failed to load assignments:",
          await res.text().catch(() => res.statusText)
        );
        return;
      }
      const data = await res.json();
      
      // --- THIS IS YOUR DEBUG LOG ---
      // After fixing the ReferenceError, this log will now work
      // and show the real assignment data.
      console.log("Assignments loaded from API:", data);
      // -------------------------------

      const assignmentsPayload = Array.isArray(data) ? data : [];
      setAssignments(assignmentsPayload);
      setViewingSubmissions((current) => {
        if (!current) return current;
        const match = assignmentsPayload.find((item) => item.id === current.id);
        if (!match) {
          setSubmissions([]);
          return null;
        }
        return match;
      });
    } catch (err) {
      console.error("Error loading assignments:", err);
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const res = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const safeFormatDate = (date) => {
    if (!date) return "No date";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "No date";
    try {
      return format(d, "PPP p");
    } catch (e) {
      return d.toString();
    }
  };

  // [FIX] Helper to generate the 6-digit class code (same as homepage)
  const generateCourseCode = (prof, course) => {
    const p = (prof || "USER").slice(0, 2).toUpperCase();
    const c = (course || "COURSE").slice(0, 2).toUpperCase();
    const r = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${p}${c}${r}`;
  };

  const createCourse = async () => {
    // [FIX] Check for title
    if (!courseTitle) {
      toast.error("Please fill in course name");
      return;
    }

    setLoading(true);
    try {
      if (!user || !username) {
        toast.error("User not available. Please sign in again.");
        setLoading(false);
        return;
      }

      // [FIX] Generate the code and send the correct fields
      const uniqueCourseCode = generateCourseCode(username, courseTitle);

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: courseTitle,
          courseCode: uniqueCourseCode,
          description: courseDescription,
          instructorId: user.uid,
          instructorName: username,
        }),
      });

      if (res.ok) {
        setCourseTitle(""); // [FIX] Use correct state
        setCourseDescription("");
        setIsCreateCourseOpen(false);
        await loadCourses();
        toast.success("Course created successfully!"); // [FIX] Use toast
      } else {
        const error = await res.json();
        toast.error("Failed to create course: " + error.error); // [FIX] Use toast
      }
    } catch (err) {
      console.error("Error creating course:", err);
      toast.error("Failed to create course"); // [FIX] Use toast
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (
      !selectedCourse ||
      !assignmentTitle ||
      !assignmentDescription ||
      !assignmentDeadline
    ) {
      toast.error("Please fill all required fields"); // [FIX] Use toast
      return;
    }
    
    // [NEW] Validate group selection
    if (audienceType === "group" && selectedGroupIds.size === 0) {
      toast.error("Please select at least one group for the assignment.");
      return;
    }

    setLoading(true);
    try {
      if (!user || !username) {
        // [FIX] Check for username
        toast.error("User not available. Please sign in again."); // [FIX] Use toast
        setLoading(false);
        return;
      }

      const instructorId = user.uid;
      const instructorName = username; // [FIX] Use username from state
      const formData = new FormData();
      formData.append("courseId", selectedCourse);
      formData.append("title", assignmentTitle);
      formData.append("description", assignmentDescription);
      formData.append("deadline", assignmentDeadline);
      formData.append("instructorId", instructorId);
      formData.append("instructorName", instructorName);

      // [NEW] Add Audience data to FormData
      formData.append("audienceType", audienceType);
      formData.append(
        "audienceGroupIds",
        JSON.stringify(Array.from(selectedGroupIds))
      );
      
      if (assignmentMaxScore && assignmentMaxScore.trim() !== "") {
        formData.append("maxScore", assignmentMaxScore);
      }
      if (assignmentFile) {
        formData.append("file", assignmentFile);
      }

      const res = await fetch("/api/assignments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSelectedCourse("");
        setAssignmentTitle("");
        setAssignmentDescription("");
        setAssignmentDeadline("");
        setAssignmentMaxScore("");
        setAssignmentFile(null);
        // [NEW] Reset audience state
        setAudienceType("class");
        setSelectedGroupIds(new Set());
        setCourseGroups([]);
        setIsCreateAssignmentOpen(false);
        await loadAssignments();
        toast.success("Assignment created successfully!"); // [FIX] Use toast
      } else {
        const error = await res.json();
        toast.error("Failed to create assignment: " + error.error); // [FIX] Use toast
      }
    } catch (err) {
      console.error("Error creating assignment:", err);
      toast.error("Failed to create assignment"); // [FIX] Use toast
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setDeletingAssignment(true);
    try {
      const assignment = assignmentToDelete;
      const classId = assignment?.classId || assignment?.courseId;

      const res = await fetch(
        `/api/assignments/${
          assignment.id
        }?classId=${classId}&role=instructor&userId=${encodeURIComponent(
          user?.uid || ""
        )}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        await loadAssignments();
        toast.success("Assignment deleted successfully!");
      } else {
        const error = await res.json();
        toast.error("Failed to delete assignment: " + error.error);
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
      toast.error("Failed to delete assignment");
    } finally {
      setDeletingAssignment(false);
      setAssignmentToDelete(null);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeletingCourse(true);
    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-uid": user?.uid || "",
        },
      });
      if (res.ok) {
        await loadCourses();
        toast.success("Course deleted successfully!");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to delete course: " + (err.error || res.status));
      }
    } catch (e) {
      console.error("Delete course error:", e);
      toast.error("Failed to delete course");
    } finally {
      setDeletingCourse(false);
      setCourseToDelete(null);
    }
  };

  const viewAssignmentSubmissions = async (assignment) => {
    setViewingSubmissions(assignment);
    // Switch to the Submissions tab so the user can see results immediately
    setActiveTab("submissions");
    await loadSubmissions(assignment.id);
  };

  const startEditDeadline = (assignmentId, currentDeadline) => {
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
      toast.error("Please pick a deadline");
      return;
    }

    setSavingDeadline((p) => ({ ...p, [assignmentId]: true }));
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAssignments((assignments) =>
          assignments.map((a) =>
            a.id === assignmentId ? { ...a, deadline: updated.deadline } : a
          )
        );
        cancelEditDeadline(assignmentId);
        toast.success("Deadline updated");
      } else {
        const e = await res.json();
        toast.error(
          "Failed to update deadline: " + (e?.error || res.statusText)
        );
      }
    } catch (err) {
      console.error("Error updating deadline:", err);
      toast.error("Error updating deadline");
    } finally {
      setSavingDeadline((p) => ({ ...p, [assignmentId]: false }));
    }
  };

  const resolveSubmissionMeta = (submission) => {
    const directoryEntry = studentDirectory[submission.studentId];
    const displayName =
      directoryEntry?.username ||
      submission.studentName ||
      submission.studentEmail ||
      submission.studentId;
    const displayEmail =
      directoryEntry?.email || submission.studentEmail || null;
    return { displayName, displayEmail };
  };

  const openGradeDialog = (submission) => {
    const normalizeNumberInput = (value) =>
      value === null || value === undefined ? "" : String(value);

    // Try to get maxScore from submission, otherwise from viewingSubmissions (assignment)
    const maxScoreValue = submission?.maxScore ?? viewingSubmissions?.maxScore;

    setGradingSubmission(submission);
    setGradeForm({
      grade: normalizeNumberInput(submission?.grade),
      maxScore: normalizeNumberInput(maxScoreValue),
      feedback: submission?.feedback || "",
    });
  };

  const closeGradeDialog = () => {
    setGradingSubmission(null);
    setGradeForm({ grade: "", maxScore: "", feedback: "" });
  };

  const handleGradeFormChange = (field, value) => {
    setGradeForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitGrade = async () => {
    if (!gradingSubmission) {
      toast.error("No submission selected for grading");
      return;
    }
    if (!user?.uid) {
      toast.error("User context missing. Please sign in again.");
      return;
    }

    console.log("[submitGrade] Starting grade submission");
    console.log("[submitGrade] gradingSubmission:", gradingSubmission);
    console.log("[submitGrade] user.uid:", user.uid);
    console.log("[submitGrade] gradeForm:", gradeForm);

    setGradeSaving(true);
    try {
      const payload = {
        submissionId: gradingSubmission.id,
        grade: gradeForm.grade.trim() === "" ? null : gradeForm.grade.trim(),
        maxScore:
          gradeForm.maxScore.trim() === "" ? null : gradeForm.maxScore.trim(),
        feedback: gradeForm.feedback.trim(),
      };

      console.log("[submitGrade] payload:", payload);

      const res = await fetch(`/api/submissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-uid": user.uid,
        },
        body: JSON.stringify(payload),
      });

      console.log("[submitGrade] response status:", res.status);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[submitGrade] API error:", err);
        toast.error(err?.error || "Failed to save grade");
        return;
      }

      const updated = await res.json();
      console.log("[submitGrade] updated submission:", updated);
      setSubmissions((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item
        )
      );
      toast.success("Submission graded successfully");
      closeGradeDialog();
    } catch (error) {
      console.error("[submitGrade] Error saving grade:", error);
      toast.error("Unable to save grade right now");
    } finally {
      setGradeSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-gray-600">
          Please log in to access the admin dashboard.
        </p>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Welcome, {username}</p>{" "}
          {/* [FIX] Use username */}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Courses</CardTitle>
                    <CardDescription>
                      Manage your courses and subjects
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isCreateCourseOpen}
                    onOpenChange={setIsCreateCourseOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Course</DialogTitle>
                        <DialogDescription>
                          Add a new course or subject
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="courseName">Course Name *</Label>
                          <Input
                            id="courseName"
                            value={courseTitle} // [FIX] Use correct state
                            onChange={(e) => setCourseTitle(e.target.value)} // [FIX] Use correct state
                            placeholder="e.g., Computer Science 101"
                          />
                        </div>

                        {/* [FIX] Removed Course Code input, it's auto-generated */}

                        <div>
                          <Label htmlFor="courseDescription">Description</Label>
                          <Textarea
                            id="courseDescription"
                            value={courseDescription}
                            onChange={(e) =>
                              setCourseDescription(e.target.value)
                            }
                            placeholder="Course description..."
                          />
                        </div>
                        <Button
                          onClick={createCourse}
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? "Creating..." : "Create Course"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No courses created yet.
                  </p>
                ) : (
                  // [FIX] Updated to show clickable cards
                  <div className="grid gap-4 md:grid-cols-2">
                    {courses.map((course) => (
                      <Card
                        key={course.id}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                          <div
                            className="cursor-pointer"
                            onClick={() =>
                              router.push(`/classroom/${course.id}`)
                            }
                          >
                            <CardTitle>{course.name}</CardTitle>
                            <CardDescription>
                              Code: {course.courseCode}
                            </CardDescription>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setCourseToDelete(course)}
                            title="Delete course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent
                          className="cursor-pointer"
                          onClick={() => router.push(`/classroom/${course.id}`)}
                        >
                          <p className="text-sm text-gray-600 truncate">
                            {course.description || "No description."}
                          </p>
                          <div className="text-sm text-gray-500 mt-4">
                            <p>{safeFormatDate(course.createdAt)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Assignments</CardTitle>
                    <CardDescription>
                      Create and manage assignments
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isCreateAssignmentOpen}
                    onOpenChange={setIsCreateAssignmentOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Assignment</DialogTitle>
                        <DialogDescription>
                          Add a new assignment for students
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                          <Label htmlFor="course">Course/Subject *</Label>
                          <Select
                            value={selectedCourse}
                            onValueChange={setSelectedCourse}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.name} ({course.courseCode}){" "}
                                  {/* [FIX] Use courseCode */}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2 border-t pt-4">
                          <Label>Audience</Label>
                          <RadioGroup
                            value={audienceType}
                            onValueChange={setAudienceType}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="class" id="r-class" />
                              <Label htmlFor="r-class">Whole Class</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="group" id="r-group" />
                              <Label htmlFor="r-group">Specific Group(s)</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {audienceType === "group" && (
                          <div className="grid gap-2">
                            <Label htmlFor="group-select">
                              Select Group(s)
                            </Label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between"
                                  disabled={
                                    loadingGroups || courseGroups.length === 0
                                  }
                                >
                                  <span>
                                    {loadingGroups
                                      ? "Loading groups..."
                                      : selectedGroupIds.size === 0
                                      ? "Select groups..."
                                      : `${selectedGroupIds.size} group(s) selected`}
                                  </span>
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuLabel>
                                  Assign to...
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {courseGroups.map((group) => (
                                  <DropdownMenuCheckboxItem
                                    key={group._id}
                                    checked={selectedGroupIds.has(group._id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedGroupIds((prev) => {
                                        const next = new Set(prev);
                                        if (checked) {
                                          next.add(group._id);
                                        } else {
                                          next.delete(group._id);
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    {group.name}
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        <div>
                          <Label htmlFor="title">Assignment Title *</Label>
                          <Input
                            id="title"
                            value={assignmentTitle}
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            placeholder="Assignment title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            value={assignmentDescription}
                            onChange={(e) =>
                              setAssignmentDescription(e.target.value)
                            }
                            placeholder="Assignment description..."
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="deadline">Deadline *</Label>
                          <Input
                            id="deadline"
                            type="datetime-local"
                            value={assignmentDeadline}
                            onChange={(e) =>
                              setAssignmentDeadline(e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxScore">Max Score (Optional)</Label>
                          <Input
                            id="maxScore"
                            type="number"
                            value={assignmentMaxScore}
                            onChange={(e) =>
                              setAssignmentMaxScore(e.target.value)
                            }
                            placeholder="e.g., 100"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="file">
                            Assignment File (Optional)
                          </Label>
                          <Input
                            id="file"
                            type="file"
                            onChange={(e) =>
                              setAssignmentFile(e.target.files[0])
                            }
                            accept=".pdf,.doc,.docx,.txt,.zip"
                          />
                        </div>
                        <Button
                          onClick={createAssignment}
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? "Creating..." : "Create Assignment"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No assignments created yet.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {assignment.title}
                            </h3>
                            {/* --- [NEW] Audience Badge --- */}
                            <div className="flex items-center gap-2 mt-1">
                              {(!assignment.audience ||
                                assignment.audience.type === "class") ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center">
                                  <Users className="w-3 h-3 inline-block mr-1" />
                                  Whole Class
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex items-center">
                                  <Users className="w-3 h-3 inline-block mr-1" />
                                  {assignment.audience.groupIds?.length || 0} Group(s)
                                </span>
                              )}
                            </div>
                            {/* --- [END NEW] --- */}
                            <p className="text-sm text-gray-600 mt-2">
                              {assignment.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {assignment.courseTitle ||
                                  courses.find(
                                    (c) =>
                                      c.id === assignment.courseId ||
                                      c.id === assignment.classId
                                  )?.name ||
                                  "Unknown Course"}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Deadline:{" "}
                                {editingDeadline[assignment.id] ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="datetime-local"
                                      value={
                                        deadlineInputs[assignment.id] || ""
                                      }
                                      onChange={(e) =>
                                        setDeadlineInputs((p) => ({
                                          ...p,
                                          [assignment.id]: e.target.value,
                                        }))
                                      }
                                      className="border px-2 py-1 rounded"
                                    />
                                    <Button
                                      onClick={() =>
                                        saveDeadline(assignment.id)
                                      }
                                      size="sm"
                                      disabled={savingDeadline[assignment.id]}
                                    >
                                      {savingDeadline[assignment.id]
                                        ? "Saving..."
                                        : "Save"}
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        cancelEditDeadline(assignment.id)
                                      }
                                      size="sm"
                                      variant="outline"
                                      disabled={savingDeadline[assignment.id]}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <span
                                    onClick={() =>
                                      startEditDeadline(
                                        assignment.id,
                                        assignment.deadline
                                      )
                                    }
                                    className="cursor-pointer underline text-blue-600 hover:text-blue-800"
                                  >
                                    {safeFormatDate(assignment.deadline)}
                                  </span>
                                )}
                              </div>
                              {assignment.maxScore && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Max Score:</span>
                                  <span>{assignment.maxScore}</span>
                                </div>
                              )}
                            </div>
                            {assignment.fileUrl && (
                              <div className="mt-3">
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={assignment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download File
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                viewAssignmentSubmissions(assignment)
                              }
                            >
                              <Users className="h-4 w-4 mr-2" />
                              View Submissions
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setAssignmentToDelete(assignment)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {/* [NEW] Inline deadline editing */}
                        <div className="mt-4">
                          {editingDeadline[assignment.id] ? (
                            <div className="flex gap-2">
                              <Input
                                type="datetime-local"
                                value={deadlineInputs[assignment.id]}
                                onChange={(e) =>
                                  setDeadlineInputs({
                                    ...deadlineInputs,
                                    [assignment.id]: e.target.value,
                                  })
                                }
                                className="flex-1"
                              />
                              <Button
                                onClick={() => saveDeadline(assignment.id)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  cancelEditDeadline(assignment.id)
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                Deadline: {safeFormatDate(assignment.deadline)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  startEditDeadline(
                                    assignment.id,
                                    assignment.deadline
                                  )
                                }
                              >
                                Edit Deadline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>
                  {viewingSubmissions
                    ? `Submissions for "${viewingSubmissions.title}"`
                    : "Select an assignment to view submissions"}
                </CardDescription>
                {/* Assignment selector for viewing submissions */}
                <div className="mt-4">
                  <Label className="mb-2 block">Choose assignment</Label>
                  <Select
                    value={viewingSubmissions?.id || ""}
                    onValueChange={handleSelectSubmissionAssignment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No assignments available
                        </div>
                      ) : (
                        assignments.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {!viewingSubmissions ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Select an assignment above or go to the Assignments tab
                      and click "View Submissions"
                    </p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      No submissions yet for this assignment.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {submissions.map((submission) => {
                      const { displayName, displayEmail } =
                        resolveSubmissionMeta(submission);
                      return (
                        <div
                          key={submission.id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{displayName}</h3>
                              <p className="text-sm text-gray-600">
                                ID: {submission.studentId}
                              </p>
                              {displayEmail && (
                                <p className="text-sm text-gray-500">
                                  Email: {displayEmail}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                Submitted:{" "}
                                {safeFormatDate(submission.submittedAt)}
                              </p>
                            </div>
                            {submission.fileUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={submission.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            )}
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="text-sm text-gray-700">
                              {submission.grade === null ||
                              submission.grade === undefined
                                ? "Not graded yet."
                                : `Grade: ${submission.grade}${
                                    submission.maxScore === null ||
                                    submission.maxScore === undefined
                                      ? ""
                                      : ` / ${submission.maxScore}`
                                  }`}
                            </div>
                            {submission.feedback && (
                              <p className="text-sm text-gray-500 italic">
                                Feedback: {submission.feedback}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                size="sm"
                                onClick={() => openGradeDialog(submission)}
                              >
                                {submission.grade === null ||
                                submission.grade === undefined
                                  ? "Grade submission"
                                  : "Update grade"}
                              </Button>
                              {submission.gradedAt && (
                                <span className="text-xs text-gray-500">
                                  Graded {safeFormatDate(submission.gradedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={!!gradingSubmission}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeGradeDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {gradingSubmission
                ? `Grade ${
                    resolveSubmissionMeta(gradingSubmission).displayName
                  }`
                : "Grade submission"}
            </DialogTitle>
            <DialogDescription>
              {gradingSubmission
                ? "Record the score and optional feedback for this submission. Leave grade blank to remove an existing score."
                : "Record grading details."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gradeInput">Grade</Label>
              <Input
                id="gradeInput"
                value={gradeForm.grade}
                onChange={(event) =>
                  handleGradeFormChange("grade", event.target.value)
                }
                placeholder="e.g., 85"
                inputMode="decimal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxScoreInput">Max score</Label>
              <Input
                id="maxScoreInput"
                value={gradeForm.maxScore}
                onChange={(event) =>
                  handleGradeFormChange("maxScore", event.target.value)
                }
                placeholder="e.g., 100"
                inputMode="decimal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedbackInput">Feedback</Label>
              <Textarea
                id="feedbackInput"
                value={gradeForm.feedback}
                onChange={(event) =>
                  handleGradeFormChange("feedback", event.target.value)
                }
                placeholder="Share comments for the student"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeGradeDialog}
              disabled={gradeSaving}
            >
              Cancel
            </Button>
            <Button onClick={submitGrade} disabled={gradeSaving}>
              {gradeSaving ? "Saving..." : "Save grade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!assignmentToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingAssignment) {
            setAssignmentToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will remove "${
                assignmentToDelete?.title || "this assignment"
              }" and all associated submissions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={deletingAssignment}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={handleDeleteAssignment}
              disabled={deletingAssignment}
            >
              {deletingAssignment ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingCourse) {
            setCourseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This removes "${
                courseToDelete?.name || "this course"
              }" and related posts, assignments, and submissions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={deletingCourse}
            >
              Keep course
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={handleDeleteCourse}
              disabled={deletingCourse}
            >
              {deletingCourse ? "Deleting..." : "Delete course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}