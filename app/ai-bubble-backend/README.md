AI Bubble Backend (app/ai-bubble-backend)

This is a minimal Flask backend meant specifically for the AI Bubble assistant. It:

- Enforces that queries are educational (keyword-based filter)
- Instructs the LLM to return concise 1-2 sentence answers
- Runs on port 5001 by default

Quick start (Windows cmd)

1. Open terminal and change to the folder:

```batch
cd /d E:\SE-VIRTUAL-CLASSROOM-PLATFORM\app\ai-bubble-backend
```

2. (First time) create a virtual environment (recommended) and install dependencies:

```batch
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

3. Create `.env` and add this -> GROQ_API_KEY = your_groq_api_key:

```batch
rem Edit .env and replace the API key
```

4. Run the backend on port 5001:

```batch
python app.py
```

5. Configure your frontend to use this backend for the AI bubble:

In your project root `.env.local`:

```
NEXT_PUBLIC_AIBUBBLE_BACKEND_URL=http://127.0.0.1:5001
```

Then restart Next.js (`npm run dev`).

Endpoints

- GET /health -> {"status":"healthy"}
- POST /api/ask -> { topic: string, question: string } returns { answer: string }

Notes

- This backend uses LangChain + Groq; ensure you have a valid `GROQ_API_KEY` in `.env`.
- The server performs a conservative keyword-based educational check. If you need more accurate topic classification, consider adding a small classification endpoint or using an LLM call to classify.

Security

- Do NOT commit `.env` to source control. Keep your API keys secret.
