"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import NotificationBell from "./notification-bell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";

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
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userPhoto, setUserPhoto] = useState("");
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showCancelUploadConfirm, setShowCancelUploadConfirm] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const pathname = usePathname();
  const isHomepage = pathname === "/" || pathname === "/homepage";

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

  const openUsernameDialog = () => {
    setPendingUsername(username || "");
    setUsernameError("");
    setIsUsernameDialogOpen(true);
  };

  const openPasswordDialog = () => {
    setResetEmail(user?.email || "");
    setResetMessage("");
    setIsPasswordDialogOpen(true);
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
            setUserRole(data.user.role || null);
            // prefer photo stored in Mongo (photoBase64) or fallback to photoURL
            if (data.user?.photoBase64) {
              setUserPhoto(
                `data:${data.user.photoContentType};base64,${data.user.photoBase64}`
              );
            } else if (data.user?.photoURL) {
              setUserPhoto(data.user.photoURL);
            } else {
              setUserPhoto("");
            }
          } else {
            setUsername(currentUser.email.split("@")[0]);
            setIsAdmin(false);
            setUserRole(null);
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
        setUserRole(null);
        setUserPhoto("");
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

  // file select handler for profile pic
  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    // Basic client-side validation
    const MAX_MB = 6; // don't accept extremely large files
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: `Please select an image smaller than ${MAX_MB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleCloseUploadModal = () => {
    setIsUploadOpen(false);
    setSelectedFile(null);
    setPreviewUrl("");
    setUploading(false);
    setShowCancelUploadConfirm(false);
    setShowRemovePhotoConfirm(false);
  };

  const handleUploadProfile = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Log in before uploading a profile picture.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Choose an image before uploading.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Read file as base64 data URL
      const reader = new FileReader();
      const fileRead = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedFile);
      const dataUrl = await fileRead;

      const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!match) throw new Error("Could not parse file data");
      const contentType = match[1];
      const base64 = match[2];

      const idToken = await auth.currentUser?.getIdToken?.();
      const res = await fetch("/api/users/upload-photo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          uid: user.uid,
          photoBase64: base64,
          photoContentType: contentType,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
      console.log("upload-photo response", res.status, data);

      if (!res.ok) {
        toast({
          title: "Upload failed",
          description: data?.message || `Server responded with ${res.status}.`,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // show the uploaded image immediately
      setUserPhoto(dataUrl);
      handleCloseUploadModal();
      toast({
        title: "Profile updated",
        description: "Your profile picture has been updated.",
      });
    } catch (err) {
      console.error("Error uploading profile picture to server:", err);
      toast({
        title: "Upload failed",
        description:
          "Could not upload your profile picture. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    setShowRemovePhotoConfirm(false);
    try {
      setUploading(true);
      const idToken = await auth.currentUser?.getIdToken?.();
      const res = await fetch("/api/users/remove-photo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ uid: user.uid }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
      console.log("remove-photo response", res.status, data);
      if (!res.ok) {
        toast({
          title: "Failed to remove photo",
          description: data?.message || `Server responded with ${res.status}.`,
          variant: "destructive",
        });
        return;
      }

      try {
        if (auth.currentUser?.photoURL) {
          await updateProfile(auth.currentUser, {
            photoURL: null,
          });
        }
      } catch (error) {
        console.warn("Failed to clear Firebase photoURL:", error);
      }

      setUserPhoto("");
      setPreviewUrl("");
      setSelectedFile(null);
      setIsUploadOpen(false);
      toast({
        title: "Profile photo removed",
        description: "Your profile picture has been cleared.",
      });
    } catch (err) {
      console.error("Error removing photo:", err);
      toast({
        title: "Failed to remove photo",
        description: "Something went wrong while removing your picture.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!user) return;

    const trimmedUsername = pendingUsername.trim();
    if (!trimmedUsername) {
      setUsernameError("Username is required.");
      return;
    }

    if (trimmedUsername === username) {
      setIsUsernameDialogOpen(false);
      return;
    }

    try {
      setSavingUsername(true);

      const idToken = await user.getIdToken?.();
      const res = await fetch(`/api/users/update-username`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          uid: user.uid,
          newUsername: trimmedUsername,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setUsernameError(data?.message || "Failed to update username.");
        return;
      }

      setUsername(trimmedUsername);
      setIsUsernameDialogOpen(false);
    } catch (err) {
      console.error("Error updating username:", err);
      setUsernameError("Unexpected error. Please try again.");
    } finally {
      setSavingUsername(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProfileOpen((s) => !s)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            className="cursor-pointer w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-medium uppercase overflow-hidden"
            title={username || "User"}
          >
            {userPhoto || user?.photoURL ? (
              <img
                src={userPhoto || user.photoURL}
                alt={`${username || "User"} avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="uppercase">
                {(username && username[0]) || "U"}
              </span>
            )}
          </button>
        </div>

        {isProfileOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black/5">
            <div className="flex flex-col justify-center items-left w-full text-left px-4 py-2 text-sm text-muted-foreground border-b border-border gap-0.5">
              <p>{username}</p>
              <p className="text-xs">{user?.email}</p>
            </div>

            <button
              onClick={() => {
                setIsProfileOpen(false);
                openUsernameDialog();
              }}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Change Username
            </button>

            <button
              onClick={() => {
                setIsProfileOpen(false);
                openPasswordDialog();
              }}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Change Password
            </button>

            <button
              onClick={() => {
                setIsProfileOpen(false);
                // open upload modal at root level
                setIsUploadOpen(true);
                // preload preview with current stored photo
                setPreviewUrl(userPhoto || user?.photoURL || "");
              }}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Upload Profile Picture
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
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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
          {!isHomepage && (
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Home
              </Link>
              {/* Single Assignments entry will be shown under authenticated section */}
              {/* Setup link removed (was used for dummy data) */}
              {user && (
                <>
                  {/* Show Assignments only for students (role-based) */}
                  {userRole === "student" && (
                    <Link
                      href="/assignments"
                      className="text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      Assignments
                    </Link>
                  )}
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
          )}
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
      {!isHomepage && (
        <div className="md:hidden border-b border-border bg-background">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link
                href="/"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Home
              </Link>
              {/* Authenticated users see Assignments below */}
              {/* Setup link removed (was used for dummy data) */}
              {user && (
                <>
                  {userRole === "student" && (
                    <Link
                      href="/assignments"
                      className="text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      Assignments
                    </Link>
                  )}
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
      )}

      {/* Login Modal */}
      {isLoginOpen && mounted && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-10000">
            <Login onBackToHome={() => setIsLoginOpen(false)} />
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterOpen && mounted && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
          <div className="relative w-full max-w-md mx-auto z-10000">
            <Register onBackToHome={() => setIsRegisterOpen(false)} />
          </div>
        </div>
      )}

      <Dialog
        open={isUsernameDialogOpen}
        onOpenChange={(open) => {
          setIsUsernameDialogOpen(open);
          if (!open) {
            setUsernameError("");
            setPendingUsername(username || "");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update username</DialogTitle>
            <DialogDescription>
              Choose the name classmates will see across the platform.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleChangeUsername();
            }}
          >
            <div className="space-y-2">
              <Input
                value={pendingUsername}
                onChange={(event) => {
                  setPendingUsername(event.target.value);
                  if (usernameError) {
                    setUsernameError("");
                  }
                }}
                placeholder="Enter a new username"
                autoFocus
              />
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsUsernameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="cursor-pointer"
                type="submit"
                disabled={savingUsername}
              >
                {savingUsername ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showCancelUploadConfirm}
        onOpenChange={setShowCancelUploadConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel upload?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected image is still uploading. Canceling now will stop the
              upload.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep uploading</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelUploadConfirm(false);
                handleCloseUploadModal();
              }}
            >
              Cancel upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRemovePhotoConfirm}
        onOpenChange={setShowRemovePhotoConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your current avatar. You can upload a new picture
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Keep photo
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={handleRemovePhoto}
              disabled={uploading}
            >
              Remove photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) {
            setResetMessage("");
            setLoadingReset(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              We&apos;ll email you a secure link to choose a new password.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="space-y-2">
              <Input
                type="email"
                value={resetEmail}
                onChange={(event) => {
                  setResetEmail(event.target.value);
                  if (resetMessage) {
                    setResetMessage("");
                  }
                }}
                placeholder="you@example.com"
                required
              />
              {resetMessage && (
                <p
                  className={`text-sm ${
                    resetMessage.toLowerCase().includes("sent")
                      ? "text-emerald-600"
                      : "text-destructive"
                  }`}
                >
                  {resetMessage}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={loadingReset}
              >
                Cancel
              </Button>
              <Button
                className="cursor-pointer"
                type="submit"
                disabled={loadingReset}
              >
                {loadingReset ? "Sending..." : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Upload Profile Picture Modal */}
      {isUploadOpen && mounted && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
            <button
              onClick={() => {
                if (uploading) {
                  setShowCancelUploadConfirm(true);
                  return;
                }
                handleCloseUploadModal();
              }}
              className="absolute top-3 right-4 text-gray-700 text-2xl font-bold hover:text-gray-900 transition cursor-pointer"
            >
              ×
            </button>

            <h3 className="text-lg font-semibold mb-4">
              Upload Profile Picture
            </h3>

            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <label className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer text-sm text-gray-700">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16V4m0 0L3 8m4-4 4 4M17 8v8a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0l-4-4"
                  />
                </svg>
                <span>Choose file</span>
              </label>
              {selectedFile && (
                <p className="text-xs text-gray-600 mt-2">
                  {selectedFile.name}
                </p>
              )}

              <div className="w-full flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (uploading) {
                      setShowCancelUploadConfirm(true);
                      return;
                    }
                    handleCloseUploadModal();
                  }}
                  className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>

                {(userPhoto || user?.photoURL) && (
                  <button
                    onClick={() => setShowRemovePhotoConfirm(true)}
                    disabled={uploading}
                    className="cursor-pointer px-3 py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 rounded-md"
                  >
                    Remove
                  </button>
                )}

                <button
                  onClick={handleUploadProfile}
                  disabled={uploading}
                  className="cursor-pointer px-3 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
