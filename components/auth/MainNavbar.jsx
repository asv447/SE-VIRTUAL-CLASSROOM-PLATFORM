"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Login from "./Login";
import Register from "./Register";
import { Bell } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function MainNavbar() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(true);
        
        try {
          // Check if email is instructor domain
          const isInstructorEmail = currentUser.email?.endsWith("@instructor.com") || 
                                  currentUser.email?.endsWith("@admin.com");

          // Fetch user data from MongoDB API
          const res = await fetch(`/api/users?uid=${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            setUsername(data.user?.username || currentUser.email.split("@")[0]);
            setIsAdmin(data.user?.role === "instructor" || isInstructorEmail);
          } else {
            // User not found in database, use defaults
            setUsername(currentUser.email.split("@")[0]);
            setIsAdmin(isInstructorEmail);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUsername(currentUser.email.split("@")[0]);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUsername("");
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isLoginOpen || isRegisterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isLoginOpen, isRegisterOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/classync-logo.png" alt="Classync Logo" className="w-8 h-8 object-contain" />
            </div>
            <Link href="/" className="text-xl font-bold text-foreground">Classync</Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium">Home</Link>
            {user && (
              <>
                {/* Unified Assignments (renamed from Student Dashboard) */}
                <Link href="/student" className="text-muted-foreground hover:text-primary transition-colors font-medium">Assignments</Link>
                {(isAdmin || user?.email?.includes("@instructor.com") || user?.email?.includes("@admin.com")) && (
                  <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors font-medium">Admin Dashboard</Link>
                )}
              </>
            )}
            <Link href="/ai-tools" className="text-muted-foreground hover:text-primary transition-colors font-medium">AI Tools</Link>
          </nav>

          {/* User Actions */}
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

      {/* Mobile Menu */}
      <div className="md:hidden border-b border-border bg-background">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium">Home</Link>
            {user && (
              <>
                {/* Mobile: only one Assignments link pointing to /student */}
                <Link href="/student" className="text-muted-foreground hover:text-primary transition-colors font-medium">Assignments</Link>
                {(isAdmin || user?.email?.includes("@instructor.com") || user?.email?.includes("@admin.com")) && (
                  <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors font-medium">Admin</Link>
                )}
              </>
            )}
            <Link href="/ai-tools" className="text-muted-foreground hover:text-primary transition-colors font-medium">AI Tools</Link>
          </nav>
        </div>
      </div>

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-[10000] bg-white rounded-lg p-6">
            <Login onBackToHome={() => setIsLoginOpen(false)} />
            <button className="absolute top-2 right-2 text-gray-600 text-2xl font-bold z-[10001]" onClick={() => setIsLoginOpen(false)}>×</button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-[10000] bg-white rounded-lg p-6">
            <Register onBackToHome={() => setIsRegisterOpen(false)} />
            <button className="absolute top-2 right-2 text-gray-600 text-2xl font-bold z-[10001]" onClick={() => setIsRegisterOpen(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}
