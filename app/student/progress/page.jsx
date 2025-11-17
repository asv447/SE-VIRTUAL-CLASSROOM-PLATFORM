"use client";

import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Target,
  Award,
  BarChart3,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";

export default function StudentProgressPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [overallStats, setOverallStats] = useState({
    totalAssignments: 0,
    completedAssignments: 0,
    onTimeAssignments: 0,
    pendingAssignments: 0,
    missingAssignments: 0,
    percentage: 0,
    averageGrade: null,
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
      let onTimeAssignments = 0;
      let pendingAssignments = 0;
      let missingAssignments = 0;
      let totalGrade = 0;
      let gradedCount = 0;

      progressResults.forEach(({ courseId, data }) => {
        if (data) {
          progressMap[courseId] = data;
          totalAssignments += data.totalAssignments;
          completedAssignments += data.submittedAssignments;
          onTimeAssignments += data.onTimeAssignments || 0;
          pendingAssignments += data.pendingAssignments;
          missingAssignments += data.missingAssignments || 0;
          
          // Calculate average grade
          if (data.submissions) {
            data.submissions.forEach(sub => {
              if (typeof sub.grade === 'number') {
                totalGrade += sub.grade;
                gradedCount++;
              }
            });
          }
        }
      });

      setProgressData(progressMap);
      setOverallStats({
        totalAssignments,
        completedAssignments,
        onTimeAssignments,
        pendingAssignments,
        missingAssignments,
        percentage:
          totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
        averageGrade: gradedCount > 0 ? Math.round((totalGrade / gradedCount) * 10) / 10 : null,
      });
      
      // Set first course as selected by default
      if (coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id);
      }
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

  const selectedCourse = useMemo(() => {
    return courses.find((course) => course.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const selectedProgress = useMemo(() => {
    return selectedCourseId ? progressData[selectedCourseId] : null;
  }, [selectedCourseId, progressData]);

  // Prepare chart data
  const courseProgressData = useMemo(() => {
    return courses.map((course) => {
      const progress = progressData[course.id];
      if (!progress) return null;
      return {
        name: course.name || course.title,
        completion: progress.totalAssignments > 0
          ? Math.round((progress.submittedAssignments / progress.totalAssignments) * 100)
          : 0,
      };
    }).filter(Boolean);
  }, [courses, progressData]);

  const submissionStatusData = useMemo(() => {
    const total = overallStats.totalAssignments;
    if (total === 0) return [];
    
    return [
      {
        name: "onTime",
        displayName: "On-Time",
        value: Math.round((overallStats.onTimeAssignments / total) * 100),
        count: overallStats.onTimeAssignments,
      },
      {
        name: "pending",
        displayName: "Pending",
        value: Math.round((overallStats.pendingAssignments / total) * 100),
        count: overallStats.pendingAssignments,
      },
      {
        name: "missing",
        displayName: "Missing",
        value: Math.round((overallStats.missingAssignments / total) * 100),
        count: overallStats.missingAssignments,
      },
    ].filter((item) => item.value > 0);
  }, [overallStats]);

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
    <div className="min-h-screen bg-background relative">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)]/20 bg-size-[16px_16px]"></div>
      <div className="absolute inset-0 -z-20 bg-linear-to-br from-background via-secondary to-background"></div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Student Dashboard
            </p>
            <h1 className="text-4xl font-bold text-foreground">My Learning Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track your progress, assignments, and performance across all courses
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.refresh()}>
              Refresh data
            </Button>
            <Button onClick={() => router.push("/")}>My Courses</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Enrolled Courses"
            value={courses.length}
            icon={BookOpen}
            helper="Active enrollments"
          />
          <SummaryCard
            title="Total Assignments"
            value={overallStats.totalAssignments}
            icon={BarChart3}
            helper="Across all courses"
          />
          <SummaryCard
            title="Completion Rate"
            value={`${overallStats.percentage}%`}
            icon={Target}
            helper="Overall progress"
          />
          <SummaryCard
            title="Avg. Grade"
            value={overallStats.averageGrade !== null ? overallStats.averageGrade : "—"}
            icon={Award}
            helper="Based on graded work"
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Course Progress Chart */}
          <Card className="lg:col-span-2 bg-card/60 backdrop-blur-sm border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-foreground">Course Completion Overview</CardTitle>
              <CardDescription>
                Your progress percentage across all enrolled courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courseProgressData.length > 0 ? (
                <ChartContainer
                  className="h-80"
                  config={{
                    completion: {
                      label: "Completion",
                      color: "#006FA7",
                    },
                  }}
                >
                  <BarChart data={courseProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tickLine={false} interval={0} angle={-10} textAnchor="end" height={70} stroke="hsl(var(--muted-foreground))" />
                    <YAxis unit="%" tickLine={false} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="completion"
                      fill="var(--color-completion)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Enroll in courses to see your progress
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submission Status Pie Chart */}
          <Card className="bg-card/60 backdrop-blur-sm border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-foreground">Submission Status</CardTitle>
              <CardDescription>
                Overall assignment status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submissionStatusData.length > 0 ? (
                <>
                  <ChartContainer
                    className="h-64"
                    config={{
                      onTime: { label: "On-Time", color: "#22c55e" },
                      pending: { label: "Pending", color: "#3b82f6" },
                      missing: { label: "Missing", color: "#ef4444" },
                    }}
                  >
                    <PieChart>
                      <Pie
                        data={submissionStatusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {submissionStatusData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={`var(--color-${entry.name})`}
                          />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>On-Time</span>
                      <span className="font-medium text-green-600">
                        {submissionStatusData.find(d => d.name === "onTime")?.value || 0}% ({overallStats.onTimeAssignments})
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending</span>
                      <span className="font-medium text-blue-600">
                        {submissionStatusData.find(d => d.name === "pending")?.value || 0}% ({overallStats.pendingAssignments})
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Missing</span>
                      <span className="font-medium text-destructive">
                        {submissionStatusData.find(d => d.name === "missing")?.value || 0}% ({overallStats.missingAssignments})
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No assignment data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Course Details Section */}
        <Card className="bg-card/60 backdrop-blur-sm border-2 hover:border-primary/50 transition-all">
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-foreground">Course Deep-Dive</CardTitle>
              <CardDescription>Select a course to view detailed progress</CardDescription>
            </div>
            <Select
              value={selectedCourseId || undefined}
              onValueChange={setSelectedCourseId}
              disabled={courses.length === 0}
            >
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name || course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {selectedProgress && selectedCourse ? (
              <div className="space-y-6">
                {/* Course Info */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {selectedCourse.instructorName ? `Instructor: ${selectedCourse.instructorName}` : 'Course Details'}
                  </Badge>
                  {selectedCourse.courseCode && (
                    <Badge variant="secondary" className="text-sm font-mono">
                      {selectedCourse.courseCode}
                    </Badge>
                  )}
                </div>

                {/* Progress Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricTile
                    label="On-Time"
                    value={selectedProgress.onTimeAssignments || 0}
                    helper="Submitted before deadline"
                    icon={CheckCircle2}
                  />
                  <MetricTile
                    label="Pending"
                    value={selectedProgress.pendingAssignments}
                    helper="Can still submit on-time"
                    icon={Calendar}
                  />
                  <MetricTile
                    label="Missing"
                    value={selectedProgress.missingAssignments || 0}
                    helper="Deadline passed"
                    icon={AlertCircle}
                  />
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Course Completion</span>
                    <span className="text-2xl font-bold text-primary">
                      {selectedProgress.totalAssignments > 0
                        ? Math.round((selectedProgress.submittedAssignments / selectedProgress.totalAssignments) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress
                    value={selectedProgress.totalAssignments > 0
                      ? (selectedProgress.submittedAssignments / selectedProgress.totalAssignments) * 100
                      : 0}
                    className="h-3"
                  />
                </div>

                {/* Missing Assignments */}
                {selectedProgress.missingAssignmentsList && selectedProgress.missingAssignmentsList.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-destructive mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Missing Assignments ({selectedProgress.missingAssignmentsList.length})
                    </h3>
                    <div className="grid gap-2">
                      {selectedProgress.missingAssignmentsList.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                        >
                          <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{assignment.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(assignment.deadline).toLocaleDateString()} - {" "}
                              {Math.floor((new Date() - new Date(assignment.deadline)) / (1000 * 60 * 60 * 24))} days overdue
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => router.push(`/classroom/${selectedCourseId}`)}
                >
                  Go to Course
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                {courses.length === 0 ? 'No courses enrolled' : 'Select a course to view details'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, helper, icon: Icon, alert }) {
  return (
    <Card className={`bg-card/60 backdrop-blur-sm border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 ${alert ? 'border-destructive/50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-muted-foreground">{title}</CardDescription>
        {Icon ? <Icon className={`h-5 w-5 ${alert ? 'text-destructive' : 'text-muted-foreground'}`} /> : null}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${alert ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{helper}</p>
      </CardContent>
    </Card>
  );
}

function MetricTile({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-lg border-2 border-border bg-secondary/30 p-4 hover:border-primary/50 transition-all">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold mt-2 text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{helper}</p>
    </div>
  );
}
