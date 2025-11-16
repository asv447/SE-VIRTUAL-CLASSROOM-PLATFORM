"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, User, LogOut, Menu, X, GraduationCap } from "lucide-react";

export default function NavigationBar() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      setUser(usr);
      if (usr && usr.uid) {
        try {
          const res = await fetch(`/api/users/${usr.uid}`);
          if (res.ok) {
            const json = await res.json().catch(() => ({}));
            const role = json?.user?.role || null;
            setUserRole(role);
          } else {
            setUserRole(null);
          }
        } catch (e) {
          console.error("Failed to fetch user role for navbar:", e);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Determine role from server-side user profile. Avoid relying on email heuristics.
  // Show Assignments only to students. Treat any non-student role as instructor/admin.
  const isStudent = userRole === "student";
  const isInstructor = userRole === "instructor";
  const isAdmin = userRole === "admin" || userRole === "instructor";
  const isHomepage = pathname === "/" || pathname === "/homepage";
  const showNavLinks = !isHomepage;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Clas<span className="text-blue-600">sync</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {showNavLinks && (
              <>
                <Link
                  href="/"
                  className={`px-3 py-2 text-sm font-bold transition-colors ${
                    pathname === "/" || pathname === "/homepage"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  Home
                </Link>
                {user && (
                  <>
                    {/* Show Assignments link only for students (role-based) */}
                    {isStudent && (
                      <Link
                        href="/assignments"
                        className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                          pathname === "/assignments"
                            ? "text-blue-600 font-bold border-b-2 border-blue-600"
                            : "text-gray-700 hover:text-blue-600"
                        }`}
                      >
                        <User className="h-4 w-4" />
                        Assignments
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                          pathname === "/admin"
                            ? "text-blue-600 font-bold border-b-2 border-blue-600"
                            : "text-gray-700 hover:text-blue-600"
                        }`}
                      >
                        <BookOpen className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                  </>
                )}
              </>
            )}

            {user ? (
              <div
                className={`flex items-center space-x-4 ${
                  showNavLinks ? "border-l border-gray-300 pl-4" : ""
                }`}
              >
                <span className="text-sm text-gray-600">
                  {user.displayName || user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              {showNavLinks && (
                <>
                  <Link
                    href="/"
                    className={`px-3 py-2 text-base font-bold ${
                      pathname === "/" || pathname === "/homepage"
                        ? "text-blue-600 border-l-4 border-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  {user && (
                    <>
                      {isStudent && (
                        <Link
                          href="/assignments"
                          className={`px-3 py-2 text-base font-medium flex items-center gap-2 ${
                            pathname === "/assignments"
                              ? "text-blue-600 font-bold border-l-4 border-blue-600 bg-blue-50"
                              : "text-gray-700 hover:text-blue-600"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Assignments
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className={`px-3 py-2 text-base font-medium flex items-center gap-2 ${
                            pathname === "/admin"
                              ? "text-blue-600 font-bold border-l-4 border-blue-600 bg-blue-50"
                              : "text-gray-700 hover:text-blue-600"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <BookOpen className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}

              {user ? (
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="px-3 text-sm text-gray-600">
                    {user.displayName || user.email}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="ml-3 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 px-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button size="sm" className="w-full">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
