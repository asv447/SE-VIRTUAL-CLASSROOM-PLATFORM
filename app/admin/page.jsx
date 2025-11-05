"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { format } from "date-fns";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Download, 
  Users, 
  Calendar,
  FileText,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "assignments";
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [classroomsError, setClassroomsError] = useState("");
  
  const [formLoading, setFormLoading] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: "", code: "", description: "" });
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    deadline: "",
    courseId: "",
    file: null
  });
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [viewingSubmissions, setViewingSubmissions] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "assignments") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const queryString = params.toString();
    router.replace(queryString ? `/admin?${queryString}` : "/admin", { scroll: false });
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    if (!tabParam && activeTab !== "assignments") {
      // Keep current selection when navigating internally without query param
      return;
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        const isInstructorEmail =
          usr.email?.includes("@instructor.com") ||
          usr.email?.includes("@admin.com");
        
        // Check role from database
        try {
          const res = await fetch(`/api/users/${usr.uid}`);
          if (res.ok) {
            const data = await res.json();
            const isInstructorRole = data.user.role === "instructor";
            
            if (!isInstructorRole) {
              window.location.href = "/student";
              return;
            }
          } else if (!isInstructorEmail) {
            // If can't verify role, fall back to email check
            window.location.href = "/student";
            return;
          }
        } catch (err) {
          console.error("Error checking user role:", err);
          if (!isInstructorEmail) {
            window.location.href = "/student";
            return;
          }
        }
        
        setUser(usr);
      } else {
        setUser(null);
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

  const loadData = async () => {
    setPageLoading(true);
    try {
      await Promise.all([
        loadCourses(),
        loadAssignments(),
        loadClassrooms()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const params = new URLSearchParams({
        userId: user?.uid || "",
        role: "instructor",
      });
      const res = await fetch(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error("Error loading assignments:", err);
    }
  };

  const loadClassrooms = async () => {
    if (!user) {
      setClassrooms([]);
      return;
    }

    setClassroomsLoading(true);
    setClassroomsError("");
    try {
      const params = new URLSearchParams({
        userId: user.uid,
        email: user.email || "",
        role: "instructor",
      });

      const res = await fetch(`/api/classrooms?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load classrooms (${res.status})`);
      }

      const payload = await res.json();
      const classroomDocs = Array.isArray(payload.classrooms) ? payload.classrooms : [];

      const normalized = classroomDocs.map((cls) => {
        const rawId = cls.classroomId || cls.id || cls._id;
        const id = rawId?.toString ? rawId.toString() : String(rawId || "");
        return {
          id,
          classroomId: id,
          title: cls.subjectName || cls.name || cls.courseCode || "Untitled Course",
          description: cls.description || "",
          courseCode: cls.courseCode || cls.code || "",
          classCode: cls.classCode || "",
          studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
          updatedAt: cls.updatedAt || cls.modifiedAt || cls.createdAt || null,
        };
      });

      setClassrooms(normalized);
    } catch (err) {
      console.error("Error loading classrooms:", err);
      setClassrooms([]);
      setClassroomsError("Failed to load classrooms.");
    } finally {
      setClassroomsLoading(false);
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

  const createCourse = async () => {
    if (!courseName || !courseCode) {
      alert("Please fill in course name and code");
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        alert("User not available. Please sign in again.");
        setLoading(false);
        return;
      }

  const instructorId = user.uid;
  const instructorName = (user.email && user.email.split("@")[0]) || instructorId;
  const instructorEmail = user.email || "";
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: courseName,
          code: courseCode,
          description: courseDescription,
          instructorId,
          instructorName,
        }),
      });

      if (res.ok) {
        try {
          await fetch("/api/classrooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectName: courseName,
              courseCode,
              description: courseDescription,
              instructorId,
              instructorName,
              instructorEmail,
            }),
          });
        } catch (err) {
          console.error("Error creating classroom document:", err);
        }

        setCourseName("");
        setCourseCode("");
        setCourseDescription("");
        setIsCreateCourseOpen(false);
        await Promise.all([loadCourses(), loadClassrooms()]);
        alert("Course created successfully!");
      } else {
        const error = await res.json();
        alert("Failed to create course: " + error.error);
      }
    } catch (err) {
      console.error("Error creating course:", err);
      alert("Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (!selectedCourse || !assignmentTitle || !assignmentDescription || !assignmentDeadline) {
      alert("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        alert("User not available. Please sign in again.");
        setLoading(false);
        return;
      }

      const instructorId = user.uid;
      const instructorName = (user.email && user.email.split("@")[0]) || instructorId;
      const formData = new FormData();
      formData.append("courseId", selectedCourse);
      formData.append("title", assignmentTitle);
      formData.append("description", assignmentDescription);
      formData.append("deadline", assignmentDeadline);
      formData.append("instructorId", instructorId);
      formData.append("instructorName", instructorName);
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
        setAssignmentFile(null);
        setIsCreateAssignmentOpen(false);
        await loadAssignments();
        alert("Assignment created successfully!");
      } else {
        const error = await res.json();
        alert("Failed to create assignment: " + error.error);
      }
    } catch (err) {
      console.error("Error creating assignment:", err);
      alert("Failed to create assignment");
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    if (!confirm("Delete this assignment and all its submissions?")) return;
    
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      const classId = assignment?.classId || assignment?.courseId;
      
      const res = await fetch(`/api/assignments/${assignmentId}?classId=${classId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        await loadAssignments();
        alert("Assignment deleted successfully!");
      } else {
        const error = await res.json();
        alert("Failed to delete assignment: " + error.error);
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
      alert("Failed to delete assignment");
    }
  };

  const viewAssignmentSubmissions = async (assignment) => {
    setViewingSubmissions(assignment);
    await loadSubmissions(assignment.id);
  };

  const handleOpenClassroom = (classroomId) => {
    if (!classroomId) {
      alert("Unable to open classroom. Identifier missing.");
      return;
    }
    router.push(`/classroom?classId=${encodeURIComponent(classroomId)}&tab=announcements`);
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-gray-600">Please log in to access the admin dashboard.</p>
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-gray-600">Welcome, {user.displayName || user.email}</p>
      </div>

  <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
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
                  <CardDescription>Manage your courses and subjects</CardDescription>
                </div>
                <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>Add a new course or subject</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="courseName">Course Name *</Label>
                        <Input
                          id="courseName"
                          value={courseName}
                          onChange={(e) => setCourseName(e.target.value)}
                          placeholder="e.g., Computer Science 101"
                        />
                      </div>
                      <div>
                        <Label htmlFor="courseCode">Course Code *</Label>
                        <Input
                          id="courseCode"
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          placeholder="e.g., CS101"
                        />
                      </div>
                      <div>
                        <Label htmlFor="courseDescription">Description</Label>
                        <Textarea
                          id="courseDescription"
                          value={courseDescription}
                          onChange={(e) => setCourseDescription(e.target.value)}
                          placeholder="Course description..."
                        />
                      </div>
                      <Button onClick={createCourse} disabled={loading} className="w-full">
                        {loading ? "Creating..." : "Create Course"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {classroomsLoading ? (
                <p className="text-gray-600 text-center py-8">Loading classrooms…</p>
              ) : classrooms.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  {classroomsError || "No classrooms created yet."}
                </p>
              ) : (
                <div className="grid gap-4">
                  {classrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="border rounded-lg p-4 transition hover:shadow cursor-pointer"
                      onClick={() => handleOpenClassroom(classroom.classroomId)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{classroom.title}</h3>
                          {classroom.courseCode ? (
                            <p className="text-sm text-gray-600">Code: {classroom.courseCode}</p>
                          ) : null}
                          {classroom.classCode ? (
                            <p className="text-sm text-gray-600">Class Code: {classroom.classCode}</p>
                          ) : null}
                          {classroom.description ? (
                            <p className="text-sm mt-2 text-gray-700">{classroom.description}</p>
                          ) : null}
                          <p className="text-xs text-gray-500 mt-3">
                            {classroom.studentCount} students enrolled
                          </p>
                        </div>
                        <div className="text-sm text-gray-500 text-right">
                          {classroom.updatedAt ? (
                            <p>Updated {format(new Date(classroom.updatedAt), "PPP")}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
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
                  <CardDescription>Create and manage assignments</CardDescription>
                </div>
                <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>Add a new assignment for students</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="course">Course/Subject *</Label>
                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.name} ({course.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                          onChange={(e) => setAssignmentDescription(e.target.value)}
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
                          onChange={(e) => setAssignmentDeadline(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="file">Assignment File (Optional)</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={(e) => setAssignmentFile(e.target.files[0])}
                          accept=".pdf,.doc,.docx,.txt,.zip"
                        />
                      </div>
                      <Button onClick={createAssignment} disabled={loading} className="w-full">
                        {loading ? "Creating..." : "Create Assignment"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No assignments created yet.</p>
              ) : (
                <div className="grid gap-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{assignment.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              {courses.find(c => c.id === assignment.courseId)?.name || "Unknown Course"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {format(new Date(assignment.deadline), "PPP p")}
                            </div>
                          </div>
                          {assignment.fileUrl && (
                            <div className="mt-3">
                              <Button variant="outline" size="sm" asChild>
                                <a href={assignment.fileUrl} target="_blank" rel="noopener noreferrer">
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
                            onClick={() => viewAssignmentSubmissions(assignment)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            View Submissions
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                  : "Select an assignment to view submissions"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!viewingSubmissions ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Go to the Assignments tab and click "View Submissions" for any assignment</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No submissions yet for this assignment.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{submission.studentName}</h3>
                          <p className="text-sm text-gray-600">ID: {submission.studentId}</p>
                          <p className="text-sm text-gray-500">
                            Submitted: {format(new Date(submission.submittedAt), "PPP p")}
                          </p>
                        </div>
                        {submission.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
