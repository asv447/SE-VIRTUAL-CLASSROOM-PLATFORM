"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { auth } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Login from "./Login";

export default function Register({ onBackToHome }) {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [instructorPassword, setInstructorPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [emailVerificationStep, setEmailVerificationStep] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setError("");
    }
    function handleOffline() {
      setIsOnline(false);
      setError(
        "No internet connection. Please connect to the internet and try again."
      );
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const [resendDisabled, setResendDisabled] = useState(false);

  // Send verification email on email submission
  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!isOnline) {
      setError("No internet connection. Please connect to the internet and try again.");
      return;
    }

    setLoading(true);
    try {
      // Send verification email
      console.log("[Register] Sending verification email to:", email);
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }
      setMessage("Verification email sent. Please check your inbox.");
      setEmailVerificationStep(true);
    } catch (err) {
      console.error("Email verification error:", err);
      setError(err.message || "Unable to send verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if email is verified
  const handleCheckEmailVerification = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/check-email-verified`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });
      const data = await res.json();
      if (data.emailVerified) {
        console.log("[Register] Email verified!");
        setMessage(
          "Email verified successfully! Now complete your registration."
        );
        setEmailVerified(true);
        setEmailVerificationStep(false);
      } else {
        setError("Email not yet verified. Please check your inbox and click the verification link.");
      }
    } catch (err) {
      console.error("Check verification error:", err);
      setError("Unable to verify email status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    if (!email) return;
    try {
      setResendDisabled(true);
      setError("");
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend");
      }
      setMessage("Verification email resent. Check your inbox.");
      setTimeout(() => setResendDisabled(false), 30 * 1000);
    } catch (err) {
      console.error("resend verification error:", err);
      setError("Unable to resend verification email. Please try again in a moment.");
      setResendDisabled(false);
    }
  };

  if (showLogin) {
    return (
      <Login
        onBackToRegister={() => setShowLogin(false)}
        onBackToHome={onBackToHome}
      />
    );
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    console.log("[Register] Submit clicked. Email:", email);

    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }
    if (!isOnline) {
      setError("No internet connection. Please connect to the internet and try again.");
      return;
    }

    // Validate instructor credentials
    if (role === "instructor") {
      if (instructorPassword !== "instructor") {
        setError("Invalid instructor verification password. Please contact your administrator.");
        return;
      }
    }

    setLoading(true);
    try {
      console.log("[Register] Calling createUserWithEmailAndPassword...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("[Register] Auth user created:", {
        uid: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
        providerData: user?.providerData?.map((p) => p.providerId),
      });

      try {
        // Create user record with verified email
        console.log("[Register] Creating user record in database...");
        const username = (user.email || "").split("@")[0];
        const userRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            username,
            email: user.email,
            role: role,
            emailVerified: true,
          }),
        });
        const userData = await userRes.json();
        console.log("[Register] User record created:", userData);

        setMessage("Account created successfully!");

        // Reset form
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setEmailVerified(false);
        setEmailVerificationStep(false);

        // Go to home
        setTimeout(() => {
          onBackToHome && onBackToHome();
        }, 1000);
      } catch (apiErr) {
        console.error("[Register] Server API error:", apiErr);
        setError(
          "Account created successfully, but setup is incomplete. Please refresh the page and sign in."
        );
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      console.error("[Register] Error during registration:", {
        code: e?.code,
        message: msg,
      });
      if (
        msg.toLowerCase().includes("client is offline") ||
        msg.toLowerCase().includes("offline") ||
        msg.toLowerCase().includes("network")
      ) {
        setError(
          "No internet connection detected. Please connect to the internet and try again."
        );
      } else {
        if (e.code === "auth/email-already-in-use") {
          setError(
            "This email is already registered. Please sign in or use a different email address."
          );
        } else if (e.code === "auth/invalid-email") {
          setError("Please enter a valid email address.");
        } else if (e.code === "auth/weak-password") {
          setError(
            "Password is too weak. Please use at least 6 characters with a mix of letters and numbers."
          );
        } else if (e.code === "auth/invalid-credential") {
          setError(
            "Invalid credentials. Please verify your information and try again."
          );
        } else if (e.code === "auth/too-many-requests") {
          setError(
            "Too many registration attempts. Please wait a few minutes before trying again."
          );
        } else if (e.code === "auth/operation-not-allowed") {
          setError(
            "Registration is currently unavailable. Please contact support for assistance."
          );
        } else if (e.code === "auth/network-request-failed") {
          setError(
            "Connection failed. Please check your internet connection and try again."
          );
        } else {
          setError(
            "Registration failed. Please try again or contact support if the problem persists."
          );
        }
      }
      setMessage("");
      console.error("Register error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Email verification
  if (emailVerificationStep) {
    return (
      <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
        <div className="relative bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
          <button
            type="button"
            onClick={() => onBackToHome?.()}
            className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close registration dialog"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-center text-2xl font-bold mb-4">
            📧 Verify Your Email
          </h2>
          {error && (
            <div className="text-red-600 text-sm text-center mb-4 p-3 bg-red-50 rounded">
              {error}
            </div>
          )}
          {message && (
            <div className="text-green-600 text-sm text-center mb-4 p-3 bg-green-50 rounded">
              {message}
            </div>
          )}

          <p className="mt-4 text-center text-sm text-gray-700">
            A verification link was sent to
            <br />
            <strong className="block mt-2">{email}</strong>
          </p>

          <p className="mt-4 text-center text-xs text-gray-600">
            Please check your inbox and spam folder. Click the verification link
            to activate your email.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleCheckEmailVerification}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? "Checking..." : "✓ I have verified — Check Now"}
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
                ? "⏳ Please wait before resending..."
                : "📤 Resend Verification Email"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
            ℹ️ Complete this step before proceeding with registration.
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Email verification done, but user hasn't entered password yet
  if (!emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
        <div className="relative bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
          <button
            type="button"
            onClick={() => onBackToHome?.()}
            className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close registration dialog"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-center text-3xl font-extrabold text-gray-800 drop-shadow-sm">
            Create your account
          </h2>

          <form className="mt-6 space-y-6" onSubmit={handleEmailVerification}>
            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}
            {message && (
              <div className="text-green-600 text-sm text-center">
                {message}
              </div>
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer disabled:bg-gray-400"
            >
              {loading ? "Sending..." : "Verify Email"}
            </button>

            <div className="text-center space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="text-blue-600 hover:text-blue-500 cursor-pointer text-sm font-medium"
              >
                Already have an account? Login
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
      </div>
    );
  }

  // Step 3: Show password and role form after email is verified
  return (
    <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
      <div className="relative bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
        <button
          type="button"
          onClick={() => onBackToHome?.()}
          className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close registration dialog"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-center text-3xl font-extrabold text-gray-800 drop-shadow-sm">
          Complete Registration
        </h2>

        <form className="mt-6 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          {message && (
            <div className="text-green-600 text-sm text-center">{message}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email (Verified)
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>

          {role === "instructor" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Instructor Verification Password
              </label>
              <input
                type="password"
                required={role === "instructor"}
                value={instructorPassword}
                onChange={(e) => setInstructorPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer disabled:bg-gray-400"
          >
            {loading ? "Creating..." : "Sign up"}
          </button>

          <div className="text-center space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEmail("");
                setEmailVerified(false);
                setError("");
                setMessage("");
              }}
              className="text-blue-600 hover:text-blue-500 cursor-pointer text-sm font-medium"
            >
              Use Different Email
            </button>
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="text-blue-600 hover:text-blue-500 cursor-pointer text-sm font-medium block"
            >
              Already have an account? Login
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
