"use client";

import React, { useEffect, useState } from "react";
import {
  Send,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Trash2,
  Plus,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ===================== Types ===================== */
interface QAHistoryItem {
  id: number;
  topic: string;
  question: string;
  answer: string;
  timestamp: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizHistoryItem {
  id: number;
  topic: string;
  timestamp: string;
  score: number;
  total: number;
  questions: QuizQuestion[];
  userAnswers: number[];
  quizType: "mcq" | "tf";
  grade: string;
  numQuestions: number;
}

/* ===================== Component ===================== */
export default function QAInterface() {
  const [activeTab, setActiveTab] = useState<"qa" | "quiz">("qa");
  const { toast } = useToast();

  /* ---------- Q&A State ---------- */
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState("");
  const [copied, setCopied] = useState(false);

  /* Q&A local history */
  const [qaHistory, setQaHistory] = useState<QAHistoryItem[]>([]);
  const [showQaHistory, setShowQaHistory] = useState(false);

  /* ---------- Quiz State ---------- */
  const [quizType, setQuizType] = useState<"mcq" | "tf">("mcq"); // new
  const [quizTopic, setQuizTopic] = useState("");
  const [grade, setGrade] = useState("Grade 9"); // default grade
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  /* Quiz local history */
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const [showClearQaHistory, setShowClearQaHistory] = useState(false);
  const [showClearQuizHistory, setShowClearQuizHistory] = useState(false);

  /* ---------- Load/save history ---------- */
  useEffect(() => {
    const savedQA = localStorage.getItem("qa_history");
    if (savedQA) setQaHistory(JSON.parse(savedQA));

    const savedQuiz = localStorage.getItem("quiz_history");
    if (savedQuiz) setQuizHistory(JSON.parse(savedQuiz));
  }, []);

  useEffect(() => {
    localStorage.setItem("qa_history", JSON.stringify(qaHistory));
  }, [qaHistory]);

  useEffect(() => {
    localStorage.setItem("quiz_history", JSON.stringify(quizHistory));
  }, [quizHistory]);

  /* ---------- Backend URL ---------- */
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://127.0.0.1:5000"
      : "https://backend-1tqc.onrender.com");

  /* ---------- Q&A handlers ---------- */
  const newChat = () => {
    setTopic("");
    setQuestion("");
    setAnswer("");
    setQaError("");
  };

  const clearQaHistory = () => {
    setQaHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("qa_history");
    }
    toast({
      title: "Q&A history cleared",
      description: "Previous conversations have been removed.",
    });
    setShowClearQaHistory(false);
  };

  const handleAsk = async () => {
    if (!topic.trim() || !question.trim()) {
      setQaError("Please enter both topic and question");
      return;
    }
    setQaError("");
    setQaLoading(true);
    setAnswer("");

    try {
      const res = await fetch(`${backendUrl}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");

      setAnswer(data.answer);

      const entry: QAHistoryItem = {
        id: Date.now(),
        topic,
        question,
        answer: data.answer,
        timestamp: new Date().toLocaleString(),
      };
      setQaHistory((prev) => [entry, ...prev]);
    } catch (e: any) {
      setQaError(e.message);
    } finally {
      setQaLoading(false);
    }
  };

  /* ---------- Quiz handlers ---------- */
  const newQuiz = () => {
    setQuizTopic("");
    setQuestions([]);
    setUserAnswers([]);
    setSubmitted(false);
    setScore(null);
    setQuizType("mcq");
    setGrade("Grade 9");
    setNumQuestions(5);
  };

  const clearQuizHistory = () => {
    setQuizHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("quiz_history");
    }
    toast({
      title: "Quiz history cleared",
      description: "All saved quiz attempts have been removed.",
    });
    setShowClearQuizHistory(false);
  };

  const generateQuiz = async () => {
    if (!quizTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Enter a topic before generating a quiz.",
        variant: "destructive",
      });
      return;
    }

    // Validate numQuestions: max 20 and multiple of 5
    if (numQuestions <= 0 || numQuestions > 20 || numQuestions % 5 !== 0) {
      toast({
        title: "Invalid number of questions",
        description: "Please select 5, 10, 15 or 20 questions (max 20).",
        variant: "destructive",
      });
      return;
    }

    setQuizLoading(true);
    setQuestions([]);
    setUserAnswers([]);
    setSubmitted(false);
    setScore(null);

    try {
      const res = await fetch(`${backendUrl}/api/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: quizTopic,
          quizType,
          grade,
          numQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");

      const qs: QuizQuestion[] = data.quiz.questions;
      setQuestions(qs);
      setUserAnswers(Array(qs.length).fill(-1));
    } catch (e: any) {
      toast({
        title: "Quiz generation failed",
        description: e?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = () => {
    let s = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctIndex) s++;
    });
    setScore(s);
    setSubmitted(true);

    const entry: QuizHistoryItem = {
      id: Date.now(),
      topic: quizTopic,
      timestamp: new Date().toLocaleString(),
      score: s,
      total: questions.length,
      questions,
      userAnswers,
      quizType,
      grade,
      numQuestions,
    };
    setQuizHistory((prev) => [entry, ...prev]);
  };

  /* ---------- UI helpers ---------- */
  const optionClass = (qIdx: number, oIdx: number) => {
    if (!submitted) return "border rounded-md p-2 hover:bg-muted/30";
    const isChosen = userAnswers[qIdx] === oIdx;
    const isCorrect = questions[qIdx].correctIndex === oIdx;
    if (isCorrect) return "border rounded-md p-2 bg-green-50 border-green-500";
    if (isChosen && !isCorrect)
      return "border rounded-md p-2 bg-red-50 border-red-500";
    return "border rounded-md p-2 opacity-90";
  };

  return (
    <>
      <div className="min-h-screen bg-background px-4 py-8 flex justify-center">
        <div className="w-full max-w-6xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Learning Assistant
            </h1>
          </div>

          {/* Mode Buttons */}
          <div className="flex justify-center gap-4">
            <Button
              className={`px-6 py-3 text-lg ${
                activeTab === "qa" ? "bg-purple-600 text-white" : ""
              }`}
              onClick={() => setActiveTab("qa")}
            >
              💬 Ask a Tutor
            </Button>
            <Button
              className={`px-6 py-3 text-lg ${
                activeTab === "quiz" ? "bg-purple-600 text-white" : ""
              }`}
              onClick={() => setActiveTab("quiz")}
            >
              📝 Practice Quiz
            </Button>
          </div>

          {/* ================= Q&A TAB ================= */}
          {activeTab === "qa" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Top row: actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={newChat}>
                    <Plus className="w-4 h-4 mr-2" /> New Chat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowQaHistory(!showQaHistory)}
                  >
                    <History className="w-4 h-4 mr-2" />{" "}
                    {showQaHistory ? "Hide" : "Show"} History
                  </Button>
                  <Button
                    variant="destructive"
                    className="ml-auto"
                    onClick={() => setShowClearQaHistory(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Clear History
                  </Button>
                </div>

                {/* Input Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ask a Question</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Enter topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Type your question..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <Button
                      disabled={qaLoading}
                      onClick={handleAsk}
                      className="bg-black text-white"
                    >
                      {qaLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="ml-2">Get Answer</span>
                    </Button>
                    {qaError && (
                      <p className="text-red-500 text-sm">{qaError}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Answer */}
                {answer && (
                  <Card className="border-purple-300">
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle>Answer</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(answer);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {answer}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Q&A History */}
              {showQaHistory && (
                <div className="space-y-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Q&A History</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[60vh] overflow-y-auto space-y-2">
                      {qaHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No saved chats.
                        </p>
                      ) : (
                        qaHistory.map((h) => (
                          <button
                            key={h.id}
                            onClick={() => {
                              setTopic(h.topic);
                              setQuestion(h.question);
                              setAnswer(h.answer);
                            }}
                            className="w-full text-left p-2 rounded-md border hover:bg-muted/30"
                          >
                            <p className="text-xs text-purple-500">{h.topic}</p>
                            <p className="truncate">{h.question}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.timestamp}
                            </p>
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ================= QUIZ TAB ================= */}
          {activeTab === "quiz" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Top row: actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={newQuiz}>
                    <Plus className="w-4 h-4 mr-2" /> New Quiz
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowQuizHistory(!showQuizHistory)}
                  >
                    <History className="w-4 h-4 mr-2" />{" "}
                    {showQuizHistory ? "Hide" : "Show"} History
                  </Button>
                  <Button
                    variant="destructive"
                    className="ml-auto"
                    onClick={() => setShowClearQuizHistory(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Clear History
                  </Button>
                </div>

                {/* Generate Quiz */}
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Quiz</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Enter topic for quiz"
                        value={quizTopic}
                        onChange={(e) => setQuizTopic(e.target.value)}
                      />

                      {/* Quiz Type selector */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant={quizType === "mcq" ? undefined : "outline"}
                          onClick={() => setQuizType("mcq")}
                        >
                          MCQ
                        </Button>
                        <Button
                          variant={quizType === "tf" ? undefined : "outline"}
                          onClick={() => setQuizType("tf")}
                        >
                          True / False
                        </Button>
                      </div>

                      {/* Grade selector */}
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="rounded-md border p-2"
                      >
                        <option>Grade 5</option>
                        <option>Grade 6</option>
                        <option>Grade 7</option>
                        <option>Grade 8</option>
                        <option>Grade 9</option>
                        <option>Grade 10</option>
                        <option>Grade 11</option>
                        <option>Grade 12</option>
                        <option>Undergraduate</option>
                      </select>
                    </div>

                    {/* Number of questions */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm">No. of questions:</label>
                      <select
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className="rounded-md border p-2"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                      </select>
                      <div className="ml-auto">
                        <Button
                          disabled={quizLoading}
                          onClick={generateQuiz}
                          className="bg-black text-white"
                        >
                          {quizLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Generate Quiz"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz View */}
                {questions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Test — {quizType === "mcq" ? "MCQ" : "True/False"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {questions.map((q, qi) => (
                        <div
                          key={qi}
                          className="p-4 border rounded-md space-y-2"
                        >
                          <p className="font-medium">
                            {qi + 1}. {q.question}
                          </p>
                          <div className="grid gap-2">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className={optionClass(qi, oi)}>
                                <input
                                  type="radio"
                                  className="mr-2"
                                  name={`q${qi}`}
                                  disabled={submitted}
                                  checked={userAnswers[qi] === oi}
                                  onChange={() => {
                                    const arr = [...userAnswers];
                                    arr[qi] = oi;
                                    setUserAnswers(arr);
                                  }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>

                          {submitted && userAnswers[qi] !== q.correctIndex && (
                            <p className="text-sm text-green-700">
                              ✅ Correct answer:{" "}
                              <span className="font-semibold">
                                {q.options[q.correctIndex]}
                              </span>
                            </p>
                          )}
                        </div>
                      ))}

                      {!submitted ? (
                        <Button onClick={submitQuiz} className="w-full">
                          Submit Quiz
                        </Button>
                      ) : (
                        <Card className="p-3 border-green-300 bg-green-50">
                          <p className="text-lg font-semibold text-green-800">
                            Score: {score}/{questions.length}
                          </p>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Quiz History */}
              {showQuizHistory && (
                <div className="space-y-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Quiz History</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[60vh] overflow-y-auto space-y-2">
                      {quizHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No quizzes saved.
                        </p>
                      ) : (
                        quizHistory.map((h) => (
                          <div key={h.id} className="border rounded-md p-2">
                            <p className="text-xs text-purple-500">{h.topic}</p>
                            <p className="text-sm">
                              Type: {h.quizType.toUpperCase()} • {h.grade} • Score: {h.score}/{h.total}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {h.timestamp}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={showClearQaHistory}
        onOpenChange={setShowClearQaHistory}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Q&A history?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all saved Q&A conversations from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={clearQaHistory}
            >
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showClearQuizHistory}
        onOpenChange={setShowClearQuizHistory}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear quiz history?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all stored quiz attempts, including scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={clearQuizHistory}
            >
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
