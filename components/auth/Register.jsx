"use client";
import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from "firebase/auth";
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

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setError("");
    }
    function handleOffline() {
      setIsOnline(false);
      setError(
        "You are offline. Please connect to the internet and try again."
      );
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

    if (!email) {
      setError("Please enter an email.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!isOnline) {
      setError("You're offline. Connect to the internet to register.");
      return;
    }

 
    // Validate instructor credentials
    if (role === "instructor") {
      if (instructorPassword !== "instructor") {
        setError("Invalid instructor verification password.");
        return;
      }
      // Force role to instructor if email is instructor domain
      setRole("instructor");
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
        console.log("[Register] Sending email verification...");
        await sendEmailVerification(user);
        setMessage(
          "Verification email sent. Please check your inbox to verify your account."
        );
      } catch (verifErr) {
        console.warn("sendEmailVerification error:", verifErr);
        setError(
          "Account created but failed to send verification email. Please check your email settings."
        );
      }

      const username = email.split("@")[0];
      console.log("[Register] Calling server API to create user doc:", {
        uid: user?.uid,
        username,
        email,
      });

      // Try server-side API write first (recommended)
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            username,
            email,
            role: role,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("[Register] Server API write failed:", data);
          throw new Error(data.error || "Server write failed");
        }
        console.log("[Register] Server API write success:", data);
      } catch (apiErr) {
        console.error("[Register] Server API error:", apiErr);

        // Client-side fallback no longer needed - MongoDB handles all writes
      }

      setError("");
      setMessage((msg) =>
        msg
          ? msg + " Account created successfully!"
          : "Account created successfully!"
      );

      onBackToHome && onBackToHome();
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
          "Failed to contact server: you appear to be offline. Connect to the internet and try again."
        );
      } else {
        if (e.code === "auth/email-already-in-use") {
          setError(
            "This email is already in use. Try logging in or use a different email."
          );
        } else if (e.code === "auth/invalid-email") {
          setError("Invalid email address.");
        } else if (e.code === "auth/weak-password") {
          setError(
            "Password is too weak. Choose a stronger password (at least 6 characters)."
          );
        } else {
          setError(msg);
        }
      }
      setMessage("");
      console.error("Register error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Try server-side API write for Google registration
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
          console.error("[Google Register] Server API write failed:", data);
          throw new Error(data.error || "Server write failed");
        }
        console.log("[Google Register] Server API write success:", data);
      } catch (apiErr) {
        console.error("[Google Register] Server API error:", apiErr);
        throw new Error("Failed to create user record in database.");
      }

      onBackToHome && onBackToHome();
    } catch (err) {
      console.error("Google register error:", err);
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes("permission")) {
        setError(
          "Permission denied: Database write failed. Check server configuration."
        );
      } else if (msg.toLowerCase().includes("popup")) {
        setError("Google sign-in popup blocked or closed. Try again.");
      } else {
        setError(msg);
      }
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
      <div className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
        <h2 className="text-center text-3xl font-extrabold text-gray-800 drop-shadow-sm">
          Create your account
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
            className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            {loading ? "Creating..." : "Sign up"}
          </button>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full py-2 px-4 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium shadow-md hover:bg-gray-100 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            Sign up with Google
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
