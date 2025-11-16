"use client";

import React, { useEffect, useState, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { format } from "date-fns";
import {
  BookOpen,
  Upload,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AssignmentsPage() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState({});
  const [uploading, setUploading] = useState({});
  const fileInputRefs = useRef({});
  const [userProfile, setUserProfile] = useState(null);
  const { toast } = useToast();

  // Filter states
  const [filterCourse, setFilterCourse] = useState("all");
  // Single specific deadline date filter (exact day match)
  const [filterDeadline, setFilterDeadline] = useState("");
  // Dynamic course options gathered from assignments themselves (covers courses user may no longer be enrolled in)
  const [assignmentCourseOptions, setAssignmentCourseOptions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserProfile(user.uid);
      loadData();
    } else {
      setPageLoading(false);
    }
  }, [user]);

  // Subscribe to SSE notifications to refresh submissions instantly
  useEffect(() => {
    if (!user?.uid) return;
    const src = new EventSource(`/api/notifications/stream?uid=${encodeURIComponent(user.uid)}`);
    src.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === "notification") {
          const extra = data.extra || {};
          if (extra.type === "submission-graded" && extra.assignmentId) {
            // Refresh that assignment's submissions
            loadSubmissions(extra.assignmentId);
            // Inform the user immediately
            toast({ title: data.title || "Submission update", description: data.message || "" });
          }
        }
      } catch (_) {}
    };
    src.onerror = () => {
      // close and let polling/UI continue
      src.close();
    };
    return () => src.close();
  }, [user]);

  const fetchUserProfile = async (uid) => {
    if (!uid) {
      setUserProfile(null);
      return;
    }
    try {
      const res = await fetch(`/api/users/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.user || null);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setUserProfile(null);
    }
  };

  const loadData = async () => {
    setPageLoading(true);
    try {
      // Load courses first
      const coursesData = await loadCourses();
      // Then load assignments using the courses we just got
      if (coursesData && coursesData.length > 0) {
        await loadAssignmentsForCourses(coursesData);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const loadCourses = async () => {
    if (!user?.uid) return [];
    try {
      const url = `/api/courses?role=student&userId=${encodeURIComponent(
        user.uid
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const coursesArray = Array.isArray(data) ? data : [];
        setCourses(coursesArray);
        return coursesArray;
      } else {
        console.error("Failed to fetch enrolled courses", await res.text());
        setCourses([]);
        return [];
      }
    } catch (err) {
      console.error("Error loading courses:", err);
      setCourses([]);
      return [];
    }
  };

  const loadAssignmentsForCourses = async (coursesData) => {
    if (!user?.uid) {
      console.log("No user UID, skipping loadAssignments");
      return;
    }
    try {
      console.log("Courses data received:", coursesData);

      // Get course IDs from the courses data passed in
      const enrolledCourseIds = coursesData
        .map((course) => {
          const courseId = course.id || course._id;
          console.log(`Course object:`, course, `-> extracted ID:`, courseId);
          return courseId;
        })
        .filter(Boolean);

      console.log(
        "Enrolled course IDs to fetch assignments for:",
        enrolledCourseIds
      );

      if (enrolledCourseIds.length === 0) {
        // No enrolled courses, so no assignments to show
        console.log("No enrolled courses found");
        setAssignments([]);
        setAssignmentCourseOptions([]);
        return;
      }

      // Fetch assignments for each enrolled course
      let allAssignments = [];

      for (const courseId of enrolledCourseIds) {
        try {
          const url = `/api/assignments?classId=${encodeURIComponent(
            courseId
          )}&role=student&userId=${encodeURIComponent(user.uid)}`;
          console.log(`Fetching assignments from: ${url}`);
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            console.log(`Assignments for course ${courseId}:`, data);
            allAssignments = allAssignments.concat(data);
          } else {
            console.error(
              `Failed to fetch assignments for course ${courseId}:`,
              res.status
            );
            const errorText = await res.text();
            console.error(`Response:`, errorText);
          }
        } catch (err) {
          console.error(
            `Error loading assignments for course ${courseId}:`,
            err
          );
        }
      }

      console.log("All assignments combined:", allAssignments);
      setAssignments(allAssignments);

      // Build dynamic list of courses from assignments
      const map = new Map();
      allAssignments.forEach((a) => {
        const cid = a.courseId || a.classId;
        if (!cid) return;
        if (!map.has(cid)) {
          map.set(cid, {
            id: cid,
            name: a.courseTitle || a.courseName || a.classTitle || cid,
          });
        }
      });
      setAssignmentCourseOptions(Array.from(map.values()));

      // Load submissions for each assignment
      allAssignments.forEach((assignment) => {
        loadSubmissions(assignment.id);
      });
    } catch (err) {
      console.error("Error loading assignments:", err);
    }
  };

  const loadAssignments = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(
        `/api/assignments?role=student&userId=${encodeURIComponent(
          user.uid
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
        // Build dynamic list of courses from assignments
        const map = new Map();
        data.forEach((a) => {
          const cid = a.courseId || a.classId;
          if (!cid) return;
          if (!map.has(cid)) {
            map.set(cid, {
              id: cid,
              name: a.courseTitle || a.courseName || a.classTitle || cid,
            });
          }
        });
        setAssignmentCourseOptions(Array.from(map.values()));
        // Load submissions for each assignment
        data.forEach((assignment) => {
          loadSubmissions(assignment.id);
        });
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
        setSubmissions((prev) => ({
          ...prev,
          [assignmentId]: data,
        }));
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const handleFileSelect = (assignmentId, file) => {
    setSelectedFile((prev) => ({
      ...prev,
      [assignmentId]: file || null,
    }));
  };

  const openFilePicker = (assignmentId) => {
    const input = fileInputRefs.current[assignmentId];
    if (input) {
      input.click();
    }
  };

  const submitAssignment = async (assignmentId) => {
    const file = selectedFile[assignmentId];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please choose a file before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading((prev) => ({
      ...prev,
      [assignmentId]: true,
    }));

    try {
      const formData = new FormData();
      const preferredName =
        userProfile?.username ||
        user.displayName ||
        user.email?.split("@")[0] ||
        user.email;
      const preferredEmail = userProfile?.email || user.email || "";

      formData.append("assignmentId", assignmentId);
      formData.append("studentId", user.uid);
      formData.append("studentName", preferredName);
      formData.append("studentEmail", preferredEmail);
      formData.append("file", file);

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSelectedFile((prev) => ({
          ...prev,
          [assignmentId]: null,
        }));
        const input = fileInputRefs.current[assignmentId];
        if (input) {
          input.value = "";
        }
        await loadSubmissions(assignmentId);
        toast({
          title: "Assignment submitted",
          description: "Your file has been uploaded successfully.",
        });
      } else {
        const error = await res.json();
        toast({
          title: "Submission failed",
          description: error?.error || "Server returned an error.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error submitting assignment:", err);
      toast({
        title: "Submission failed",
        description: err.message || "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setUploading((prev) => ({
        ...prev,
        [assignmentId]: false,
      }));
    }
  };

  const getCourseName = (assignment) => {
    // Prefer server-enriched title
    if (assignment?.courseTitle) return assignment.courseTitle;
    const cid = assignment?.courseId || assignment?.classId;
    const course = courses.find((c) => c.id === cid);
    return course
      ? `${course.name} (${course.courseCode || course.code || ""})`
      : "Unknown Course";
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const hasSubmitted = (assignmentId) => {
    const assignmentSubmissions = submissions[assignmentId] || [];
    return assignmentSubmissions.some((sub) => sub.studentId === user?.uid);
  };

  const getSubmission = (assignmentId) => {
    const assignmentSubmissions = submissions[assignmentId] || [];
    return assignmentSubmissions.find((sub) => sub.studentId === user?.uid);
  };

  const groupAssignmentsByStatus = () => {
    const pending = [];
    const submitted = [];
    const overdue = [];

    assignments.forEach((assignment) => {
      const submittedStatus = hasSubmitted(assignment.id);
      const overdueStatus = isOverdue(assignment.deadline);

      if (submittedStatus) {
        submitted.push(assignment);
      } else if (overdueStatus) {
        overdue.push(assignment);
      } else {
        pending.push(assignment);
      }
    });

    return { pending, submitted, overdue };
  };

  const applyFilters = (assignmentsList) => {
    let filtered = [...assignmentsList];

    if (filterCourse && filterCourse !== "all") {
      filtered = filtered.filter(
        (a) => (a.courseId || a.classId) === filterCourse
      );
    }

    if (filterDeadline) {
      filtered = filtered.filter((a) => {
        const assignmentDate = new Date(a.deadline).toDateString();
        const filterDate = new Date(filterDeadline).toDateString();
        return assignmentDate === filterDate;
      });
    }
    return filtered;
  };

  const clearFilters = () => {
    setFilterCourse("all");
    setFilterDeadline("");
  };

  const safeFormatDate = (date) => {
    if (!date) return "No deadline";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "No deadline";
    try {
      return format(d, "PPP p");
    } catch (e) {
      return d.toString();
    }
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Assignments</h1>
        <p className="text-gray-600">
          Please log in to access your assignments.
        </p>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p>Loading your assignments...</p>
      </div>
    );
  }

  // Combine enrolled courses and assignment-derived courses (dedupe by id)
  const combinedCourses = (() => {
    const map = new Map();
    assignmentCourseOptions.forEach((c) => map.set(c.id, c));
    courses.forEach((c) => {
      const cid = c.id || c._id || c.courseId;
      if (!cid) return;
      if (!map.has(cid)) {
        map.set(cid, {
          id: cid,
          name: c.name || c.title || c.courseTitle || cid,
        });
      } else {
        // prefer nicer name if available
        const existing = map.get(cid);
        const betterName = c.name || c.title || c.courseTitle;
        if (betterName && existing.name === existing.id) {
          map.set(cid, { id: cid, name: betterName });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  })();

  const { pending, submitted, overdue } = groupAssignmentsByStatus();
  const filteredPending = applyFilters(pending);
  const filteredSubmitted = applyFilters(submitted);
  const filteredOverdue = applyFilters(overdue);

  const AssignmentCard = ({ assignment, showSubmitButton = true }) => {
    const courseIdForNav = assignment.courseId || assignment.classId;
    const submission = getSubmission(assignment.id);
    const isOverdueStatus = isOverdue(assignment.deadline);

    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            {!submission && (
              <Badge variant={isOverdueStatus ? "destructive" : "secondary"}>
                {isOverdueStatus ? "Overdue" : "Active"}
              </Badge>
            )}
          </div>
          <CardDescription>{assignment.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {getCourseName(assignment)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-primary" />
              Due: {safeFormatDate(assignment.deadline)}
            </div>
          </div>

          {assignment.fileUrl && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={assignment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Assignment
                </a>
              </Button>
            </div>
          )}

          {submission ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Submitted</span>
              </div>
              <p className="text-xs text-gray-500">
                Submitted on: {safeFormatDate(submission.submittedAt)}
              </p>
              {submission.fileUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View Your Submission
                  </a>
                </Button>
              )}
              {(submission.grade !== null && submission.grade !== undefined) ||
              (submission.feedback && submission.feedback.trim() !== "") ? (
                <div className="rounded-md border border-green-100 bg-green-50 p-3 text-sm">
                  {submission.grade !== null &&
                  submission.grade !== undefined ? (
                    <p className="font-medium text-green-700">
                      Grade: {submission.grade}
                      {submission.maxScore !== null &&
                      submission.maxScore !== undefined
                        ? ` / ${submission.maxScore}`
                        : ""}
                    </p>
                  ) : null}
                  {submission.feedback && submission.feedback.trim() !== "" ? (
                    <p className="mt-1 text-green-600">
                      Feedback: {submission.feedback}
                    </p>
                  ) : null}
                  {submission.gradedAt ? (
                    <p className="mt-1 text-xs text-green-500">
                      Graded on {safeFormatDate(submission.gradedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : showSubmitButton ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload your submission *
                </label>
                <input
                  ref={(el) => {
                    if (el) {
                      fileInputRefs.current[assignment.id] = el;
                    } else {
                      delete fileInputRefs.current[assignment.id];
                    }
                  }}
                  type="file"
                  onChange={(e) =>
                    handleFileSelect(assignment.id, e.target.files?.[0] || null)
                  }
                  accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png,.py,.js,.java,.cpp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openFilePicker(assignment.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                {selectedFile[assignment.id] ? (
                  <p className="text-xs text-gray-600 mt-2">
                    Selected: {selectedFile[assignment.id].name}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">No file selected</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, TXT, ZIP, Images, Code files
                </p>
              </div>
              <Button
                onClick={() => submitAssignment(assignment.id)}
                disabled={
                  !selectedFile[assignment.id] ||
                  uploading[assignment.id] ||
                  isOverdueStatus
                }
                className="w-full"
              >
                {uploading[assignment.id] ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Assignment
                  </>
                )}
              </Button>
              {isOverdueStatus && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This assignment is overdue
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Cannot submit - deadline has passed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Assignments</h1>
        <p className="text-gray-600">
          Manage and submit your course assignments
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({filteredPending.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({submitted.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Course Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course</label>
                  <Select value={filterCourse} onValueChange={setFilterCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {combinedCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Single Deadline Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deadline Date</label>
                  <Input
                    type="date"
                    value={filterDeadline}
                    onChange={(e) => setFilterDeadline(e.target.value)}
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(filterCourse !== "all" || filterDeadline) && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignments List */}
          {filteredPending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                {pending.length === 0 ? (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700">
                      All caught up!
                    </h3>
                    <p className="text-gray-600">
                      You have no pending assignments.
                    </p>
                  </>
                ) : (
                  <>
                    <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">
                      No assignments match your filters
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filter criteria.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPending.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  showSubmitButton={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          {filteredSubmitted.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">
                  No submissions match your filters
                </h3>
                <p className="text-gray-600">
                  Adjust or clear filters to see more.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSubmitted.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  showSubmitButton={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {filteredOverdue.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-blue-700">
                  No overdue assignments match filters
                </h3>
                <p className="text-gray-600">
                  Adjust or clear filters to see more.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOverdue.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  showSubmitButton={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
