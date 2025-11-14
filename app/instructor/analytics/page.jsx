"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const chartPalette = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

export default function InstructorAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      setUser(currentUser);

      try {
        const profileRes = await fetch(`/api/users/${currentUser.uid}`);
        if (!profileRes.ok) throw new Error("Failed to load profile");
        const profile = await profileRes.json();
        if (profile?.user?.role !== "instructor") {
          toast.error("Instructor analytics are restricted to instructors.");
          router.push("/student/progress");
          return;
        }
        fetchAnalytics(currentUser.uid);
      } catch (error) {
        console.error("Failed to verify role", error);
        toast.error("Could not verify instructor access.");
        router.push("/student/progress");
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalytics = async (instructorId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/instructor/analytics?instructorId=${instructorId}`
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
      setSelectedCourseId(data.courses?.[0]?.id || null);
      setSelectedAssignmentId(data.assignments?.[0]?.assignmentId || null);
    } catch (error) {
      console.error("Failed to load analytics", error);
      toast.error("Unable to load instructor analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analytics) return;
    if (!selectedCourseId && analytics.courses?.length) {
      setSelectedCourseId(analytics.courses[0].id);
    }
  }, [analytics, selectedCourseId]);

  useEffect(() => {
    if (!analytics) return;
    const assignmentPool = selectedCourseId
      ? analytics.assignments?.filter(
          (assignment) => assignment.courseId === selectedCourseId
        )
      : analytics.assignments;
    if (assignmentPool && assignmentPool.length > 0) {
      setSelectedAssignmentId(assignmentPool[0].assignmentId);
    } else {
      setSelectedAssignmentId(null);
    }
  }, [analytics, selectedCourseId]);

  const selectedCourse = useMemo(() => {
    return analytics?.courses?.find((course) => course.id === selectedCourseId);
  }, [analytics, selectedCourseId]);

  const selectedAssignment = useMemo(() => {
    return analytics?.assignments?.find(
      (assignment) => assignment.assignmentId === selectedAssignmentId
    );
  }, [analytics, selectedAssignmentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">
          Crunching classroom analytics...
        </p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-sm text-muted-foreground">
          No analytics available yet. Create a course or assignment to get
          started.
        </p>
        <Button onClick={() => router.push("/assignments")}>Create Assignment</Button>
      </div>
    );
  }

  const coursePerformanceData = (analytics.courses || []).map((course) => ({
    name: course.title,
    completionRate: course.completionRate,
    lateSubmissions: course.lateSubmissions,
  }));

  const engagementData = [
    {
      name: "On-time",
      value: analytics.overview.engagementBreakdown.onTime,
    },
    {
      name: "Late",
      value: analytics.overview.engagementBreakdown.late,
    },
    {
      name: "Missing",
      value: analytics.overview.engagementBreakdown.missing,
    },
  ].filter((item) => item.value > 0);

  const assignmentChartData = selectedAssignment
    ? [
        {
          status: "On time",
          value: selectedAssignment.onTime,
        },
        {
          status: "Late",
          value: selectedAssignment.late,
        },
        {
          status: "Missing",
          value: selectedAssignment.notSubmitted,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Instructor Command Center
            </p>
            <h1 className="text-4xl font-bold">Class Performance Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Monitor classroom health, assignment momentum, and student
              engagement in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.refresh()}>
              Refresh data
            </Button>
            <Button onClick={() => router.push("/assignments")}>New assignment</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Active courses"
            value={analytics.overview.totalCourses}
            icon={BookOpen}
            helper="Courses you currently instruct"
          />
          <SummaryCard
            title="Learners tracked"
            value={analytics.overview.totalStudents}
            icon={Users}
            helper="Unique students across your courses"
          />
          <SummaryCard
            title="Submission rate"
            value={`${analytics.overview.averageSubmissionRate || 0}%`}
            icon={BarChart3}
            trend={analytics.overview.onTimePercentage}
            helper="Based on all expected submissions"
          />
          <SummaryCard
            title="Avg. grade"
            value={
              analytics.overview.averageGrade !== null
                ? analytics.overview.averageGrade
                : "—"
            }
            icon={Activity}
            helper="Mean of graded submissions"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Course performance snapshot</CardTitle>
              <CardDescription>
                Completion rate and late submission footprint per course
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coursePerformanceData.length ? (
                <ChartContainer
                  className="h-80"
                  config={{
                    completionRate: {
                      label: "Completion rate",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <BarChart data={coursePerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} interval={0} angle={-10} textAnchor="end" height={70} />
                    <YAxis unit="%" tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="completionRate"
                      fill="var(--color-completionRate)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create your first course to unlock analytics.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submission health</CardTitle>
              <CardDescription>
                On-time vs late vs missing submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {engagementData.length ? (
                <ChartContainer
                  className="h-64"
                  config={{
                    onTime: { label: "On time", color: "hsl(var(--chart-1))" },
                    late: { label: "Late", color: "hsl(var(--chart-2))" },
                    missing: { label: "Missing", color: "hsl(var(--chart-3))" },
                  }}
                >
                  <PieChart>
                    <Pie
                      data={engagementData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      strokeWidth={2}
                    >
                      {engagementData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={`var(--color-${entry.name
                            .toLowerCase()
                            .replace(" ", "")})`}
                        />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not enough submissions yet to generate a breakdown.
                </p>
              )}
              <div className="flex justify-between text-sm">
                <span>On-time</span>
                <span className="font-medium">
                  {analytics.overview.onTimePercentage ?? 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Late</span>
                <span className="font-medium">
                  {analytics.overview.latePercentage ?? 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Course deep-dive</CardTitle>
                <CardDescription>Select a course to inspect trends</CardDescription>
              </div>
              <Select
                value={selectedCourseId || undefined}
                onValueChange={setSelectedCourseId}
                disabled={!analytics.courses?.length}
              >
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {(analytics.courses || []).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCourse ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricTile
                    label="Students"
                    value={selectedCourse.studentCount}
                    helper="Enrolled in this course"
                    icon={Users}
                  />
                  <MetricTile
                    label="Assignments"
                    value={selectedCourse.assignmentCount}
                    helper="Published"
                    icon={FileText}
                  />
                  <MetricTile
                    label="Completion"
                    value={`${selectedCourse.completionRate}%`}
                    helper="Submission coverage"
                    icon={CheckCircle2}
                  />
                  <MetricTile
                    label="Late submissions"
                    value={selectedCourse.lateSubmissions}
                    helper="Needs attention"
                    icon={AlertTriangle}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a course to view its insights.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Assignment focus</CardTitle>
                <CardDescription>Monitor submissions for a single task</CardDescription>
              </div>
              <Select
                value={selectedAssignmentId || undefined}
                onValueChange={setSelectedAssignmentId}
                disabled={!analytics.assignments?.length}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {(analytics.assignments || []).map((assignment) => (
                    <SelectItem
                      key={assignment.assignmentId}
                      value={assignment.assignmentId}
                    >
                      {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {selectedAssignment ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedAssignment.courseTitle}</Badge>
                    {selectedAssignment.deadline && (
                      <span className="text-xs text-muted-foreground">
                        Due {new Date(selectedAssignment.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <ChartContainer
                    className="h-64"
                    config={{
                      status: { label: "Submissions", color: "hsl(var(--chart-1))" },
                    }}
                  >
                    <BarChart data={assignmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" tickLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="value"
                        fill="var(--color-status)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <MetricTile
                      label="Submitted"
                      value={selectedAssignment.submissions}
                      helper="Total files received"
                      icon={FileText}
                    />
                    <MetricTile
                      label="On time"
                      value={selectedAssignment.onTime}
                      helper="Before deadline"
                      icon={CheckCircle2}
                    />
                    <MetricTile
                      label="Late"
                      value={selectedAssignment.late}
                      helper="After deadline"
                      icon={AlertTriangle}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Publish an assignment to track its submissions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignment leaderboard</CardTitle>
            <CardDescription>
              Quickly scan throughput and bottlenecks across every assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-4 font-medium">Assignment</th>
                  <th className="py-2 pr-4 font-medium">Course</th>
                  <th className="py-2 pr-4 font-medium">Due</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  <th className="py-2 pr-4 font-medium">Completion</th>
                  <th className="py-2 pr-4 font-medium">On time</th>
                  <th className="py-2 pr-4 font-medium">Late</th>
                  <th className="py-2 font-medium">Avg. grade</th>
                </tr>
              </thead>
              <tbody>
                {(analytics.assignments || []).map((assignment) => (
                  <tr
                    key={assignment.assignmentId}
                    className="border-t border-border/60"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {assignment.title}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-muted-foreground text-xs">
                        {assignment.courseTitle}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {assignment.deadline
                        ? new Date(assignment.deadline).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {assignment.submissions}/{assignment.totalStudents}
                    </td>
                    <td className="py-3 pr-4">
                      {assignment.completionRate}%
                    </td>
                    <td className="py-3 pr-4">{assignment.onTime}</td>
                    <td className="py-3 pr-4">{assignment.late}</td>
                    <td className="py-3">
                      {assignment.averageGrade !== null
                        ? assignment.averageGrade
                        : "—"}
                    </td>
                  </tr>
                ))}
                {!(analytics.assignments || []).length && (
                  <tr>
                    <td className="py-4 text-center text-muted-foreground" colSpan={8}>
                      No assignments to analyze yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, helper, icon: Icon, trend }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        {Icon ? <Icon className="h-5 w-5 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {helper}
          {typeof trend === "number" && (
            <span className="ml-1 text-emerald-500 font-medium">
              {trend}% on time
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function MetricTile({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{helper}</p>
    </div>
  );
}
