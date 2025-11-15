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
            "Email verified successfully. Please sign in again to continue."
          );
          setAwaitingVerification(false);
          setUnverifiedUser(null);
          setUnverifiedPassword("");
          return;
        }
      }

      setError(
        "Email not yet verified. Please check your inbox and click the verification link."
      );
    } catch (err) {
      console.error("[Login] Verification check error:", err);
      setError("Unable to verify email status. Please try again.");
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser?.email || !unverifiedUser?.uid) {
      setError("Unable to resend verification email. Please try signing in again.");
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
      setError("Unable to resend verification email. Please try again in a moment.");
      toast({
        title: "Resend Failed",
        description: err.message || "Please wait a moment and try again.",
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
        setError("This email is not registered. Please create an account first.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again or reset your password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled. Contact support for assistance.");
      } else if (err.code === "auth/invalid-credential") {
        setError(
          "Invalid email or password. Please check your credentials or create an account if you're new."
        );
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a few minutes before trying again.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError(
          "An account with this email already exists. Please sign in using your original method."
        );
      } else if (err.code === "auth/credential-already-in-use") {
        setError(
          "This credential is already associated with another account."
        );
      } else if (err.code === "auth/email-already-in-use") {
        setError(
          "This email is already registered. Please sign in instead."
        );
      } else if (err.code === "auth/weak-password") {
        setError("Please choose a stronger password.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email/password authentication is currently unavailable. Please contact support."
        );
      } else if (err.code === "auth/network-request-failed") {
        setError(
          "Connection failed. Please check your internet connection and try again."
        );
      } else {
        // Generic message for unknown errors
        setError(
          "Unable to sign in. Please verify your credentials or create an account if you're new."
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
      <div className="fixed inset-0 z-100 min-h-screen flex items-center justify-center bg-white/30 backdrop-blur-md">
        <div className="relative bg-card border border-border p-10 rounded-2xl shadow-lg w-full max-w-md">
          <button
            type="button"
            onClick={() => onBackToHome?.()}
            className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close verification dialog"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-center text-2xl font-bold mb-4 text-foreground">
            📧 Email Verification Required
          </h2>
          {error && (
            <div className="text-destructive text-sm text-center mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
              {error}
            </div>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Your account hasn't been verified yet.
            <br />
            <strong className="block mt-2 text-foreground">{unverifiedUser?.email}</strong>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Please check your inbox for the verification link. Click it to
            activate your account.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={checkVerification}
              className="w-full py-3 px-4 rounded-xl bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors"
            >
              ✓ I have verified — Check Now
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendDisabled}
              className={`w-full py-2 px-4 rounded-xl font-medium transition-colors ${
                resendDisabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
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
              className="w-full py-2 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
            >
              Try Different Account
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground border-t border-border pt-4">
            ℹ️ You cannot log in without verifying your email first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 min-h-screen flex items-center justify-center bg-white/30 backdrop-blur-md">
      <div className="relative bg-card border border-border p-10 rounded-2xl shadow-lg w-full max-w-md">
        <button
          type="button"
          onClick={() => onBackToHome?.()}
          className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close sign in dialog"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-center text-3xl font-extrabold text-foreground">
          Sign in to Virtual Classroom
        </h2>

        <form className="mt-6 space-y-6" onSubmit={handleEmailLogin}>
          {error && (
            <div className="text-destructive text-sm text-center p-3 bg-destructive/10 border border-destructive/20 rounded">{error}</div>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="login-email"
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              id="login-password"
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Sign in
          </button>

          {/* verification handled on registration; no verify button here */}

          <div className="flex flex-col text-center space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-primary hover:text-primary/80 text-sm font-medium cursor-pointer"
            >
              Forgot password?
            </button>
            {showForgot && (
              <ResetPasswordModal onClose={() => setShowForgot(false)} />
            )}

            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="text-primary hover:text-primary/80 text-sm font-medium cursor-pointer"
            >
              Don&apos;t have an account? Sign up
            </button>

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="text-muted-foreground hover:text-foreground text-sm block cursor-pointer"
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

Login.propTypes = {
  onBackToHome: PropTypes.func,
};
