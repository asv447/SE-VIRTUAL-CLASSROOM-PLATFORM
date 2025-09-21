"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Users,
  BookOpen,
  Calendar,
  Brain,
  Bell,
  Settings,
  LogOut,
  FileText,
  BarChart3,
  MessageSquare,
  Sparkles,
  Clock,
  CheckCircle,
} from "lucide-react"

export default function ClassyncDashboard() {
  const [courses, setCourses] = useState([
    {
      id: "1",
      title: "Advanced Machine Learning",
      description: "Deep dive into neural networks and AI algorithms",
      instructor: "Dr. Sarah Chen",
      students: 24,
      progress: 68,
      assignments: 3,
      nextClass: "Today, 2:00 PM",
    },
  ])

  // const [activities] = useState([
  //   {
  //     id: "1",
  //     type: "submission",
  //     title: "Assignment 3 submitted",
  //     course: "Machine Learning",
  //     time: "2 hours ago",
  //     status: "completed",
  //   },
  //   {
  //     id: "2",
  //     type: "assignment",
  //     title: "New assignment posted",
  //     course: "Web Development",
  //     time: "4 hours ago",
  //     status: "pending",
  //   },
  //   {
  //     id: "3",
  //     type: "grade",
  //     title: "Quiz 2 graded",
  //     course: "Algorithms",
  //     time: "1 day ago",
  //     status: "completed",
  //   },
  // ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    subject: "",
  })

  const handleCreateCourse = () => {
    const course = {
      id: Date.now().toString(),
      title: newCourse.title,
      description: newCourse.description,
      instructor: "You",
      students: 0,
      progress: 0,
      assignments: 0,
    }
    setCourses([...courses, course])
    setNewCourse({ title: "", description: "", subject: "" })
    setIsCreateDialogOpen(false)
  }

  // const getActivityIcon = (type) => {
  //   switch (type) {
  //     case "assignment":
  //       return <FileText className="w-4 h-4" />
  //     case "submission":
  //       return <CheckCircle className="w-4 h-4" />
  //     case "grade":
  //       return <BarChart3 className="w-4 h-4" />
  //     case "announcement":
  //       return <MessageSquare className="w-4 h-4" />
  //     default:
  //       return <Clock className="w-4 h-4" />
  //   }
  // }

  // const getStatusColor = (status) => {
  //   switch (status) {
  //     case "completed":
  //       return "text-foreground"
  //     case "pending":
  //       return "text-muted-foreground"
  //     case "overdue":
  //       return "text-muted-foreground"
  //     default:
  //       return "text-muted-foreground"
  //   }
  // }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/classync-logo.png" alt="Classync Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-bold text-foreground">Classync</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-foreground hover:text-primary transition-colors font-medium">
              Home
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Courses
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Assignments
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Progress
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              AI Tools
            </a>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-foreground rounded-full text-xs flex items-center justify-center text-background">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/teacher-profile.png" alt="Profile" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <FileText className="w-6 h-6" />
                <span className="text-sm">Create Assignment</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <BarChart3 className="w-6 h-6" />
                <span className="text-sm">View Analytics</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">Send Announcement</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Sparkles className="w-6 h-6" />
                <span className="text-sm">AI Tools</span>
              </Button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">My Course</h1>
                  <p className="text-muted-foreground mt-1">Manage your class and track progress</p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>Set up a new classroom for your students</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Course Title</Label>
                        <Input
                          id="title"
                          value={newCourse.title}
                          onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                          placeholder="e.g., Introduction to Python"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newCourse.description}
                          onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                          placeholder="Brief description of the course"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select
                          value={newCourse.subject}
                          onValueChange={(value) => setNewCourse({ ...newCourse, subject: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="computer-science">Computer Science</SelectItem>
                            <SelectItem value="mathematics">Mathematics</SelectItem>
                            <SelectItem value="physics">Physics</SelectItem>
                            <SelectItem value="chemistry">Chemistry</SelectItem>
                            <SelectItem value="biology">Biology</SelectItem>
                            <SelectItem value="literature">Literature</SelectItem>
                            <SelectItem value="history">History</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCourse} disabled={!newCourse.title}>
                        Create Course
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {courses.length === 0 ? (
                <Card className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first course to get started</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </Card>
              ) : (
                <div className="max-w-md">
                  {courses.slice(0, 1).map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="w-full h-24 bg-muted rounded-lg mb-4 flex items-center justify-center border border-border">
                          <BookOpen className="w-8 h-8 text-foreground" />
                        </div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="text-sm">{course.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src="/teacher-profile.png" />
                              <AvatarFallback className="text-xs">
                                {course.instructor
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">{course.instructor}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{course.students}</span>
                          </div>
                        </div>

                        {course.progress > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{course.progress}%</span>
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
        </div>
      </main>
    </div>
  )
}
