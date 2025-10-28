"use client";

import React, { useEffect, useState } from "react";
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
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState({});
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
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
    try {
      const res = await fetch("/api/courses");
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
        // Load submissions for each assignment
        data.forEach(assignment => {
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
        setSubmissions(prev => ({
          ...prev,
          [assignmentId]: data
        }));
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const handleFileSelect = (assignmentId, file) => {
    setSelectedFile(prev => ({
      ...prev,
      [assignmentId]: file
    }));
  };

  const submitAssignment = async (assignmentId) => {
    const file = selectedFile[assignmentId];
    if (!file) {
      alert("Please select a file to upload");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(prev => ({
      ...prev,
      [assignmentId]: true
    }));

    try {
      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("studentId", user.uid);
      formData.append("studentName", user.displayName || user.email);
      formData.append("file", file);

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSelectedFile(prev => ({
          ...prev,
          [assignmentId]: null
        }));
        await loadSubmissions(assignmentId);
        alert("Assignment submitted successfully!");
      } else {
        const error = await res.json();
        alert("Failed to submit assignment: " + error.error);
      }
    } catch (err) {
      console.error("Error submitting assignment:", err);
      alert("Failed to submit assignment");
    } finally {
      setUploading(prev => ({
        ...prev,
        [assignmentId]: false
      }));
    }
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.name} (${course.code})` : "Unknown Course";
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const hasSubmitted = (assignmentId) => {
    const assignmentSubmissions = submissions[assignmentId] || [];
    return assignmentSubmissions.some(sub => sub.studentId === user?.uid);
  };

  const getSubmission = (assignmentId) => {
    const assignmentSubmissions = submissions[assignmentId] || [];
    return assignmentSubmissions.find(sub => sub.studentId === user?.uid);
  };

  const groupAssignmentsByStatus = () => {
    const pending = [];
    const submitted = [];
    const overdue = [];

    assignments.forEach(assignment => {
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

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
        <p className="text-gray-600">Please log in to access your assignments.</p>
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

  const { pending, submitted, overdue } = groupAssignmentsByStatus();

  const AssignmentCard = ({ assignment, showSubmitButton = true }) => {
    const submission = getSubmission(assignment.id);
    const isOverdueStatus = isOverdue(assignment.deadline);

    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            <Badge variant={isOverdueStatus ? "destructive" : "secondary"}>
              {isOverdueStatus ? "Overdue" : "Active"}
            </Badge>
          </div>
          <CardDescription>{assignment.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {getCourseName(assignment.courseId)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due: {format(new Date(assignment.deadline), "PPP p")}
            </div>
          </div>

          {assignment.fileUrl && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={assignment.fileUrl} target="_blank" rel="noopener noreferrer">
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
                Submitted on: {format(new Date(submission.submittedAt), "PPP p")}
              </p>
              {submission.fileUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    View Your Submission
                  </a>
                </Button>
              )}
            </div>
          ) : showSubmitButton ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload your submission *
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileSelect(assignment.id, e.target.files[0])}
                  accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png,.py,.js,.java,.cpp"
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile[assignment.id] && (
                  <p className="text-xs text-gray-600 mt-2">
                    Selected: {selectedFile[assignment.id].name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, TXT, ZIP, Images, Code files
                </p>
              </div>
              <Button 
                onClick={() => submitAssignment(assignment.id)}
                disabled={!selectedFile[assignment.id] || uploading[assignment.id] || isOverdueStatus}
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
              <p className="text-sm text-gray-600">Cannot submit - deadline has passed</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({submitted.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({overdue.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-700">All caught up!</h3>
                <p className="text-gray-600">You have no pending assignments.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pending.map((assignment) => (
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
          {submitted.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No submissions yet</h3>
                <p className="text-gray-600">You haven't submitted any assignments.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {submitted.map((assignment) => (
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
          {overdue.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-blue-700">No overdue assignments</h3>
                <p className="text-gray-600">Great job! All assignments are submitted on time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {overdue.map((assignment) => (
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
