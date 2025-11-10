import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, question } = body;

    if (!topic || !question) {
      return NextResponse.json(
        { error: 'Topic and question are required' },
        { status: 400 }
      );
    }

    // Get backend URL from environment or use default
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://127.0.0.1:5000'
        : 'https://backend-1tqc.onrender.com');

    // Call the Python Flask backend
    const response = await fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, question }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get answer from AI');
    }

    return NextResponse.json({ answer: data.answer });
  } catch (error: any) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
