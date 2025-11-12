'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string; isLoading?: boolean }>>([
    { role: 'ai', content: 'Hello! I\'m your AI assistant. How can I help you with your learning today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Add loading message
    setMessages((prev) => [...prev, { role: 'ai', content: '', isLoading: true }]);
    setIsLoading(true);

    try {
      // Call the Next.js API route which proxies to the Python backend
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: 'General Question',
          question: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Remove loading message and add actual response
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          content: data.answer,
          isLoading: false,
        };
        return updated;
      });
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      
      // Replace loading message with error
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          content: `Sorry, I encountered an error: ${error.message}. Please make sure the backend is running.`,
          isLoading: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* AI Bubble Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative h-16 w-16 rounded-full bg-primary shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl"
            aria-label="Open AI Assistant"
          >
            {/* Animated glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary opacity-75 blur-lg animate-pulse"></div>
            
            {/* Icon */}
            <div className="relative flex h-full w-full items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary-foreground animate-pulse" />
            </div>

            {/* Notification dot */}
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-bounce shadow-lg"></div>
          </button>
        ) : (
          <div className="w-96 h-[32rem] rounded-2xl bg-card shadow-2xl border border-border overflow-hidden flex flex-col backdrop-blur-sm">
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-primary"></div>
                </div>
                <div>
                  <h3 className="font-bold text-primary-foreground text-lg">AI Assistant</h3>
                  <p className="text-xs text-primary-foreground/80">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors"
                aria-label="Close AI Assistant"
              >
                <X className="h-5 w-5 text-primary-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    ) : msg.role === 'ai' ? (
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-card border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !message.trim()}
                  className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                  ) : (
                    <Send className="h-5 w-5 text-primary-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
