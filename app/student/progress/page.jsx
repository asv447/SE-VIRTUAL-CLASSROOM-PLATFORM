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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";

export default function StudentProgressPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [overallStats, setOverallStats] = useState({
    totalAssignments: 0,
    completedAssignments: 0,
    overdueAssignments: 0,
    percentage: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user is a student (not instructor)
        try {
          const res = await fetch(`/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data.user.role === "instructor") {
              toast.error("This page is for students only. Redirecting to instructor analytics...");
              router.push("/instructor/analytics");
              return;
            }
          }
        } catch (err) {
          console.error("Error checking user role:", err);
        }
        await fetchStudentProgress(currentUser.uid);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchStudentProgress = async (userId) => {
    setLoading(true);
    try {
      // Fetch enrolled courses
      const coursesRes = await fetch(
        `/api/courses?role=student&userId=${userId}`
      );
      if (!coursesRes.ok) throw new Error("Failed to fetch courses");
      const coursesData = await coursesRes.json();
      setCourses(coursesData);

      // Fetch detailed progress for each course
      const progressPromises = coursesData.map(async (course) => {
        try {
          const res = await fetch(
            `/api/student/progress?courseId=${course.id}&studentId=${userId}`
          );
          if (res.ok) {
            const data = await res.json();
            return { courseId: course.id, data };
          }
          return { courseId: course.id, data: null };
        } catch (err) {
          console.error(`Error fetching progress for course ${course.id}:`, err);
          return { courseId: course.id, data: null };
        }
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap = {};
      let totalAssignments = 0;
      let completedAssignments = 0;
      let overdueAssignments = 0;

      progressResults.forEach(({ courseId, data }) => {
        if (data) {
          progressMap[courseId] = data;
          totalAssignments += data.totalAssignments;
          completedAssignments += data.submittedAssignments;
          overdueAssignments += data.overdueAssignments;
        }
      });

      setProgressData(progressMap);
      setOverallStats({
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        percentage:
          totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
      });
    } catch (error) {
      console.error("Error fetching progress:", error);
      toast.error("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your progress...</p>
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
                My Progress
              </h1>
              <p className="text-muted-foreground mt-2">
                Track your assignment completion and performance
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Overall Progress Card */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Overall Progress</CardTitle>
            <CardDescription>
              Your progress across all enrolled courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <BookOpen className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Assignments
                  </p>
                  <p className="text-2xl font-bold">
                    {overallStats.totalAssignments}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {overallStats.completedAssignments}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <Clock className="w-10 h-10 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {overallStats.totalAssignments -
                      overallStats.completedAssignments}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <AlertCircle className="w-10 h-10 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">
                    {overallStats.overdueAssignments}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Overall Completion Rate
                </span>
                <span
                  className={`text-2xl font-bold ${getStatusColor(
                    overallStats.percentage
                  )}`}
                >
                  {overallStats.percentage}%
                </span>
              </div>
              <Progress value={overallStats.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {overallStats.completedAssignments} of{" "}
                {overallStats.totalAssignments} assignments completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Course-wise Progress */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Course-wise Progress</h2>
          {courses.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No courses enrolled</h3>
              <p className="text-muted-foreground">
                Join a course to start tracking your progress
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {courses.map((course) => {
                const progress = progressData[course.id];
                if (!progress) return null;

                const completionRate =
                  progress.totalAssignments > 0
                    ? Math.round(
                        (progress.submittedAssignments /
                          progress.totalAssignments) *
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
                          <CardDescription className="mt-1">
                            {course.instructorName && (
                              <span className="text-xs">
                                Instructor: {course.instructorName}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            completionRate >= 80
                              ? "default"
                              : completionRate >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {completionRate}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <Progress value={completionRate} className="h-2.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {progress.submittedAssignments}/
                            {progress.totalAssignments} completed
                          </span>
                          <span>{completionRate}%</span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-600" />
                          <p className="text-xs text-muted-foreground">
                            Submitted
                          </p>
                          <p className="text-lg font-bold">
                            {progress.submittedAssignments}
                          </p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                          <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
                          <p className="text-xs text-muted-foreground">
                            Pending
                          </p>
                          <p className="text-lg font-bold">
                            {progress.pendingAssignments}
                          </p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                          <p className="text-xs text-muted-foreground">
                            Overdue
                          </p>
                          <p className="text-lg font-bold">
                            {progress.overdueAssignments}
                          </p>
                        </div>
                      </div>

                      {/* Overdue Assignments List */}
                      {progress.overdueAssignmentsList &&
                        progress.overdueAssignmentsList.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-sm font-medium text-red-600 mb-2">
                              Overdue Assignments:
                            </p>
                            <div className="space-y-2">
                              {progress.overdueAssignmentsList.map(
                                (assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-start gap-2 text-xs p-2 bg-red-50 dark:bg-red-950/20 rounded"
                                  >
                                    <Calendar className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {assignment.title}
                                      </p>
                                      <p className="text-muted-foreground">
                                        Due:{" "}
                                        {new Date(
                                          assignment.deadline
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => router.push(`/classroom/${course.id}`)}
                      >
                        View Course
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
