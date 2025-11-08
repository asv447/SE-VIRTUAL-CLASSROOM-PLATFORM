"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/assignments/${id}`);
        if (!res.ok) {
          setError("Failed to load assignment");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAssignment(data); // route returns { id, deadline } currently; could be expanded later
      } catch (e) {
        setError("Network error loading assignment");
      } finally {
        setLoading(false);
      }
    };
    fetchAssignment();
  }, [id]);

  const safeFormatDate = (date) => {
    if (!date) return "No deadline";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "No deadline";
    try { return format(d, "PPP p"); } catch { return d.toString(); }
  };

  if (loading) {
    return <div className="p-6 max-w-3xl mx-auto">Loading assignment...</div>;
  }
  if (error) {
    return <div className="p-6 max-w-3xl mx-auto text-red-600">{error}</div>;
  }
  if (!assignment) {
    return <div className="p-6 max-w-3xl mx-auto">Assignment not found.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/student")}> 
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Assignment Details</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{assignment.title || "Assignment"}</CardTitle>
          <CardDescription>{assignment.description || "No description provided."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{assignment.courseTitle || assignment.classId || assignment.courseId || "Unknown Course"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Deadline: {safeFormatDate(assignment.deadline)}</span>
          </div>
          {assignment.fileUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={assignment.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Download Assignment File
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
