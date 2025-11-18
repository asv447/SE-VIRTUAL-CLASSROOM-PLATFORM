"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

// ✅ Lazy-load both tools to reduce initial load time
const Chatbot = dynamic(() => import("./chatbot/page"), { ssr: false });
const SummaryTool = dynamic(() => import("./summary/page"), { ssr: false });

export default function AIToolsHub() {
  const [activeTab, setActiveTab] = useState<"chatbot" | "summary">("chatbot");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with Tabs */}
      <div className="pt-12 pb-8 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Tab Navigation */}
          <div className="inline-flex gap-3 p-2 bg-card rounded-[20px] shadow-md border border-border">
            <button
              onClick={() => setActiveTab("chatbot")}
              className={`px-8 py-3.5 font-semibold rounded-[16px] transition-all duration-300 ${activeTab === "chatbot"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <span>AI Doubt Solver</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab("summary")}
              className={`px-8 py-3.5 font-semibold rounded-[16px] transition-all duration-300 ${activeTab === "summary"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">📚</span>
                <span>AI Summary Generator</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-12 px-4">
        {activeTab === "chatbot" ? <Chatbot /> : <SummaryTool />}
      </div>
    </div>
  );
}
