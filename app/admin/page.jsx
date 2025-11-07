"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // [FIX] Import useRouter
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
import { toast } from "sonner"; // [FIX] Import toast

export default function AdminDashboard() {
  const router = useRouter(); // [FIX] Add router
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(""); // [FIX] Add username state
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  const [formLoading, setFormLoading] = useState(false);
  // [FIX] Changed state names to match what we send to the API
  const [courseTitle, setCourseTitle] = useState("");
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        let isInstructorEmail = usr.email?.includes("@instructor.com") || 
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

  const loadData = async () => {
    setPageLoading(true);
    try {
      await Promise.all([
        loadCourses(),
        loadAssignments()
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
      const res = await fetch(`/api/courses?role=instructor&userId=${user.uid}`);
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
    if (!selectedCourse || !assignmentTitle || !assignmentDescription || !assignmentDeadline) {
      toast.error("Please fill all required fields"); // [FIX] Use toast
      return;
    }

    setLoading(true);
    try {
      if (!user || !username) { // [FIX] Check for username
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
        toast.success("Assignment deleted successfully!"); // [FIX] Use toast
      } else {
        const error = await res.json();
        toast.error("Failed to delete assignment: " + error.error); // [FIX] Use toast
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
      toast.error("Failed to delete assignment"); // [FIX] Use toast
    }
  };

  const deleteCourse = async (courseId) => {
    if (!confirm("Delete this course and related data (posts/assignments/submissions)?")) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
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
    }
  };

  const viewAssignmentSubmissions = async (assignment) => {
    setViewingSubmissions(assignment);
    await loadSubmissions(assignment.id);
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
        <p className="text-gray-600">Welcome, {username}</p> {/* [FIX] Use username */}
      </div>

      <Tabs defaultValue="assignments" className="space-y-4">
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
              {courses.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No courses created yet.</p>
              ) : (
                // [FIX] Updated to show clickable cards
                <div className="grid gap-4 md:grid-cols-2">
                  {courses.map((course) => (
                    <Card 
                      key={course.id} 
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="cursor-pointer" onClick={() => router.push(`/classroom/${course.id}`)}>
                          <CardTitle>{course.name}</CardTitle>
                          <CardDescription>Code: {course.courseCode}</CardDescription>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteCourse(course.id)}
                          title="Delete course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="cursor-pointer" onClick={() => router.push(`/classroom/${course.id}`)}>
                        <p className="text-sm text-gray-600 truncate">{course.description || "No description."}</p>
                        <div className="text-sm text-gray-500 mt-4">
                          <p>{format(new Date(course.createdAt), "PPP")}</p>
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
                                {course.name} ({course.courseCode}) {/* [FIX] Use courseCode */}
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