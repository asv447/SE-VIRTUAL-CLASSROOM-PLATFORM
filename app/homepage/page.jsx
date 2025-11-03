"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Upload } from "lucide-react";

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
} from "lucide-react"

import { auth } from "../../lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"

export default function ClassyncDashboard() {
  // User state
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Courses state
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({ title: "", description: "", subject: "" })

  // Hover dropdown state
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimerRef = useRef(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setLoading(true)
        
        try {
          // Fetch user data from MongoDB API
          const res = await fetch(`/api/users/${currentUser.uid}`)
          if (res.ok) {
            const data = await res.json()
            setUsername(data.user.username || currentUser.email.split("@")[0])
            setIsAdmin(data.user.role === "admin")
          } else {
            // User not found in database, use defaults
            setUsername(currentUser.email.split("@")[0])
            setIsAdmin(false)
          }
        } catch (err) {
          console.error("Error fetching user data:", err)
          setUsername(currentUser.email.split("@")[0])
          setIsAdmin(false)
        } finally {
          setLoading(false)
        }
      } else {
        setUser(null)
        setUsername("")
        setIsAdmin(false)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isLoginOpen || isRegisterOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }, [isLoginOpen, isRegisterOpen])

  // Create course
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

  // Commented out original navbar - now using shared navbar with same register/login functionality
/*
// Original header - now using shared navbar from layout
<header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="container mx-auto px-4 h-16 flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 flex items-center justify-center">
        <img src="/classync-logo.png" alt="Classync Logo" className="w-8 h-8 object-contain" />
      </div>
      <span className="text-xl font-bold text-foreground">Classync</span>
    </div>
    <nav className="hidden md:flex items-center space-x-8">
      <a href="#" className="text-foreground hover:text-primary transition-colors font-medium">Home</a>
      <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">Courses</a>
      <a href="../assignments" className="text-muted-foreground hover:text-primary transition-colors font-medium">Assignments</a>
      <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">Progress</a>
      <a href="#" className="text-muted-foreground hover:text-primary transition-colors font-medium">AI Tools</a>
    </nav>
    <div className="flex items-center space-x-4">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-foreground rounded-full text-xs flex items-center justify-center text-background">2</span>
      </Button>
      <div className="relative">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{username}</span>
            <Button size="sm" variant="outline" onClick={() => signOut(auth)}>
              Logout
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsRegisterOpen(true)}>Register / Login</Button>
        )}
      </div>
    </div>
  </div>
</header>
*/
  return (
    <div className="min-h-screen bg-background relative">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Courses & Dashboard */}
          <div className="lg:col-span-3 space-y-6">
            {/* Buttons row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {user?.email?.includes("@instructor.com") || user?.email?.includes("@admin.com") ? (
                <>
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" asChild>
                    <a href="/admin"><FileText className="w-6 h-6" /><span className="text-sm">Admin Dashboard</span></a>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" asChild>
                    <a href="/assignments"><Upload className="w-6 h-6" /><span className="text-sm">Create Assignment</span></a>
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" asChild>
                  <a href="/student"><FileText className="w-6 h-6" /><span className="text-sm">Student Dashboard</span></a>
                </Button>
              )}
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent"><BarChart3 className="w-6 h-6" /><span className="text-sm">View Analytics</span></Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent"><MessageSquare className="w-6 h-6" /><span className="text-sm">Send Announcement</span></Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" asChild><a href="/ai-tools/chatbot"><Sparkles className="w-6 h-6" /><span className="text-sm">AI Tools</span></a></Button>
              {user?.email?.includes("@instructor.com") || user?.email?.includes("@admin.com") ? (
                <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent"><Users className="w-6 h-6" /><span className="text-sm">Manage Classroom</span></Button>
              ) : null}
            </div>

            {/* Courses List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">My Course</h1>
                  <p className="text-muted-foreground mt-1">Manage your class and track progress</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" />Create Course</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>Set up a new classroom for your students</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Course Title</Label>
                        <Input id="title" value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} placeholder="e.g., Introduction to Python" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} placeholder="Brief description of the course" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select value={newCourse.subject} onValueChange={(value) => setNewCourse({ ...newCourse, subject: value })}>
                          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
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
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateCourse} disabled={!newCourse.title}>Create Course</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {courses.length === 0 ? (
                <Card className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first course to get started</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Course</Button>
                </Card>
              ) : (
                <div className="max-w-md">
                  {courses.map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="w-full h-24 bg-muted rounded-lg mb-4 flex items-center justify-center border border-border">
                          <BookOpen className="w-8 h-8 text-foreground" />
                        </div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{course.title}</CardTitle>
                        <CardDescription className="text-sm">{course.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">Instructor: {course.instructor}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" /><span>{course.students}</span>
                          </div>
                        </div>
                        {course.progress > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{course.progress}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div className="bg-foreground h-2 rounded-full transition-all duration-300" style={{ width: `${course.progress}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-2">
                            {course.assignments > 0 && <Badge variant="secondary" className="text-xs">{course.assignments} assignments</Badge>}
                            <Badge variant="outline" className="text-xs"><Brain className="w-3 h-3 mr-1" />AI Enhanced</Badge>
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
  )
}
