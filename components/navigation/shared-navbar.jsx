"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import NotificationBell from "./notification-bell";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import ResetPasswordModal from "../auth/ResetPass";

// Dynamically import Login/Register to avoid SSR issues
const Login = dynamic(() => import("../auth/Login"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

const Register = dynamic(() => import("../auth/Register"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function SharedNavbar() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage("Please enter your registered email.");
      return;
    }

    setLoadingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setResetMessage(err.message);
    } finally {
      setLoadingReset(false);
    }
  };

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
            setIsAdmin(data.user.role === "instructor");
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

  function ProfileMenu({ username }) {
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
      function handleOutside(e) {
        if (profileRef.current && !profileRef.current.contains(e.target)) {
          setIsProfileOpen(false);
        }
      }
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    return (
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setIsProfileOpen((s) => !s)}
          aria-expanded={isProfileOpen}
          aria-haspopup="true"
          className="cursor-pointer w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-medium uppercase"
          title={username || "User"}
        >
          {(username && username[0]) || "U"}
        </button>

        {isProfileOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black/5">
            <button
              onClick={() => {
                setIsProfileOpen(false);
                setIsChangePasswordOpen(true);
              }}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Change password
            </button>

            <button
              onClick={() => {
                setIsProfileOpen(false);
                signOut(auth);
              }}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        )}

        {isChangePasswordOpen && mounted && (
          <ResetPasswordModal
            defaultEmail={user?.email || ""}
            onClose={() => setIsChangePasswordOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img
                src="/classync-logo.png"
                alt="Classync Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <Link href="/" className="text-xl font-bold text-foreground">
              Classync
            </Link>
          </div>
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/assignments"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Assignments
            </Link>
            <Link
              href="/setup"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Setup
            </Link>
            {user && (
              <>
                <Link
                  href="/student"
                  className="text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  Student
                </Link>
                {(isAdmin ||
                  user?.email?.includes("@instructor.com") ||
                  user?.email?.includes("@admin.com")) && (
                  <Link
                    href="/admin"
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
            <Link
              href="/ai-tools"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              AI Tools
            </Link>
          </nav>
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <NotificationBell />

            <div className="relative">
              {!mounted ? (
                <div className="h-9 w-20 animate-pulse bg-gray-200 rounded"></div>
              ) : user ? (
                <ProfileMenu username={username} />
              ) : (
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  onClick={() => setIsRegisterOpen(true)}
                >
                  Register / Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu - for smaller screens */}
      <div className="md:hidden border-b border-border bg-background">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/assignments"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Assignments
            </Link>
            <Link
              href="/setup"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Setup
            </Link>
            {user && (
              <>
                <Link
                  href="/student"
                  className="text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  Student
                </Link>
                {(isAdmin ||
                  user?.email?.includes("@instructor.com") ||
                  user?.email?.includes("@admin.com")) && (
                  <Link
                    href="/admin"
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
            <Link
              href="/ai-tools"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              AI Tools
            </Link>
          </nav>
        </div>
      </div>

      {/* Login Modal */}
      {isLoginOpen && mounted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-[10000]">
            <Login onBackToHome={() => setIsLoginOpen(false)} />
            <button
              className="absolute top-2 right-2 text-white text-2xl font-bold z-[10001]"
              onClick={() => setIsLoginOpen(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterOpen && mounted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-[10000]">
            <Register onBackToHome={() => setIsRegisterOpen(false)} />
            <button
              className="absolute top-2 right-2 text-white text-2xl font-bold z-[10001] cursor-pointer"
              onClick={() => setIsRegisterOpen(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
