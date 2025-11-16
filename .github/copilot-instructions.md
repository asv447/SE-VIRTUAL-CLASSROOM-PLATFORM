<!-- Copilot / AI agent instructions for this repo -->
# Copilot instructions — SE-Virtual-Classroom-Platform

Purpose: make an AI coding agent immediately productive in this repo by documenting
the architecture, common developer workflows, integration points, and concrete
examples to inspect or modify.

1) Big-picture architecture
- **Frontend:** Next.js (app router) at the repository root. The main UI lives in `app/` and
  reusable UI lives under `components/` (e.g. `components/ai-bubble/AIBubble.tsx`).
- **API routes:** Server-side Next.js routes live under `app/api/*` and are often thin
  proxies that forward requests to local Python backends (see `app/api/ai-chat/route.ts`).
- **Backends / AI services:** Two small Flask backends live under `app/ai-tools/chatbot/backend`
  and `app/ai-bubble-backend/`. They call LangChain + Groq and expose `/health` and `/api/ask`-style endpoints.
- **Data & integrations:** MongoDB utilities are in `lib/mongodb.js`; Firebase helpers are in `lib/firebase.js`.
  Seeds and test data live in `scripts/` (e.g. `scripts/seed-data.js`).

2) Typical data flow (AI features)
- UI: `AIBubble.tsx` (component) → Next.js API route `app/api/ai-chat/route.ts` →
  Python Flask backend (`app/ai-tools/chatbot/backend` or `app/ai-bubble-backend/app.py`) →
  LangChain + Groq → response back through the route and displayed in the UI.

3) Developer workflows (concrete commands)
- Install and run frontend (root):
  - `npm install`
  - `npm run dev` (Next.js dev server on http://localhost:3000)
- Start AI Python backend (Windows cmd example):
  - `cd /d d:\SE\SE-VIRTUAL-CLASSROOM-PLATFORM\app\ai-bubble-backend`
  - `python -m venv .venv`
  - `.venv\Scripts\activate`
  - `pip install -r requirements.txt`
  - `python app.py`  (defaults to port 5001; other backends use 5000)
- Environment variables
  - Frontend: place values in project root `.env.local`. Important keys:
    - `NEXT_PUBLIC_BACKEND_URL` (used by AI chatbot frontend integration)
    - `NEXT_PUBLIC_AIBUBBLE_BACKEND_URL` (AI bubble backend)
  - Python backends: put `GROQ_API_KEY` in backend `.env` files (do not commit).
  - After changing `.env.local`, restart Next.js (`npm run dev`) to pick up changes.

4) Project-specific conventions & patterns
- Uses Next.js App Router (`app/`) rather than pages — prefer editing files under `app/`.
- Design system: Tailwind + utility classes; theme handling via `next-themes` and a `theme-provider.tsx` in `components/`.
- AI integrations are behind Next.js API routes (proxy pattern). When changing AI logic, update both the frontend route and the relevant Python backend.
- The repository mixes TypeScript and JavaScript. Respect the file extension when editing; type declarations live in `next-env.d.ts` and `tsconfig.json`.
- Styling and placement examples:
  - Change AI bubble position in `components/ai-bubble/AIBubble.tsx` (see `fixed bottom-6 right-6`).
  - Chat window size configured in the same file (`w-96 h-[32rem]`).

5) Important files to inspect (quick links)
- `app/layout.tsx` — root layout; AIBubble is mounted here.
- `components/ai-bubble/AIBubble.tsx` — UI + behavior for the floating assistant.
- `app/api/ai-chat/route.ts` — Next.js API route that proxies to the Python chatbot backend.
- `app/ai-tools/chatbot/backend/` — Chatbot Python backend (LangChain + Groq).
- `app/ai-bubble-backend/app.py` — Minimal Flask backend for the assistant.
- `lib/mongodb.js`, `lib/firebase.js` — DB and auth helpers.
- `scripts/seed-data.js` — Example data seeding patterns.

6) What an AI agent can safely change without asking
- Local developer docs (README snippets, BACKEND_SETUP.md), small UI tweaks (positions, sizes), and helper utilities in `lib/`.

7) When to ask the human
- Significant schema changes (DB migrations, auth flows).
- Changes to deployment settings (netlify/next config), or any modification that requires secret rotation.

8) Troubleshooting pointers
- AI responses failing: verify the Python backend is running (`/health`) and that `NEXT_PUBLIC_*` env var points to the correct URL.
- Port collisions: Next defaults to `3000` for Next.js, backends use `5000/5001` — confirm ports in `app/*/README.md`.
- Linting: `npm run lint`. No automated tests discovered in repo — run manual checks after changes.

If anything here is unclear or you'd like more examples (small PRs to modify AI bubble behavior, or a test scaffold), tell me which area to expand and I'll iterate.
