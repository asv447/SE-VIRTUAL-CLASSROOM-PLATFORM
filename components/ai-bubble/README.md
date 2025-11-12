# AI Bubble Quick Start Guide

## 🎉 What's Been Implemented

A floating AI assistant bubble that appears on every page of your Virtual Classroom Platform, powered by the same LangChain + Groq backend used in your AI Tools chatbot.

## ✅ Files Created/Modified

### New Files:

1. **`components/ai-bubble/AIBubble.tsx`** - Main AI Bubble component
2. **`app/api/ai-chat/route.ts`** - Next.js API route (proxy to Python backend)
3. **`components/ai-bubble/BACKEND_SETUP.md`** - Detailed backend setup guide

### Modified Files:

1. **`app/layout.tsx`** - Added AIBubble component to root layout

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Python Backend

```bash
# Navigate to backend directory
cd app/ai-tools/chatbot/backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Create .env file with your Groq API key
echo GROQ_API_KEY=your_groq_api_key_here > .env

# Start the Flask server
python app.py
```

The backend will run on `http://127.0.0.1:5000`

### Step 2: Configure Frontend Environment

Add to your `.env.local` file (in project root):

```bash
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5000
```

### Step 3: Start the Next.js App

```bash
# In project root
npm run dev
```

Visit `http://localhost:3000` - you'll see the AI bubble in the bottom-right corner! 🎊

## 🎨 Features

✨ **Floating Button**: Always accessible at bottom-right corner  
💬 **Real-time Chat**: Powered by LangChain + Groq LLM  
📝 **Markdown Support**: Formatted responses with code blocks, lists, etc.  
🎭 **Theme-Aware**: Automatically matches your light/dark theme  
⚡ **Loading States**: Visual feedback while AI is thinking  
🔄 **Error Handling**: Graceful error messages if backend is offline  
📱 **Responsive**: Works on all screen sizes

## 🔧 How It Works

```
User Types Question
       ↓
AI Bubble Component (React)
       ↓
Next.js API Route (/api/ai-chat)
       ↓
Python Flask Backend (Port 5000)
       ↓
LangChain + Groq LLM
       ↓
Formatted Response (Markdown)
       ↓
Display in AI Bubble
```

## 🎯 Usage Example

1. Click the floating **sparkle icon** at bottom-right
2. Type a question: "What is React?"
3. Press Enter or click Send
4. Wait for AI to respond (you'll see "Thinking..." animation)
5. Get a detailed, formatted answer!

## 📝 Get Your Groq API Key

1. Visit: https://console.groq.com/
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the key and add it to `backend/.env`

## 🐛 Troubleshooting

### AI Bubble shows error message

- **Check**: Is the Python backend running? (`python app.py`)
- **Check**: Is `NEXT_PUBLIC_BACKEND_URL` set in `.env.local`?
- **Check**: Is your Groq API key valid in `backend/.env`?

### "Failed to get response" error

- Test backend directly: `curl http://127.0.0.1:5000/health`
- Check backend terminal for error logs
- Verify no firewall blocking port 5000

### Styling doesn't match theme

- The component uses Tailwind CSS variables
- Check your theme settings in `globals.css`
- Component automatically adapts to light/dark mode

## 🎨 Customization

### Change Button Position

Edit `AIBubble.tsx`, line ~75:

```tsx
<div className="fixed bottom-6 right-6 z-50">
```

Change `bottom-6 right-6` to your preferred position.

### Change Button Color

The button uses theme colors:

- `bg-primary` - button background
- `text-primary-foreground` - icon color

### Change Chat Window Size

Edit `AIBubble.tsx`, line ~97:

```tsx
<div className="w-96 h-[32rem] ...">
```

## 🚀 Deployment

See `BACKEND_SETUP.md` for detailed deployment instructions for:

- Render.com (recommended)
- Railway.app
- Heroku

After deploying backend, update `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## 📦 Git Commands to Save Your Work

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Add AI bubble assistant with LangChain backend integration"

# Push to GitHub
git push origin main
```

## 🎉 You're Done!

The AI bubble is now live on every page of your platform. Users can click it anytime to get instant AI assistance with their learning questions!

---

**Need Help?** Check `BACKEND_SETUP.md` for more detailed backend configuration.
