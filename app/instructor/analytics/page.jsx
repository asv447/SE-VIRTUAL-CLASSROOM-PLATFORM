"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  FileText,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";

export default function InstructorAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user is instructor
        try {
          const res = await fetch(`/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data.user.role !== "instructor") {
              toast.error("Access denied. Instructors only.");
              router.push("/");
              return;
            }
            await fetchInstructorAnalytics(currentUser.uid);
          }
        } catch (err) {
          console.error("Error checking user role:", err);
          router.push("/");
        }
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchInstructorAnalytics = async (instructorId) => {
    setLoading(true);
    try {
      // Fetch instructor's courses
      const coursesRes = await fetch(
        `/api/courses?role=instructor&userId=${instructorId}`
      );
      if (!coursesRes.ok) throw new Error("Failed to fetch courses");
      const coursesData = await coursesRes.json();
      setCourses(coursesData);

      // Fetch analytics for each course
      const analyticsPromises = coursesData.map(async (course) => {
        try {
          const res = await fetch(
            `/api/instructor/analytics?courseId=${course.id}`
          );
          if (res.ok) {
            const data = await res.json();
            return { courseId: course.id, data };
          }
          return { courseId: course.id, data: null };
        } catch (err) {
          console.error(`Error fetching analytics for course ${course.id}:`, err);
          return { courseId: course.id, data: null };
        }
      });

      const analyticsResults = await Promise.all(analyticsPromises);
      const analyticsMap = {};

      analyticsResults.forEach(({ courseId, data }) => {
        if (data) {
          analyticsMap[courseId] = data;
        }
      });

      setAnalyticsData(analyticsMap);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Course Analytics
              </h1>
              <p className="text-muted-foreground mt-2">
                Track student submissions and performance across your courses
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Course-wise Analytics */}
        <div>
          {/* <h2 className="text-2xl font-bold mb-4">Course-wise Analytics</h2> */}
          {courses.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground">
                Create your first course to view analytics
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {courses.map((course) => {
                const analytics = analyticsData[course.id];
                if (!analytics) return null;

                const submissionRate =
                  analytics.totalStudents * analytics.totalAssignments > 0
                    ? Math.round(
                        (analytics.totalSubmissions /
                          (analytics.totalStudents *
                            analytics.totalAssignments)) *
                          100
                      )
                    : 0;

                return (
                  <Card
                    key={course.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {course.name || course.title}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span className="text-xs">
                              {analytics.totalStudents} students enrolled
                            </span>
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            submissionRate >= 80
                              ? "default"
                              : submissionRate >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {submissionRate}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Submission Rate</span>
                          <span>{submissionRate}%</span>
                        </div>
                        <Progress value={submissionRate} className="h-2.5" />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-3 pt-2">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <FileText className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                          <p className="text-xs text-muted-foreground">
                            Assignments
                          </p>
                          <p className="text-lg font-bold">
                            {analytics.totalAssignments}
                          </p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-600" />
                          <p className="text-xs text-muted-foreground">
                            Submitted
                          </p>
                          <p className="text-lg font-bold">
                            {analytics.totalSubmissions}
                          </p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                          <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
                          <p className="text-xs text-muted-foreground">Pending</p>
                          <p className="text-lg font-bold">
                            {analytics.pendingCount}
                          </p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                          <p className="text-xs text-muted-foreground">
                            Overdue
                          </p>
                          <p className="text-lg font-bold">
                            {analytics.overdueCount}
                          </p>
                        </div>
                      </div>

                      {/* Students with Overdue Assignments */}
                      {analytics.studentsWithOverdue &&
                        analytics.studentsWithOverdue.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-sm font-medium text-red-600 mb-2">
                              Students with Overdue Assignments ({analytics.studentsWithOverdue.length}):
                            </p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {analytics.studentsWithOverdue.map((student) => (
                                <div
                                  key={student.studentId}
                                  className="flex items-center justify-between text-xs p-2 bg-red-50 dark:bg-red-950/20 rounded"
                                >
                                  <span className="font-medium">
                                    {student.studentName}
                                  </span>
                                  <Badge variant="destructive" className="text-xs">
                                    {student.overdueCount} overdue
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => router.push(`/classroom/${course.id}`)}
                      >
                        View Course Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
