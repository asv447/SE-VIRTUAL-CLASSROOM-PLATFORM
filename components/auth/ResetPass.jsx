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
    <div className="min-h-[502px] fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm rounded-2xl">
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl ring-1 ring-black/5 transition-all">
        <button
          onClick={onClose}
          className="cursor-pointer absolute right-3 top-3 rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close reset password dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-7">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Reset password
            </h2>
            <p className="text-sm text-gray-500">
              Enter the email you used to register and we&apos;ll send a reset
              link.
            </p>
          </div>

          <form onSubmit={handleSendLink} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="reset-password-email"
                className="text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                id="reset-password-email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
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
            className="cursor-pointer mt-6 w-full text-sm font-medium text-gray-500 transition hover:text-gray-700"
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
