"use client";
import { useState } from "react";
import PropTypes from "prop-types";
import { sendPasswordResetEmail } from "firebase/auth";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function ResetPasswordModal({ defaultEmail = "", onClose }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage("Please enter your email address.");
      setStatus("error");
      return;
    }

    setLoading(true);
    setStatus("pending");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "Password reset link sent successfully. Please check your inbox."
      );
      setStatus("success");
    } catch (err) {
      console.error("[ResetPasswordModal] sendPasswordResetEmail error:", err);
      setMessage(err.message || "Unable to send reset link. Please try again.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 min-h-screen flex items-center justify-center bg-white/30 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-card border border-border p-10 rounded-2xl shadow-lg transition-all">
        <button
          onClick={onClose}
          className="cursor-pointer absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close reset password dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Reset Password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the email you used to register and we&apos;ll send a reset
              link.
            </p>
          </div>

          <form onSubmit={handleSendLink} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="reset-password-email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                id="reset-password-email"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "idle") {
                    setStatus("idle");
                    setMessage("");
                  }
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {message && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                status === "success"
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <p className="leading-snug">{message}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="cursor-pointer w-full py-2 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

ResetPasswordModal.propTypes = {
  defaultEmail: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
