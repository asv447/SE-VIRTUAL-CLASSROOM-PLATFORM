"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Login/Register to avoid SSR issues
const Login = dynamic(() => import("../auth/Login"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

const Register = dynamic(() => import("../auth/Register"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function SharedNavbar() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(true);
        
        try {
          const res = await fetch(`/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            setUsername(data.user.username || currentUser.email.split("@")[0]);
            setIsAdmin(data.user.role === "admin");
          } else {
            setUsername(currentUser.email.split("@")[0]);
            setIsAdmin(false);
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
  }, [mounted]);

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
            <Link href="/assignments" className="text-muted-foreground hover:text-primary transition-colors font-medium">Assignments</Link>
            <Link href="/setup" className="text-muted-foreground hover:text-primary transition-colors font-medium">Setup</Link>
            {user && (
              <>
                <Link href="/student" className="text-muted-foreground hover:text-primary transition-colors font-medium">Student Dashboard</Link>
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
              {!mounted ? (
                // Show nothing or a loading state while mounting
                <div className="h-9 w-20 animate-pulse bg-gray-200 rounded"></div>
              ) : user ? (
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

      {/* Mobile Menu - for smaller screens */}
      <div className="md:hidden border-b border-border bg-background">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium">Home</Link>
            <Link href="/assignments" className="text-muted-foreground hover:text-primary transition-colors font-medium">Assignments</Link>
            <Link href="/setup" className="text-muted-foreground hover:text-primary transition-colors font-medium">Setup</Link>
            {user && (
              <>
                <Link href="/student" className="text-muted-foreground hover:text-primary transition-colors font-medium">Student</Link>
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
      {isLoginOpen && mounted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-[10000]">
            <Login onBackToHome={() => setIsLoginOpen(false)} />
            <button className="absolute top-2 right-2 text-white text-2xl font-bold z-[10001]" onClick={() => setIsLoginOpen(false)}>×</button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterOpen && mounted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-[10000]">
            <Register onBackToHome={() => setIsRegisterOpen(false)} />
            <button className="absolute top-2 right-2 text-white text-2xl font-bold z-[10001]" onClick={() => setIsRegisterOpen(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}
