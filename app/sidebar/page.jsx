"use client";
import { useState, useRef, useEffect } from "react";
import { Home, Calendar, Book, ChevronDown, Layers, Menu } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [courses, setCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);

  const minWidth = 64; // minimum width (w-16)
  const maxWidth = 400; // maximum width

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser || null);
      if (!currentUser) {
        setCourses([]);
        setRole("");
        return;
      }

      try {
        const res = await fetch(`/api/users?uid=${currentUser.uid}`);
        if (res.ok) {
          const data = await res.json();
          const userRole = data.user?.role || "student";
          setRole(userRole);
          await loadCoursesForUser(currentUser.uid, userRole);
        } else {
          setRole("student");
          await loadCoursesForUser(currentUser.uid, "student");
        }
      } catch (e) {
        setRole("student");
        await loadCoursesForUser(currentUser.uid, "student");
      }
    });
    return () => unsubscribe();
  }, []);

  const colorPool = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];

  const hashIndex = (str) => {
    let h = 0;
    for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % colorPool.length;
  };

  const loadCoursesForUser = async (uid, userRole) => {
    try {
      if (userRole === "instructor") {
        const res = await fetch(`/api/courses?role=instructor&userId=${uid}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((c) => ({
            id: c.id,
            name: c.name || c.title || c.code,
            color: colorPool[hashIndex(c.code || c.name || c.id)],
          }));
          setCourses(mapped);
        } else {
          setCourses([]);
        }
      } else {
        const res = await fetch(`/api/courses?role=student&userId=${uid}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = (data || []).map((c) => ({
            id: c.id,
            name: c.name || c.title || c.code,
            color: colorPool[hashIndex(c.code || c.name || c.id)],
          }));
          setCourses(mapped);
        } else {
          setCourses([]);
        }
      }
    } catch (err) {
      setCourses([]);
    }
  };

  // Don't render on server to prevent hydration errors
  if (!isMounted) {
    return (
      <div
        className="fixed left-0 z-10 bg-sidebar"
        style={{
          width: "256px",
          top: "64px",
          height: "calc(100vh - 64px)",
        }}
      >
        <aside
          className="h-full bg-sidebar border-r border-sidebar-border"
          style={{ width: "256px" }}
        >
          {/* Empty placeholder during SSR */}
        </aside>
      </div>
    );
  }

  return (
    <div
      ref={sidebarRef}
      className="fixed left-0 z-10 bg-sidebar transition-all duration-300"
      style={{ 
        width: `${sidebarWidth}px`,
        top: '64px', // Position below the navigation bar
        height: 'calc(100vh - 64px)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <aside
        className="h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 overflow-y-auto"
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
            className="transition-all duration-300 bg-background text-foreground border border-border rounded-full p-1 shadow hover:bg-muted"
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
          <Book className="text-blue-600 shrink-0" size={20} />
          {!isCollapsed && (
            <h1 className="font-semibold text-lg truncate">
              Clas<span className="text-blue-600">sync</span>
            </h1>
          )}
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
                <Home size={18} className="shrink-0" />
                {!isCollapsed && <span className="truncate">Home</span>}
              </li> */}

              <li
                onClick={() => navigate("/calendar")}
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  pathname === "/calendar" ? "bg-muted" : ""
                }`}
              >
                <Calendar size={18} className="shrink-0" />
                {!isCollapsed && <span className="truncate">Calendar</span>}
              </li>

              {/* Enrolled Section */}
              <li className="mt-4">
                <button
                  onClick={() => setIsCoursesOpen(!isCoursesOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Layers size={18} className="shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{role === "instructor" ? "My Courses" : "Enrolled"}</span>
                    )}
                  </span>
                  {!isCollapsed && (
                    <ChevronDown
                      size={18}
                      className={`transform transition-transform shrink-0 ${
                        isCoursesOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {isCoursesOpen && !isCollapsed && (
                  <ul className="mt-1 space-y-1 pl-6">
                    {courses.map((course) => (
                      <li
                        key={course.id}
                        onClick={() => navigate(`/classroom/${course.id}`)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                          pathname === `/classroom/${course.id}` ? "bg-muted" : ""
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 ${course.color}`}
                        ></div>
                        <span className="truncate">{course.name}</span>
                      </li>
                    ))}
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
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-12 bg-border rounded-l opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-muted);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-foreground);
        }

        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--color-border) var(--color-muted);
        }
      `}</style>
    </div>
  );
}
