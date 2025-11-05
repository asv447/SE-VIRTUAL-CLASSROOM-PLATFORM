"use client";
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Layers, Menu } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("student");
  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);

  const minWidth = 64; // minimum width (w-16)
  const maxWidth = 400; // maximum width
  const colorPalette = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
  ];
  const activeClassId = pathname === "/classroom" ? searchParams.get("classId") : null;

  const navigate = (path) => {
    router.push(path);
  };

  const handleToggle = () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    
    if (!newPinnedState) {
      // Unpinning - collapse sidebar
      setIsCollapsed(true);
      setSidebarWidth(64);
    } else {
      // Pinning - expand sidebar
      setIsCollapsed(false);
      setSidebarWidth(256);
    }
  };

  // Emit custom event when sidebar width changes
  useEffect(() => {
    const event = new CustomEvent('sidebarWidthChange', { 
      detail: { width: sidebarWidth, isCollapsed }
    });
    window.dispatchEvent(event);
  }, [sidebarWidth, isCollapsed]);

  const handleMouseEnter = (e) => {
    if (!isPinned && !isResizing) {
      // If the mouse entered via the toggle area, do not expand on hover
      if (toggleRef.current && e && toggleRef.current.contains(e.target)) {
        return;
      }
      setIsHovered(true);
      setIsCollapsed(false);
      setSidebarWidth(256);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned && !isResizing) {
      setIsHovered(false);
      setIsCollapsed(true);
      setSidebarWidth(64);
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
        
        // Auto collapse/expand based on width
        if (newWidth < 100) {
          setIsCollapsed(true);
        } else {
          setIsCollapsed(false);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const fetchClassrooms = async (currentUser, role) => {
    setCoursesLoading(true);
    try {
      const params = new URLSearchParams({
        userId: currentUser.uid,
        email: currentUser.email || "",
        role,
      });
      const response = await fetch(`/api/classrooms?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load classrooms (${response.status})`);
      }

      const payload = await response.json();
      const classroomDocs = Array.isArray(payload.classrooms) ? payload.classrooms : [];

      const normalized = classroomDocs.map((cls, index) => {
        const rawId = cls.classroomId || cls.id || cls._id;
        const id = rawId?.toString ? rawId.toString() : String(rawId || "");
        return {
          id,
          name: cls.subjectName || cls.name || cls.courseCode || "Untitled Course",
          color: colorPalette[index % colorPalette.length],
        };
      });

      setCourses(normalized);
    } catch (error) {
      console.error("Error loading classrooms:", error);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const res = await fetch(`/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            setUserRole(data.user.role === "instructor" ? "instructor" : "student");
          } else {
            const isInstructorEmail =
              currentUser.email?.includes("@instructor.com") ||
              currentUser.email?.includes("@admin.com");
            setUserRole(isInstructorEmail ? "instructor" : "student");
          }
        } catch (error) {
          console.error("Error loading user role:", error);
          const isInstructorEmail =
            currentUser.email?.includes("@instructor.com") ||
            currentUser.email?.includes("@admin.com");
          setUserRole(isInstructorEmail ? "instructor" : "student");
        }
      } else {
        setUser(null);
        setUserRole("student");
        setCourses([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    fetchClassrooms(user, userRole);
  }, [user, userRole]);

  return (
    <div
      ref={sidebarRef}
      className="fixed left-0 bg-gray-50 z-10 transition-all duration-300"
      style={{ 
        width: `${sidebarWidth}px`,
        top: '64px', // Position below the navigation bar
        height: 'calc(100vh - 64px)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <aside
        className="h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-y-auto"
        style={{ 
          width: `${sidebarWidth}px`,
          height: '100%'
        }}
      >
        {/* Toggle Button - click only; excluded from hover expand */}
        <div 
          ref={toggleRef}
          className="absolute top-4 left-4 z-20"
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleToggle}
            className="transition-all duration-300 bg-white border border-gray-300 rounded-full p-1 shadow hover:bg-gray-100"
          >
            <Menu size={16} />
          </button>
        </div>

        {/* Header (Logo) */}
        {/* <div
          className={`flex items-center gap-2 p-4 cursor-pointer transition-all duration-300 ${
            isCollapsed ? "justify-center" : "justify-start hover:bg-gray-100"
          }`}
          onClick={() => navigate("/dashboard")}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
        >
          <Book className="text-blue-600 flex-shrink-0" size={20} />
          {!isCollapsed && <h1 className="font-semibold text-lg truncate">Classync</h1>}
        </div> */}

        {/* Body with custom scrollbar */}
        <div className="flex-1 overflow-hidden mt-14">
          <nav className="h-full overflow-y-auto custom-scrollbar">
            <ul className="space-y-1 px-2">
              {/* <li
                onClick={() => navigate("/dashboard")}
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${
                  pathname === "/dashboard" ? "bg-gray-100" : ""
                }`}
              >
                <Home size={18} className="flex-shrink-0" />
                {!isCollapsed && <span className="truncate">Home</span>}
              </li> */}

              <li
                onClick={() => navigate("/calendar")}
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${
                  pathname === "/calendar" ? "bg-gray-100" : ""
                }`}
              >
                <Calendar size={18} className="flex-shrink-0" />
                {!isCollapsed && <span className="truncate">Calendar</span>}
              </li>

              {/* Enrolled Section */}
              <li className="mt-4">
                <button
                  onClick={() => setIsCoursesOpen(!isCoursesOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Layers size={18} className="flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">Enrolled</span>}
                  </span>
                  {!isCollapsed && (
                    <ChevronDown
                      size={18}
                      className={`transform transition-transform flex-shrink-0 ${
                        isCoursesOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {isCoursesOpen && !isCollapsed && (
                  <ul className="mt-1 space-y-1 pl-6">
                    {coursesLoading ? (
                      <li className="text-xs text-muted-foreground px-3 py-1">
                        Loading classrooms…
                      </li>
                    ) : courses.length === 0 ? (
                      <li className="text-xs text-muted-foreground px-3 py-1">
                        No classrooms yet.
                      </li>
                    ) : (
                      courses.map((course) => {
                        const isActive = pathname === "/classroom" && activeClassId === course.id;
                        return (
                          <li
                            key={course.id}
                            onClick={() => navigate(`/classroom?classId=${course.id}&tab=announcements`)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${
                              isActive ? "bg-gray-100" : ""
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full flex-shrink-0 ${course.color}`}
                            ></div>
                            <span className="truncate">{course.name}</span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </li>
            </ul>
          </nav>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors ${
            isResizing ? "bg-blue-500" : "bg-transparent"
          }`}
        >
          {/* Visual indicator */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-12 bg-gray-300 rounded-l opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }
      `}</style>
    </div>
  );
}
