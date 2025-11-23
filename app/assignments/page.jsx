"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page has been deprecated.just call student
  
export default function LegacyAssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
     router.replace("/student");
  }, [router]);
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-gray-600">Redirecting to the updated Assignments page...</p>
    </div>
  );
}
