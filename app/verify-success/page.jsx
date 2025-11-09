// Verification success page - shown after user clicks email link and is verified
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifySuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/homepage";
  const [message, setMessage] = useState(
    "Email verified successfully! Redirecting..."
  );

  useEffect(() => {
    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      router.push(next);
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, next]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br via-indigo-200 to-purple-200">
      <div className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">✓ Success!</h1>
        <p className="text-gray-700 mb-4">{message}</p>
        <p className="text-sm text-gray-500">
          You will be redirected in a moment. If not,{" "}
          <button
            onClick={() => router.push(next)}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            click here
          </button>
          .
        </p>
      </div>
    </div>
  );
}
