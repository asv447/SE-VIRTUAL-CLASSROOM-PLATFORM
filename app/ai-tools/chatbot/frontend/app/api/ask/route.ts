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

    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';

    const response = await fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, question }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      answer: data.answer,
      topic: data.topic,
      question: data.question,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get answer from backend. Make sure your Python server is running on port 5000.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}