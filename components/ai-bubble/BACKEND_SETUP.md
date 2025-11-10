# AI Bubble Backend Setup Guide

## Overview
The AI Bubble component uses the same Python Flask backend as the AI Tools chatbot, powered by LangChain and Groq API.

## Backend Location
```
app/ai-tools/chatbot/backend/
├── app.py              # Flask server with AI endpoints
├── requirements.txt    # Python dependencies
├── Procfile           # Deployment config
└── .gitignore
```

## Setup Instructions

### 1. Install Python Dependencies

Navigate to the backend directory:
```bash
cd app/ai-tools/chatbot/backend
```

Install the required packages:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:
```bash
# app/ai-tools/chatbot/backend/.env
GROQ_API_KEY=your_groq_api_key_here
```

**Get your Groq API Key:**
1. Visit https://console.groq.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key

### 3. Run the Backend Server

Start the Flask server:
```bash
python app.py
```

The server will run on `http://127.0.0.1:5000`

### 4. Configure Frontend

Update your `.env.local` file in the project root:
```bash
# For local development
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5000

# For production (after deployment)
# NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## API Endpoints Used by AI Bubble

### POST /api/ask
Asks a question and gets an AI-generated answer.

**Request:**
```json
{
  "topic": "General Question",
  "question": "What is React?"
}
```

**Response:**
```json
{
  "answer": "React is a JavaScript library for building user interfaces..."
}
```

## Deployment Options

### Option 1: Render.com (Recommended)
1. Push your code to GitHub
2. Go to https://render.com
3. Create a new Web Service
4. Connect your GitHub repo
5. Set build command: `pip install -r requirements.txt`
6. Set start command: `gunicorn app:app`
7. Add environment variable: `GROQ_API_KEY`

### Option 2: Railway.app
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select the backend directory
4. Add `GROQ_API_KEY` environment variable
5. Deploy

### Option 3: Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set env: `heroku config:set GROQ_API_KEY=your_key`
5. Deploy: `git push heroku main`

## Testing the Backend

Test if the backend is running:
```bash
curl http://127.0.0.1:5000/health
```

Test the AI endpoint:
```bash
curl -X POST http://127.0.0.1:5000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"topic":"Math","question":"What is calculus?"}'
```

## Troubleshooting

### Backend not responding
- Check if Flask server is running: `ps aux | grep python`
- Check firewall settings
- Verify GROQ_API_KEY is set correctly

### CORS errors
- The backend already has CORS enabled via `flask-cors`
- Ensure the backend URL in `.env.local` matches exactly

### API key errors
- Verify your Groq API key is valid
- Check you haven't exceeded rate limits
- Ensure the key is set in the backend `.env` file

## Features

✅ **Real AI Responses**: Uses LangChain + Groq LLM  
✅ **Markdown Support**: Formatted responses with code blocks  
✅ **Fast & Reliable**: Optimized for quick responses  
✅ **Error Handling**: Graceful fallback on errors  
✅ **Scalable**: Ready for production deployment  

## Development Tips

- Use `python app.py` for local development
- The backend auto-reloads on code changes in debug mode
- Check Flask logs for debugging: they appear in the terminal
- Test with different questions to verify LLM responses
