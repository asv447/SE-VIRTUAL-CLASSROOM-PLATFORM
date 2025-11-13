"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// [MODIFIED] Added Users icon
import { BookOpen, Calendar, ArrowLeft, Download, Users } from "lucide-react";
import { format } from "date-fns";

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let unsub = () => {};
    const fetchAssignment = async (role, uid) => {
      if (!id) return;
      try {
        const rolePart = role
          ? `?role=${encodeURIComponent(role)}&userId=${encodeURIComponent(uid)}`
          : "";
        const res = await fetch(`/api/assignments/${id}${rolePart}`);
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          setError("Failed to load assignment: " + errText);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAssignment(data);
      } catch (e) {
        setError("Network error loading assignment");
      } finally {
        setLoading(false);
      }
    };

    // subscribe to auth to determine current user and role
    unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setUserRole(null);
        // fetch without role (fallback)
        fetchAssignment(null, null);
        return;
      }
      setUser(u);
      try {
        const res = await fetch(`/api/users/${u.uid}`);
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const role = json?.user?.role || null;
          setUserRole(role);
          fetchAssignment(role, u.uid);
        } else {
          // fallback: fetch without explicit role
          fetchAssignment(null, null);
        }
      } catch (e) {
        fetchAssignment(null, null);
      }
    });

    return () => unsub();
  }, [id]);

  const safeFormatDate = (date) => {
    if (!date) return "No deadline";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "No deadline";
    try {
      return format(d, "PPP p");
    } catch {
      return d.toString();
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">Loading assignment...</div>
    );
  }
  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-red-600">
        {error}
      </div>
    );
  }
  if (!assignment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">Assignment not found.</div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        {/* [MODIFIED] Changed to router.back() to work for all roles */}
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Assignment Details</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{assignment.title || "Assignment"}</CardTitle>
          <CardDescription>
            {assignment.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>
              {assignment.courseTitle ||
                assignment.classId ||
                assignment.courseId ||
                "Unknown Course"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Deadline: {safeFormatDate(assignment.deadline)}</span>
          </div>

          {/* --- [NEW] Audience Badge --- */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {userRole === "instructor" &&
              assignment.audience?.type === "group"
                ? `Assigned to: ${
                    assignment.audience.groupIds?.length || 0
                  } Group(s)`
                : !assignment.audience ||
                  assignment.audience.type === "class"
                ? "Assigned to: Whole Class"
                : "Assigned to: Your Group"}
            </span>
          </div>
          {/* --- [END NEW] --- */}

          {assignment.fileUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={assignment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" /> Download Assignment
                File
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}