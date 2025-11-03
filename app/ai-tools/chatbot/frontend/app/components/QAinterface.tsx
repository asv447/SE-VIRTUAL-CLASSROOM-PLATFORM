'use client';

import React, { useState } from 'react';
import { Send, Sparkles, Loader2, Copy, Check, History, Trash2 } from 'lucide-react';

interface HistoryItem {
  id: number;
  topic: string;
  question: string;
  answer: string;
  timestamp: string;
}

export default function QAInterface() {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!topic.trim() || !question.trim()) {
      setError('Please enter both topic and question');
      return;
    }

    setLoading(true);
    setAnswer('');
    setError('');

    try {
      // 🌐 Auto-detect environment and set backend URL
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        (typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "http://127.0.0.1:5000"
          : "https://backend-1tqc.onrender.com");

      console.log("Using backend:", backendUrl);

      const response = await fetch(`${backendUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, question })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setAnswer(data.answer);
      setHistory(prev => [
        {
          id: Date.now(),
          topic,
          question,
          answer: data.answer,
          timestamp: new Date().toLocaleString(),
        },
        ...prev,
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setTopic('');
    setQuestion('');
    setAnswer('');
    setError('');
  };

  const loadFromHistory = (item: HistoryItem) => {
    setTopic(item.topic);
    setQuestion(item.question);
    setAnswer(item.answer);
    setShowHistory(false);
  };

  const clearHistory = () => {
    if (confirm('Clear all history?')) {
      setHistory([]);
    }
  };

  const exampleQuestions = [
    { topic: 'Machine Learning', question: 'What is the difference between supervised and unsupervised learning?' },
    { topic: 'Python Programming', question: 'Explain decorators and their use cases' },
    { topic: 'Web Development', question: 'What are the benefits of using React hooks?' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI Q&A System
                </h1>
                <p className="text-sm text-gray-400">Powered by Groq & LangChain</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="e.g., Machine Learning, Python, Web Development"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-100 placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{topic.length} characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask your question here... (Ctrl+Enter to submit)"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-100 placeholder-gray-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{question.length} characters</p>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Get Answer
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {answer && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-purple-400">Answer</h2>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="prose prose-invert prose-purple max-w-none">
                  <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                    {answer}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-xl">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                  <p className="text-gray-400">Generating your answer...</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">Example Questions</h3>
              <div className="space-y-3">
                {exampleQuestions.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTopic(ex.topic);
                      setQuestion(ex.question);
                    }}
                    className="w-full text-left p-3 bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                  >
                    <p className="text-xs text-purple-400 font-medium mb-1">{ex.topic}</p>
                    <p className="text-sm text-gray-300">{ex.question}</p>
                  </button>
                ))}
              </div>
            </div>

            {showHistory && history.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-400">Recent History</h3>
                  <button
                    onClick={clearHistory}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="w-full text-left p-3 bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                    >
                      <p className="text-xs text-purple-400 font-medium mb-1">{item.topic}</p>
                      <p className="text-sm text-gray-300 line-clamp-2">{item.question}</p>
                      <p className="text-xs text-gray-500 mt-2">{item.timestamp}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 shadow-xl">
              <h3 className="text-lg font-semibold text-purple-300 mb-3">How to Use</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Enter a topic you want to learn about</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Ask your specific question</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Get detailed answers powered by AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Use Ctrl+Enter to submit quickly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}