"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page has been deprecated. The unified Assignments experience now lives at /student.
// We keep this file temporarily so existing links or bookmarks to /assignments continue to work.
// Eventually you can delete this file (c:\Users\HP\Documents\delta\Next\virtual-classroom\app\assignments\page.jsx).

export default function LegacyAssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Client-side redirect to the new canonical assignments route
    router.replace("/student");
  }, [router]);
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-gray-600">Redirecting to the updated Assignments page...</p>
    </div>
  );
}
