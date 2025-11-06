'use client'

import React, { useState, useEffect } from 'react'
import { Send, Loader2, Copy, Check, Sparkles, Trash2, History, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface HistoryItem {
  id: number
  topic: string
  question: string
  answer: string
  timestamp: string
}

export default function QAInterface() {
  const [topic, setTopic] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  // ✅ Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('qa_history')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
  }, [])

  // ✅ Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('qa_history', JSON.stringify(history))
  }, [history])

  // 🧠 Submit Question to Backend
  const handleSubmit = async () => {
    if (!topic.trim() || !question.trim()) {
      setError('Please enter both topic and question')
      return
    }

    setError('')
    setAnswer('')
    setLoading(true)

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? 'http://127.0.0.1:5000'
          : 'https://backend-1tqc.onrender.com')

      const response = await fetch(`${backendUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, question }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to get answer')

      setAnswer(data.answer)

      const newEntry = {
        id: Date.now(),
        topic,
        question,
        answer: data.answer,
        timestamp: new Date().toLocaleString(),
      }

      setHistory((prev) => [newEntry, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNewChat = () => {
    setTopic('')
    setQuestion('')
    setAnswer('')
    setError('')
  }

  const clearHistory = () => {
    if (confirm('Clear all history?')) {
      setHistory([])
      localStorage.removeItem('qa_history')
    }
  }

  const exampleQuestions = [
    { topic: 'Machine Learning', question: 'What is the difference between supervised and unsupervised learning?' },
    { topic: 'Python Programming', question: 'Explain decorators and their use cases' },
    { topic: 'Web Development', question: 'What are the benefits of using React hooks?' },
  ]

  return (
    <div className="min-h-screen bg-background flex justify-center px-4 py-10">
      <div className="flex flex-col lg:flex-row justify-center max-w-6xl w-full gap-8">
        {/* Main Q&A Section */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI Q&A System
                </h1>
                <p className="text-sm text-muted-foreground">Powered by Groq & LangChain</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" /> History
              </Button>
              <Button
                variant="outline"
                onClick={handleNewChat}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Chat
              </Button>
            </div>
          </div>

          {/* Input Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">Ask a Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter topic (e.g., Machine Learning)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <div className="flex items-center border rounded-lg overflow-hidden bg-muted/20 focus-within:ring-2 focus-within:ring-purple-400">
                <Textarea
                  placeholder="Type your question here..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={1}
                  className="resize-none border-none bg-transparent focus-visible:ring-0 focus:outline-none text-sm p-3 flex-1"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-none rounded-r-lg bg-black text-white hover:bg-gray-800 px-4"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </CardContent>
          </Card>

          {/* Answer Display */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            answer && (
              <Card className="shadow-md border-purple-200">
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="text-lg text-purple-600">AI Answer</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
                </CardContent>
              </Card>
            )
          )}

          {/* History Drawer */}
          {showHistory && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-semibold">Recent History</CardTitle>
                <Button variant="destructive" size="sm" onClick={clearHistory}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto space-y-2">
                {history.length > 0 ? (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setTopic(item.topic)
                        setQuestion(item.question)
                        setAnswer(item.answer)
                        setShowHistory(false)
                      }}
                      className="w-full text-left text-sm p-2 rounded-md border hover:bg-purple-50 transition-colors"
                    >
                      <p className="text-xs text-purple-500">{item.topic}</p>
                      <p className="truncate">{item.question}</p>
                      <p className="text-xs text-gray-500">{item.timestamp}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No history yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:flex flex-col gap-6 w-80 sticky top-24 h-fit">
          {/* Example Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Example Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exampleQuestions.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTopic(ex.topic)
                    setQuestion(ex.question)
                  }}
                  className="w-full text-left text-sm p-3 rounded-md border hover:bg-purple-50 transition-colors"
                >
                  <p className="text-xs text-purple-500 font-semibold">{ex.topic}</p>
                  <p>{ex.question}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-purple-600">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              <p>• Enter a topic you want to learn about</p>
              <p>• Ask your specific question</p>
              <p>• Get detailed answers powered by AI</p>
              <p>• Click “New Chat” to start a fresh session</p>
              <p>• View all past chats under “History”</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
