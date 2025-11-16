"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

// ✅ Lazy-load both tools to reduce initial load time
const Chatbot = dynamic(() => import("./chatbot/page"), { ssr: false });
const SummaryTool = dynamic(() => import("./summary/page"), { ssr: false });

export default function AIToolsHub() {
  const [activeTab, setActiveTab] = useState<"chatbot" | "summary">("chatbot");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-center text-indigo-700 mb-8">
        Learning Tools Hub
      </h1>

      {/* Tab Navigation */}
      <div className="flex justify-center gap-6 mb-8">
        <button
          onClick={() => setActiveTab("chatbot")}
          className={`px-6 py-2 rounded-lg text-lg font-semibold transition-all ${
            activeTab === "chatbot"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          🤖 AI Doubt Solver
        </button>

        <button
          onClick={() => setActiveTab("summary")}
          className={`px-6 py-2 rounded-lg text-lg font-semibold transition-all ${
            activeTab === "summary"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          🧠 AI Summary Generator
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
        {activeTab === "chatbot" ? <Chatbot /> : <SummaryTool />}
      </div>
    </div>
  );
}
