"use client";

export default function TestClassroomPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Classroom</h1>
      
      <div className="mb-6 p-4 border rounded shadow">
        <h2 className="font-semibold mb-2">Test Classroom Navigation</h2>
        <p>This is a test classroom with ID: test-classroom</p>
        
        <div className="mt-4">
          <a 
            href="/assignments/test-classroom" 
            className="block bg-blue-600 text-white px-4 py-2 rounded text-center hover:bg-blue-700"
          >
            View Assignments for Test Classroom
          </a>
        </div>
      </div>
    </div>
  );
}
