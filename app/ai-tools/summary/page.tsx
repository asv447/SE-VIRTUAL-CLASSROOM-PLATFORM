"use client";

import React, { useState } from "react";

export default function SummaryTool() {
  const [file, setFile] = useState<File | null>(null);
  const [grade, setGrade] = useState("");
  const [summaryType, setSummaryType] = useState("brief");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Handle file upload and form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSummary("");

    try {
      if (!file) {
        setError("Please upload a file before submitting.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade", grade);
      formData.append("summaryType", summaryType);

      const res = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSummary(data.summary || "No summary generated.");
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-12">
      <h1 className="text-3xl font-bold text-center mb-6 text-indigo-600">
        🧠 AI Document Summarizer
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 space-y-6"
      >
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File (PDF, DOCX, TXT, PPTX)
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.pptx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        {/* Grade / Branch Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grade / Branch
          </label>
          <input
            type="text"
            placeholder="e.g. 10th Grade or Computer Science"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        {/* Summary Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Summary Type
          </label>
          <select
            value={summaryType}
            onChange={(e) => setSummaryType(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
          >
            <option value="brief">Brief Summary</option>
            <option value="long">Detailed Summary</option>
            <option value="examples">Examples / Questions</option>
            <option value="mindmap">Mind Map of Concepts</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-semibold py-2 rounded hover:bg-indigo-700 transition"
        >
          {loading ? "Generating Summary..." : "Generate Summary"}
        </button>
      </form>

      {/* Display Summary */}
      <div className="max-w-3xl mx-auto mt-10">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            ⚠️ {error}
          </div>
        )}

        {summary && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-indigo-600 mb-3">
              📘 Generated Summary
            </h2>
            <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
