"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Register from "./Register";
import { auth } from "../../lib/firebase";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import ResetPasswordModal from "./ResetPass";

export default function Login({ onBackToHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const router = useRouter();
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setResetMessage("Please enter your email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
    } catch (error) {
      setResetMessage(error.message);
    }
  };

  const handleEmailLogin = async (e) => {
    //manual
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await user.reload();
      // Check user's role from the database
      try {
        const res = await fetch(`/api/users?uid=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          router.push("/");
         } 
      } catch (err) {
        console.error("Error verifying user role:", err);
        // Fallback to email check if database check fails
      }
    } catch (err) {
      // Handle Firebase auth errors with user-friendly messages
      if (err.code === "auth/user-not-found") {
        setError("This email is not registered. Please sign up first.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address. Please check and try again.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled. Please contact support.");
      } else {
        setError(err.message);
      }
    }
    onBackToHome && onBackToHome();
  };

  const handleGoogleLogin = async () => {
    //direct and ease of use
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Try server-side API write for Google login user creation
      try {
        const username = (user.email || "").split("@")[0];
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            username,
            email: user.email,
            role: "student",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("[Google Login] Server API write failed:", data);
          // Continue with login even if user creation fails - user can be created later
        } else {
          console.log("[Google Login] Server API write success:", data);
        }
      } catch (apiErr) {
        console.error("[Google Login] Server API error:", apiErr);
        // Continue with login even if user creation fails
      }

      router.push("/homepage"); //LR page
    } catch (err) {
      setError(err.message);
    }
  };
  if (showRegister)
    return (
      <Register
        onBackToLogin={() => setShowRegister(false)}
        onBackToHome={onBackToHome}
      />
    );
  return (
    <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
      <div className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
        <h2 className="text-center text-3xl font-extrabold text-gray-800 drop-shadow-sm">
          Sign in to Virtual Classroom
        </h2>

        <form className="mt-6 space-y-6" onSubmit={handleEmailLogin}>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2 px-4 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium shadow-md hover:bg-gray-100 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            Sign in with Google
          </button>

          {/* verification handled on registration; no verify button here */}

          <div className="flex flex-col text-center space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium cursor-pointer"
            >
              Forgot password?
            </button>
            {showForgot && (
              <ResetPasswordModal onClose={() => setShowForgot(false)} />
            )}

            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium cursor-pointer"
            >
              Don&apos;t have an account? Sign up
            </button>

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="text-gray-600 hover:text-gray-500 text-sm block cursor-pointer"
              >
                Back to Home
              </button>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
