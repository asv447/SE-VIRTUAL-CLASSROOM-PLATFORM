"use client";
import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signOut,
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
  // state to manage verification wait (must be declared before any early return)
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [resendDisabled, setResendDisabled] = useState(false);

  // finalize registration after verification
  const checkVerification = async () => {
    if (!auth.currentUser) return;
    
    try {
      // First check database for verification status
      const dbRes = await fetch(`/api/users?uid=${auth.currentUser.uid}`);
      const response = await dbRes.json();
      const userData = response.user;
      
      if (userData && userData.emailVerified) {
        console.log("[Register] User verified in database!");
        setError("");
        setAwaitingVerification(false);
        setMessage("Email verified. Finalizing account creation...");
        
        // create DB record now that email is verified
        try {
          const username = (auth.currentUser.email || "").split("@")[0];
          const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: auth.currentUser.uid,
              username,
              email: auth.currentUser.email,
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
          // proceed anyway; user can be created later
        }

        onBackToHome && onBackToHome();
        return;
      }
    } catch (err) {
      console.log("[Register] Database check error, trying Firebase:", err.message);
    }
    
    // Fallback: check Firebase emailVerified
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      console.log("[Register] User verified in Firebase!");
      setError("");
      setAwaitingVerification(false);
      setMessage("Email verified. Finalizing account creation...");
      // create DB record now that email is verified
      try {
        const username = (auth.currentUser.email || "").split("@")[0];
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: auth.currentUser.uid,
            username,
            email: auth.currentUser.email,
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
        // proceed anyway; user can be created later
      }

      onBackToHome && onBackToHome();
    } else {
      setError("Email still not verified. Please click the link in your inbox.");
    }
  };

  // Poll for verification status while waiting to improve UX
  useEffect(() => {
    if (!awaitingVerification || !createdUser) return;
    
    const uid = createdUser.uid;
    let isActive = true;
    
    // Check database for verification status
    const checkDatabaseVerification = async () => {
      try {
        if (!isActive) return false;
        const dbRes = await fetch(`/api/users?uid=${uid}`);
        const response = await dbRes.json();
        const userData = response.user;
        
        console.log("[Register] Database check result:", { uid, emailVerified: userData?.emailVerified });
        
        if (userData && userData.emailVerified) {
          console.log("[Register] Email verified detected in database!");
          if (isActive) {
            checkVerification();
          }
          return true;
        }
      } catch (err) {
        console.log("[Register] Database check error:", err.message);
      }
      return false;
    };

    // Immediate check when tab comes back into focus
    const handleVisibilityChange = async () => {
      if (!document.hidden && isActive) {
        console.log("[Register] Page visibility changed, checking verification...");
        const found = await checkDatabaseVerification();
        if (!found && auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            console.log("[Register] Email verified in Firebase!");
            checkVerification();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Regular polling every 2 seconds to check database
    const iv = setInterval(async () => {
      try {
        if (!isActive) return;
        
        // Check database first (faster)
        const found = await checkDatabaseVerification();
        
        // Also check Firebase as fallback
        if (!found && auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            console.log("[Register] Email verified from Firebase polling!");
            checkVerification();
          }
        }
      } catch (err) {
        console.error("poll verification error:", err);
      }
    }, 2000);

    return () => {
      isActive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [awaitingVerification, createdUser]);

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

      // Sign out immediately - user should not be logged in until email is verified
      await signOut(auth);
      console.log("[Register] User signed out - will not be logged in until email is verified");

      try {
        // Create user record immediately with emailVerified: false
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
            emailVerified: false,
          }),
        });
        const userData = await userRes.json();
        console.log("[Register] User record created:", userData);

        // Send verification email via custom SMTP API route
        console.log("[Register] Sending email verification via SMTP...");
        const smtpRes = await fetch("/api/auth/send-verification-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
          }),
        });
        const smtpData = await smtpRes.json();
        if (!smtpRes.ok) {
          throw new Error(smtpData.error || "Failed to send verification email");
        }
        setMessage(
          "Verification email sent. Please check your inbox to verify your account."
        );
        setAwaitingVerification(true);
        setCreatedUser({ uid: user.uid, email });
      } catch (verifErr) {
        console.warn("Verification setup error:", verifErr);
        setError(
          "Account created but setup incomplete. Please refresh and try logging in."
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

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      setResendDisabled(true);
      setError("");
      // Call SMTP email API to resend verification
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend");
      }
      setMessage("Verification email resent. Check your inbox.");
      // simple cooldown
      setTimeout(() => setResendDisabled(false), 30 * 1000);
    } catch (err) {
      console.error("resend verification error:", err);
      setError("Failed to resend verification email. Try again later.");
      setResendDisabled(false);
    }
  };

  // If waiting for verification, show a small verification-check UI
  if (awaitingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
        <div className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
          <h2 className="text-center text-2xl font-bold mb-4">📧 Verify Your Email</h2>
          {error && <div className="text-red-600 text-sm text-center mb-4 p-3 bg-red-50 rounded">{error}</div>}
          {message && <div className="text-green-600 text-sm text-center mb-4 p-3 bg-green-50 rounded">{message}</div>}

          <p className="mt-4 text-center text-sm text-gray-700">
            A verification link was sent to<br/>
            <strong className="block mt-2">{createdUser?.email}</strong>
          </p>

          <p className="mt-4 text-center text-xs text-gray-600">
            Please check your inbox and spam folder. Click the verification link to activate your account.
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
              className={`w-full py-2 px-4 rounded-xl font-medium transition-colors ${resendDisabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {resendDisabled ? '⏳ Please wait before resending...' : '📤 Resend Verification Email'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
            ℹ️ You will not be able to log in until your email is verified.
          </p>
        </div>
      </div>
    );
  }

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
