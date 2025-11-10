"use client";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Register from "./Register";
import { auth } from "../../lib/firebase";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import ResetPasswordModal from "./ResetPass";
import { useToast } from "@/hooks/use-toast";

export default function Login({ onBackToHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const router = useRouter();
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [unverifiedPassword, setUnverifiedPassword] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const { toast } = useToast();

  // Close login modal if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log("[Login] User already signed in, closing modal");
        onBackToHome();
      }
    });
    return () => unsubscribe();
  }, [onBackToHome]);

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

  const checkVerification = async () => {
    if (!unverifiedUser?.uid) return;

    try {
      const dbRes = await fetch(`/api/users?uid=${unverifiedUser.uid}`);
      const response = await dbRes.json();
      const userData = response.user;

      if (userData && userData.emailVerified) {
        console.log("[Login] Email verified! Logging in user...");
        setError("");

        // Sign in with stored credentials
        try {
          await signInWithEmailAndPassword(
            auth,
            unverifiedUser.email,
            unverifiedPassword
          );
          setAwaitingVerification(false);
          setUnverifiedUser(null);
          setUnverifiedPassword("");
          router.push("/");
          return;
        } catch (signInErr) {
          console.error(
            "[Login] Failed to sign in after verification:",
            signInErr
          );
          setError(
            "Verification successful but login failed. Please try signing in again."
          );
          setAwaitingVerification(false);
          setUnverifiedUser(null);
          setUnverifiedPassword("");
          return;
        }
      }

      setError(
        "Email still not verified. Please click the link in your inbox."
      );
    } catch (err) {
      console.error("[Login] Verification check error:", err);
      setError("Failed to check verification status. Try again.");
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser?.email || !unverifiedUser?.uid) {
      setError("User information not available.");
      return;
    }

    setResendDisabled(true);
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: unverifiedUser.uid,
          email: unverifiedUser.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend email");
      }
      setError("");
      toast({
        title: "Verification email resent",
        description: "Check your inbox for the new verification link.",
      });
    } catch (err) {
      console.error("[Login] Resend error:", err);
      setError("Failed to resend verification email. Try again later.");
      toast({
        title: "Could not resend email",
        description: err.message || "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      // Wait 60 seconds before allowing resend again
      setTimeout(() => setResendDisabled(false), 60000);
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

      // Check if email is verified from database
      try {
        const res = await fetch(`/api/users?uid=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          const userData = data.user;

          // If email is not verified, show verification screen
          if (!userData?.emailVerified) {
            console.log(
              "[Login] Email not verified, showing verification screen"
            );
            await signOut(auth); // Sign them out again
            setUnverifiedUser(user);
            setUnverifiedPassword(password); // Store password for later re-authentication
            setAwaitingVerification(true);
            setError("");
            return;
          }

          // Email is verified, allow login
          router.push("/");
          onBackToHome && onBackToHome();
          return;
        }
      } catch (err) {
        console.error("Error checking user verification:", err);
      }

      // Fallback: if database check fails, proceed anyway
      router.push("/");
      onBackToHome && onBackToHome();
    } catch (err) {
      // Handle Firebase auth errors with user-friendly messages
      if (err.code === "auth/user-not-found") {
        setError("❌ This email is not registered. Please sign up first.");
      } else if (err.code === "auth/wrong-password") {
        setError("❌ Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("❌ Invalid email address. Please check and try again.");
      } else if (err.code === "auth/user-disabled") {
        setError("❌ This account has been disabled. Please contact support.");
      } else if (err.code === "auth/invalid-credential") {
        setError(
          "❌ Email or password is incorrect. Please check and try again, or sign up if you don't have an account."
        );
      } else if (err.code === "auth/too-many-requests") {
        setError("❌ Too many failed login attempts. Please try again later.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError(
          "❌ An account already exists with this email. Please sign in or use a different email."
        );
      } else if (err.code === "auth/credential-already-in-use") {
        setError(
          "❌ This credential is already in use. Please use a different method."
        );
      } else if (err.code === "auth/email-already-in-use") {
        setError(
          "❌ This email is already registered. Please sign in instead."
        );
      } else if (err.code === "auth/weak-password") {
        setError("❌ Password is too weak. Please use a stronger password.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError(
          "❌ Email/password sign-in is currently disabled. Please contact support."
        );
      } else if (err.code === "auth/network-request-failed") {
        setError(
          "❌ Network error. Please check your internet connection and try again."
        );
      } else {
        // Generic message for unknown errors
        setError(
          "❌ Login failed. Please sign up first if you don't have an account."
        );
      }
    }
  };

  if (showRegister)
    return (
      <Register
        onBackToLogin={() => setShowRegister(false)}
        onBackToHome={onBackToHome}
      />
    );

  // If user needs to verify email during login
  if (awaitingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
        <div className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
          <h2 className="text-center text-2xl font-bold mb-4">
            📧 Email Verification Required
          </h2>
          {error && (
            <div className="text-red-600 text-sm text-center mb-4 p-3 bg-red-50 rounded">
              {error}
            </div>
          )}

          <p className="mt-4 text-center text-sm text-gray-700">
            Your account hasn't been verified yet.
            <br />
            <strong className="block mt-2">{unverifiedUser?.email}</strong>
          </p>

          <p className="mt-4 text-center text-xs text-gray-600">
            Please check your inbox for the verification link. Click it to
            activate your account.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={checkVerification}
              className="w-full py-3 px-4 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
            >
              ✓ I have verified — Check Now
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendDisabled}
              className={`w-full py-2 px-4 rounded-xl font-medium transition-colors ${
                resendDisabled
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {resendDisabled
                ? "⏳ Please wait..."
                : "📤 Resend Verification Email"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAwaitingVerification(false);
                setUnverifiedUser(null);
                setUnverifiedPassword("");
                setError("");
              }}
              className="w-full py-2 px-4 rounded-xl bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
            >
              Try Different Account
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
            ℹ️ You cannot log in without verifying your email first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
      <div className="relative bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
        <button
          type="button"
          onClick={() => onBackToHome?.()}
          className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close sign in dialog"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-center text-3xl font-extrabold text-gray-800 drop-shadow-sm">
          Sign in to Virtual Classroom
        </h2>

        <form className="mt-6 space-y-6" onSubmit={handleEmailLogin}>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="login-email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              id="login-password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            Sign in
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

      {/* eslint-disable-next-line react/no-unknown-property */}
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

Login.propTypes = {
  onBackToHome: PropTypes.func,
};
