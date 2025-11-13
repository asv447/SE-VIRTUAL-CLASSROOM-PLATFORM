"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // [NEW] Added DialogClose
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import {
  LogIn as LogInIcon,
  UserPlus as UserPlusIcon,
  Plus,
  Users,
  BookOpen,
  Calendar,
  Brain,
  Bell,
  FileText,
  BarChart3,
  Sparkles,
  LogOut,
  Clock,
  AlertCircle,
} from "lucide-react";

import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function ClassyncDashboard() {
  // User state
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [courseProgress, setCourseProgress] = useState({}); // Store progress for each course
  const [urgentAssignments, setUrgentAssignments] = useState([]);

  // [NEW] State for student joining a course
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinCourseCode, setJoinCourseCode] = useState("");

  // NEW: Extracted course fetching logic
  const fetchCourses = async (role, uid) => {
    let url = "/api/courses";
    // If the user is an instructor, only fetch their courses
    if (role === "instructor" && uid) {
      url = `/api/courses?role=instructor&userId=${uid}`;
    }
    // [NEW] If user is a student, fetch courses they are enrolled in
    else if (role === "student" && uid) {
      url = `/api/courses?role=student&userId=${uid}`;
    }
    // else (not logged in), fetch all courses

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      console.log("Courses from API:", data);
      setCourses(data);

      // Fetch progress for each course if user is a student
      if (role === "student" && uid) {
        fetchCoursesProgress(data, uid);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Could not load courses.");
    }
  };

  // Fetch assignment progress for all courses
  const fetchCoursesProgress = async (coursesData, uid) => {
    const progressData = {};

    try {
      await Promise.all(
        coursesData.map(async (course) => {
          try {
            const res = await fetch(
              `/api/courses/progress?courseId=${course.id}&studentId=${uid}`
            );
            if (res.ok) {
              const data = await res.json();
              progressData[course.id] = data;
            }
          } catch (err) {
            console.error(
              `Error fetching progress for course ${course.id}:`,
              err
            );
          }
        })
      );
      setCourseProgress(progressData);
    } catch (error) {
      console.error("Error fetching course progress:", error);
    }
  };

  // Fetch urgent assignments (due within 24 hours)
  const fetchUrgentAssignments = async (uid) => {
    if (!uid) {
      setUrgentAssignments([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/assignments?role=student&userId=${encodeURIComponent(uid)}`);
      if (!res.ok) {
        setUrgentAssignments([]);
        return;
      }
      
      const assignments = await res.json();
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Filter for unsubmitted assignments due within 24 hours
      const urgent = [];
      
      for (const assignment of assignments) {
        const deadline = new Date(assignment.deadline);
        if (deadline > now && deadline <= next24Hours) {
          // Check if already submitted
          try {
            const subRes = await fetch(`/api/submissions?assignmentId=${assignment.id}&studentId=${uid}`);
            if (subRes.ok) {
              const submissions = await subRes.json();
              if (!submissions || submissions.length === 0) {
                urgent.push(assignment);
              }
            } else {
              // If submission check fails, assume not submitted
              urgent.push(assignment);
            }
          } catch (err) {
            // If error checking submission, include it to be safe
            urgent.push(assignment);
          }
        }
      }
      
      setUrgentAssignments(urgent);
    } catch (error) {
      console.error("Error fetching urgent assignments:", error);
      setUrgentAssignments([]);
    }
  };

  // Courses state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    subject: "",
  });

  // Hover dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimerRef = useRef(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    setLoading(true); // Start loading
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch user data from MongoDB API
          const res = await fetch(`/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            const userRole =
              data.user.role === "instructor" ? "instructor" : "student";
            setUsername(data.user.username || currentUser.email.split("@")[0]);
            setIsAdmin(userRole === "instructor");

            // [CHANGE] Call fetchCourses *after* we know the user's role
            await fetchCourses(userRole, currentUser.uid);
            
            // Fetch urgent assignments for students
            if (userRole === "student") {
              await fetchUrgentAssignments(currentUser.uid);
            }
          } else {
            // User not found
            setUsername(currentUser.email.split("@")[0]);
            setIsAdmin(false);
            // [CHANGE] Fetch all courses for non-instructors
            await fetchCourses("student", currentUser.uid); // Pass uid even if student
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUsername(currentUser.email.split("@")[0]);
          setIsAdmin(false);
          // [CHANGE] Fetch all courses on error
          await fetchCourses("student", currentUser.uid); // Pass uid even if student
        } finally {
          setLoading(false); // Stop loading
        }
      } else {
        // Not logged in
        setUser(null);
        setUsername("");
        setIsAdmin(false);
        // [CHANGE] Fetch all courses for a logged-out user
        await fetchCourses(null, null); // No role, no uid
        setLoading(false); // Stop loading
      }
    });
    return () => unsubscribe();
  }, []); // The empty dependency array is correct!

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isLoginOpen || isRegisterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isLoginOpen, isRegisterOpen]);

  // [NEW] Helper to generate the 6-digit class code
  const generateCourseCode = (prof, course) => {
    const p = (prof || "USER").slice(0, 2).toUpperCase();
    const c = (course || "COURSE").slice(0, 2).toUpperCase();
    const r = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${p}${c}${r}`;
  };

  // Create course - UPDATED TO POST TO API
  const handleCreateCourse = async () => {
    if (!user) {
      toast.error("You must be logged in to create a course.");
      return;
    }

    // [NEW] Generate the course code
    const uniqueCourseCode = generateCourseCode(username, newCourse.title);
    const loadingToastId = toast.loading("Creating course...");

    try {
      const courseData = {
        title: newCourse.title,
        description: newCourse.description,
        subject: newCourse.subject,
        instructorName: username, // Send instructor's name
        instructorId: user.uid, // Send instructor's ID
        courseCode: uniqueCourseCode, // [NEW] Send the code
      };

      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courseData),
      });

      // [CHANGE] Get the response data to check for errors
      const responseData = await response.json();

      if (!response.ok) {
        // [CHANGE] Show the specific error from the API
        throw new Error(
          responseData.error || "Failed to create course on server"
        );
      }

      // Success
      toast.success("Course created successfully!", { id: loadingToastId });
      setNewCourse({ title: "", description: "", subject: "" });
      setIsCreateDialogOpen(false);

      // [CHANGE] Refresh the courses list using the new function
      await fetchCourses(isAdmin ? "instructor" : "student", user.uid);
    } catch (error) {
      console.error("Error creating course:", error);
      // [CHANGE] Show the specific error.message
      toast.error(`Error: ${error.message}`, { id: loadingToastId });
    }
  };

  // [NEW] Function to handle student enrolling in a course
  const handleEnrollInCourse = async () => {
    if (!joinCourseCode.trim() || !user) {
      toast.error("Please enter a course code.");
      return;
    }

    const loadingToastId = toast.loading("Enrolling in course...");

    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: joinCourseCode.trim().toUpperCase(),
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to enroll in course");
      }

      toast.success("Enrolled successfully!", { id: loadingToastId });
      setIsJoinDialogOpen(false);
      setJoinCourseCode("");

      // Refresh the course list to show the newly joined course
      await fetchCourses(isAdmin ? "instructor" : "student", user.uid);
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: loadingToastId });
    }
  };

  // [NEW] Function to handle student unenrolling from a course
  const handleUnenrollFromCourse = async (courseId, courseName) => {
    if (!user) {
      toast.error("You must be logged in to unenroll.");
      return;
    }

    const loadingToastId = toast.loading("Unenrolling from course...");

    try {
      const response = await fetch("/api/courses/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unenroll from course");
      }

      toast.success(`Unenrolled from ${courseName} successfully!`, {
        id: loadingToastId,
      });

      // Refresh the course list to remove the unenrolled course
      await fetchCourses(isAdmin ? "instructor" : "student", user.uid);
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: loadingToastId });
    }
  };

  // ... (Commented out navbar remains) ...

  return (
    <div className="min-h-screen bg-background relative">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Courses & Dashboard */}
<<<<<<< HEAD
            {/* Buttons row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isAdmin ? (
                <>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-transparent"
                    asChild
                  >
                    <a href="/admin">
                      <FileText className="w-6 h-6" />
                      <span className="text-sm">Admin Dashboard</span>
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-transparent"
                    asChild
                  >
                    <a href="/assignments">
                      <FileText className="w-6 h-6" />
                      <span className="text-sm">Assignments</span>
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-transparent"
                    asChild
                  >
                    <a href="/student/progress">
                      <BarChart3 className="w-6 h-6" />
                      <span className="text-sm">My Progress</span>
                    </a>
                  </Button>
                </>
              )}

=======
          {/* Buttons row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isAdmin ? (
              <>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-transparent"
                  asChild
                >
                  <a href="/admin">
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">Admin Dashboard</span>
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-20 flex-col gap-2 bg-transparent"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-sm">View Analytics</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-transparent"
                  asChild
                >
                  <a href="/assignments">
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">Assignments</span>
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-20 flex-col gap-2 bg-transparent"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-sm">View Analytics</span>
                </Button>
              </>
            )}
>>>>>>> 1214936e50a850c188d844eea5500790ce368916
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 bg-transparent"
              asChild
            >
              <a href="/ai-tools/chatbot">
                <Sparkles className="w-6 h-6" />
                <span className="text-sm">AI Tools</span>
              </a>
            </Button>
            {user?.email?.includes("@instructor.com") ||
            user?.email?.includes("@admin.com") ? (
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <Users className="w-6 h-6" />
                <span className="text-sm">Manage Classroom</span>
              </Button>
            ) : null}
          </div>

          {/* Courses List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  My Course
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your class and track progress
                </p>
              </div>

              {/* [NEW] Wrapper for the two dialog buttons */}
              <div className="flex gap-2">
                {/* "Create Course" Dialog for Instructors */}
                {isAdmin && (
                  <Dialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="cursor-pointer bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create New Course</DialogTitle>
                        <DialogDescription>
                          Set up a new classroom for your students
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="title">Course Title</Label>
                          <Input
                            id="title"
                            value={newCourse.title}
                            onChange={(e) =>
                              setNewCourse({
                                ...newCourse,
                                title: e.target.value,
                              })
                            }
                            placeholder="e.g., Introduction to Python"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newCourse.description}
                            onChange={(e) =>
                              setNewCourse({
                                ...newCourse,
                                description: e.target.value,
                              })
                            }
                            placeholder="Brief description of the course"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Select
                            value={newCourse.subject}
                            onValueChange={(value) =>
                              setNewCourse({ ...newCourse, subject: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="computer-science">
                                Computer Science
                              </SelectItem>
                              <SelectItem value="mathematics">
                                Mathematics
                              </SelectItem>
                              <SelectItem value="physics">Physics</SelectItem>
                              <SelectItem value="chemistry">
                                Chemistry
                              </SelectItem>
                              <SelectItem value="biology">Biology</SelectItem>
                              <SelectItem value="literature">
                                Literature
                              </SelectItem>
                              <SelectItem value="history">History</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateCourse}
                          disabled={!newCourse.title}
                        >
                          Create Course
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* [NEW] "Join Course" Dialog for Students */}
                {!isAdmin &&
                  user && ( // Only show if logged in and *not* an admin
                    <Dialog
                      open={isJoinDialogOpen}
                      onOpenChange={setIsJoinDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button className="cursor-pointer bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Join Course
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Join a New Course</DialogTitle>
                          <DialogDescription>
                            Enter the 6-digit course code from your instructor.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="course-code">Course Code</Label>
                            <Input
                              id="course-code"
                              value={joinCourseCode}
                              onChange={(e) =>
                                setJoinCourseCode(e.target.value)
                              }
                              placeholder="e.g., JDCS5R"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsJoinDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleEnrollInCourse}>Join</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
              </div>
            </div>
            {/* Urgent Assignments Alert - Students Only */}
            {!isAdmin && urgentAssignments.length > 0 && (
              <Card className="border-red-500 border-2 urgent-assignment-alert bg-red-50 dark:bg-red-950 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="urgent-badge-blink rounded-full p-1.5 shrink-0">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">
                        ⚠️ {urgentAssignments.length} Assignment
                        {urgentAssignments.length > 1 ? "s" : ""} Due Within 24
                        Hours!
                      </h3>
                      <div className="space-y-2">
                        {urgentAssignments.slice(0, 3).map((assignment) => {
                          const deadline = new Date(assignment.deadline);
                          const hoursLeft = Math.floor(
                            (deadline - new Date()) / (1000 * 60 * 60)
                          );
                          const minutesLeft = Math.floor(
                            ((deadline - new Date()) % (1000 * 60 * 60)) /
                              (1000 * 60)
                          );

                          return (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-gray-900 rounded p-2 border-l-2 border-red-500"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {assignment.title}
                                </p>
                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mt-0.5">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span className="font-medium">
                                    {hoursLeft}h {minutesLeft}m left
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push("/student");
                                }}
                              >
                                Submit
                              </Button>
                            </div>
                          );
                        })}
                        {urgentAssignments.length > 3 && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                            +{urgentAssignments.length - 3} more urgent assignment
                            {urgentAssignments.length - 3 > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

              {/* Urgent Assignments Alert - Students Only */}
              {!isAdmin && urgentAssignments.length > 0 && (
                <Card className="border-red-500 border-2 urgent-assignment-alert bg-red-50 dark:bg-red-950 mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="urgent-badge-blink rounded-full p-1.5 shrink-0">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">
                          ⚠️ {urgentAssignments.length} Assignment{urgentAssignments.length > 1 ? 's' : ''} Due Within 24 Hours!
                        </h3>
                        <div className="space-y-2">
                          {urgentAssignments.slice(0, 3).map((assignment) => {
                            const deadline = new Date(assignment.deadline);
                            const hoursLeft = Math.floor((deadline - new Date()) / (1000 * 60 * 60));
                            const minutesLeft = Math.floor(((deadline - new Date()) % (1000 * 60 * 60)) / (1000 * 60));
                            
                            return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-gray-900 rounded p-2 border-l-2 border-red-500"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {assignment.title}
                                  </p>
                                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mt-0.5">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span className="font-medium">{hoursLeft}h {minutesLeft}m left</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push('/student');
                                  }}
                                >
                                  Submit
                                </Button>
                              </div>
                            );
                          })}
                          {urgentAssignments.length > 3 && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                              +{urgentAssignments.length - 3} more urgent assignment{urgentAssignments.length - 3 > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {loading ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Loading courses...</p>
              </Card>
            ) : courses.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isAdmin
                    ? "Create your first course to get started"
                    : "Click 'Join Course' to enroll"}
                </p>
                {isAdmin && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer group h-full flex flex-col"
                    onClick={() => {
                      console.log("Navigating with id:", course.id);
                      if (course.id) {
                        router.push(`/classroom/${course.id}`);
                      } else {
                        toast.error("Error: This course has no ID.");
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="w-full h-24 bg-muted rounded-lg mb-4 flex items-center justify-center border border-border">
                        <BookOpen className="w-8 h-8 text-foreground" />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {course.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4 flex-1 flex flex-col">
                       <div className="flex items-center justify-between text-sm">
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary" className="text-xs">
                             Instructor: {course.instructorName}
                           </Badge>
                         </div>
                         <div className="flex items-center gap-1 text-muted-foreground">
                           <Users className="w-4 h-4" />
                           <span>{course.students?.length || 0}</span>
                         </div>
                       </div>

                       {/* Show assignment progress for students only */}
                       {!isAdmin && courseProgress[course.id] && (
                         <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                           <div className="flex items-center justify-between text-sm">
                             <span className="text-muted-foreground font-medium">
                               Assignment Progress
                             </span>
                             <span className="font-semibold text-primary">
                               {courseProgress[course.id].submittedAssignments}/
                               {courseProgress[course.id].totalAssignments}
                             </span>
                           </div>
                           {courseProgress[course.id].totalAssignments > 0 ? (
                             <>
                               <Progress
                                 value={courseProgress[course.id].percentage}
                                 className="h-2.5"
                               />
                               <div className="flex items-center justify-between text-xs">
                                 <span className="text-muted-foreground">
                                   {courseProgress[course.id].totalAssignments -
                                     courseProgress[course.id]
                                       .submittedAssignments}{" "}
                                   remaining
                                 </span>
                                 <span className="font-medium text-primary">
                                   {courseProgress[course.id].percentage}%
                                   complete
                                 </span>
                               </div>
                             </>
                           ) : (
                             <div className="text-xs text-muted-foreground text-center py-1">
                               No assignments yet
                             </div>
                           )}
                         </div>
                       )}

                       {/* Keep the old progress bar for backward compatibility (if exists in course data) */}
                       {course.progress > 0 && isAdmin && (
                         <div className="space-y-2">
                           <div className="flex items-center justify-between text-sm">
                             <span className="text-muted-foreground">
                               Progress
                             </span>
                             <span className="font-medium">
                               {course.progress}%
                             </span>
                           </div>
                           <div className="w-full bg-secondary rounded-full h-2">
                             <div
                               className="bg-foreground h-2 rounded-full transition-all duration-300"
                               style={{ width: `${course.progress}%` }}
                             />
                           </div>
                         </div>
                       )}

                       <div className="flex items-center justify-between pt-2">
                         <div className="flex gap-2">
                           {course.assignments > 0 && (
                             <Badge variant="secondary" className="text-xs">
                               {course.assignments} assignments
                             </Badge>
                           )}
                           <Badge variant="outline" className="text-xs">
                             <Brain className="w-3 h-3 mr-1" />
                             AI Enhanced
                           </Badge>
                         </div>
                       </div>
                       {course.nextClass && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                           <Calendar className="w-4 h-4" />
                           <span>Next: {course.nextClass}</span>
                         </div>
                       )}

                       {/* Unenroll button for students only */}
                       {!isAdmin && user && (
                         <div className="pt-3 border-t mt-auto">
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="w-full border-red-400 text-red-600 hover:bg-red-50"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <LogOut className="w-4 h-4 mr-1" />
                                 Unenroll from Course
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent
                               onClick={(e) => e.stopPropagation()}
                             >
                               <AlertDialogHeader>
                                 <AlertDialogTitle>
                                   Unenroll from {course.name}?
                                 </AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Are you sure you want to unenroll from this
                                   course? You will lose access to all course
                                   materials, assignments, and class discussions.
                                   You can re-enroll later using the course code:{" "}
                                   <strong>{course.courseCode}</strong>
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   Cancel
                                 </AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleUnenrollFromCourse(
                                       course.id,
                                       course.name
                                     );
                                   }}
                                   className="bg-red-600 text-white hover:bg-red-700"
                                 >
                                   Unenroll
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </div>
                       )}
              </CardContent>
            </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
