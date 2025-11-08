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
import { Upload } from "lucide-react";
import dynamic from "next/dynamic";
import useWhiteboardStore from "@/hooks/use-whiteboard";

const WhiteboardViewer = dynamic(
  () => import("@/components/whiteboard/WhiteboardViewer"),
  {
    ssr: false,
    loading: () => <p>Loading whiteboard...</p>,
  }
);
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
  MessageSquare,
  Sparkles,
  Edit3,
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
  const [pdfs, setPdfs] = useState([]);
  const [courses, setCourses] = useState([]);

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
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Could not load courses.");
    }
  };

  // Whiteboard state
  const { isOpen, currentFile, setCurrentFile, closeWhiteboard } =
    useWhiteboardStore();

  const handleCloseWhiteboard = () => {
    try {
      if (currentFile && String(currentFile._id).startsWith("local-")) {
        // Revoke object URL for locally uploaded file to free memory
        URL.revokeObjectURL(currentFile.fileUrl);
      }
    } catch (e) {
      // ignore
    }
    closeWhiteboard();
  };

  // Fetch PDFs on component mount
  useEffect(() => {
    fetchPDFs();
  }, []);

  // Function to fetch PDFs
  const fetchPDFs = async () => {
    try {
      const response = await fetch("/api/assignments");
      if (!response.ok) throw new Error("Failed to fetch PDFs");
      const data = await response.json();
      // Filter only PDF files
      const pdfFiles = data.filter((file) =>
        file.fileUrl?.toLowerCase().endsWith(".pdf")
      );
      setPdfs(pdfFiles);
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      toast.error("Failed to load PDF documents");
    }
  };

  // Function to handle saving edited PDF
  const handleSave = async (imageData, filename) => {
    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append("file", blob, filename);

      // Upload the edited file
      const response = await fetch("/api/assignments", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save file");

      toast.success("Edited file saved successfully");
      closeWhiteboard();
      fetchPDFs(); // Refresh the list
    } catch (error) {
      console.error("Error saving edited file:", error);
      toast.error("Failed to save edited file");
    }
  };

  // Upload/open local PDF file state
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f && f.type === "application/pdf") {
      setSelectedFile(f);
    } else if (f) {
      toast.error("Please select a PDF file");
    }
  };

  const openLocalFileInWhiteboard = () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    // Create an object URL for local preview and editing
    const url = URL.createObjectURL(selectedFile);
    // Use setCurrentFile to open whiteboard. Keep a small local id.
    setCurrentFile({
      fileUrl: url,
      fileName: selectedFile.name,
      _id: `local-${Date.now()}`,
    });
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

  // ... (Commented out navbar remains) ...

  return (
    <div className="min-h-screen bg-background relative">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Courses & Dashboard */}
          <div className="lg:col-span-3 space-y-6">
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
                    className="h-20 flex-col gap-2 bg-transparent"
                    asChild
                  >
                    <a href="/assignments">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">Create Assignment</span>
                    </a>
                  </Button>
                </>
              ) : (
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
              )}
              <Button
                variant="outline"
                className="cursor-pointer h-20 flex-col gap-2 bg-transparent"
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-sm">View Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent cursor-pointer"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">Send Announcement</span>
              </Button>
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

            {/* PDFs for Whiteboard */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    PDF Documents
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Open and edit PDF documents with whiteboard tools
                  </p>
                </div>
              </div>
              {/* Upload local PDF and open in whiteboard */}
              <div className="flex items-center gap-2">
                <input
                  id="local-pdf-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="local-pdf-input">
                  <Button variant="outline" asChild>
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Upload & Open
                    </span>
                  </Button>
                </label>
                <Button
                  disabled={!selectedFile}
                  onClick={openLocalFileInWhiteboard}
                >
                  Open Selected
                </Button>
                {selectedFile && (
                  <span className="text-sm text-muted-foreground">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pdfs.map((pdf) => (
                  <Card
                    key={pdf._id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setCurrentFile(pdf)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm truncate">
                          {pdf.fileName}
                        </CardTitle>
                        <Edit3 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardDescription>
                        Click to edit with whiteboard
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {isOpen && currentFile && (
              <WhiteboardViewer
                pdfUrl={currentFile.fileUrl}
                onSave={handleSave}
                onClose={handleCloseWhiteboard}
              />
            )}

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
                  {!isAdmin && user && ( // Only show if logged in and *not* an admin
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
                <div className="max-w-md">
                  {courses.map((course) => (
                    <Card
                      key={course.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer group"
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
                      <CardContent className="space-y-4">
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
                        {course.progress > 0 && (
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">{/* Sidebar content */}</div>
        </div>
      </main>
    </div>
  );
}

