"use client";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ResetPasswordModal({ defaultEmail = "", onClose }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage("Please enter your registered email.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-8 mx-4 animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-700 text-2xl font-bold hover:text-gray-900 transition cursor-pointer"
        >
          ×
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4 cursor-pointer">
          Reset Your Password
        </h2>

        {/* Form */}
        <form onSubmit={handleSendLink} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your registered email"
            className="w-full border border-gray-300 p-3 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <p className="text-sm text-center mt-4 text-gray-700">{message}</p>
        )}

        {/* Close button below */}
        <button
          onClick={onClose}
          className="block mx-auto mt-5 text-gray-600 hover:text-gray-800 text-sm underline cursor-pointer"
        >
          Close
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
