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
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-[20px] shadow-md border border-border p-8 space-y-6"
        >
          {/* File Upload */}
          <div className="space-y-3">
            <label htmlFor="file-upload" className="block text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-xl">📄</span>
              Upload your file
            </label>
            <p className="text-sm text-muted-foreground">Supported formats: DOCX, TXT</p>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.txt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border-2 border-dashed border-border rounded-xl p-5 bg-muted/30 hover:bg-muted/50 hover:border-primary transition cursor-pointer text-foreground file:font-semibold file:text-primary file:bg-primary/10 file:border-0 file:px-4 file:py-2 file:rounded-lg file:mr-3"
            />
            {file && (
              <p className="text-sm text-primary font-semibold flex items-center gap-2">
                <span>✓</span> Selected: {file.name}
              </p>
            )}
          </div>

          {/* Grade / Branch Selection */}
          <div className="space-y-3">
            <label htmlFor="grade-input" className="block text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-xl">🎓</span>
              What&apos;s your grade or branch?
            </label>
            <p className="text-sm text-muted-foreground">Help us customize the summary for you</p>
            <input
              id="grade-input"
              type="text"
              placeholder="e.g. 10th Grade, Computer Science, Biology"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full border border-input rounded-xl p-4 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition text-base"
            />
          </div>

          {/* Summary Type */}
          <div className="space-y-3">
            <label htmlFor="summary-type" className="block text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              How do you want your summary?
            </label>
            <select
              id="summary-type"
              value={summaryType}
              onChange={(e) => setSummaryType(e.target.value)}
              aria-label="Select summary type"
              className="w-full border border-input rounded-xl p-4 bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition font-medium text-base"
            >
              <option value="brief">📋 Quick overview (5 min read)</option>
              <option value="long">📚 Detailed notes (complete coverage)</option>
              <option value="examples">💡 Practice questions & examples</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating your summary...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">✨</span>
                Generate Summary
              </span>
            )}
          </button>
        </form>

        {/* Display Summary */}
        <div className="mt-8">
          {error && (
            <div className="bg-destructive/15 border-l-4 border-destructive text-destructive-foreground p-5 rounded-xl mb-6 font-semibold shadow-md">
              <p className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                {error}
              </p>
            </div>
          )}

          {summary && (
            <div className="bg-card rounded-[20px] shadow-md border border-border p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                <span className="text-3xl">📘</span>
                Your summary
              </h2>
              <div className="bg-muted/50 rounded-xl p-6 text-foreground/90 whitespace-pre-wrap leading-relaxed font-medium shadow-inner">
                {summary}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
