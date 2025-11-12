import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, question } = body;

    if (!topic || !question) {
      return NextResponse.json({ error: 'Topic and question are required' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_AIBUBBLE_BACKEND_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5001' : 'https://your-aibubble-backend.example.com');

    const resp = await fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, question }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data.error || 'Failed to get answer from AI bubble backend' }, { status: resp.status });
    }

    return NextResponse.json({ answer: data.answer });
  } catch (error: any) {
    console.error('AI Bubble proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
