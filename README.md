# 🎓 SmartStudy AI

**The Last-Minute Life Saver** — An AI-powered productivity companion that helps students plan, prioritize, and complete tasks before deadlines are missed.

Built for the **Vibe2Ship Hackathon — Problem Statement 1**.

---

## ✨ Features

- 🔐 **Authentication** — Sign up, login, logout with Supabase Auth
- 📋 **Task Management** — Full CRUD with deadlines, priority, estimated hours
- 🧠 **AI Priority Engine** — Gemini ranks your tasks and explains why
- 📅 **AI Study Planner** — Daily/weekly schedules from your hours per day
- 🔄 **Smart Rescheduling** — Auto-redistribute missed work
- 🌅 **Daily AI Brief** — Personalized morning briefing
- 💬 **AI Productivity Coach** — Chat with Gemini for tips & guidance
- 📊 **Progress Dashboard** — Charts, stats, completion %
- 🎤 **Voice Input** — Add tasks by speaking (Web Speech API)
- 🌙 **Dark Mode** — Beautiful glass-morphism UI
- 📱 **Mobile Responsive** — Works on all devices

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TailwindCSS + Recharts |
| Backend | FastAPI (Python 3.10+) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| AI | Google Gemini 1.5 Flash |

---

## 📁 Project Structure

```
smartstudy-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── config.py            # Env vars
│   │   ├── database.py          # Supabase clients
│   │   ├── auth.py              # JWT verification
│   │   ├── models/schemas.py    # Pydantic models
│   │   ├── routes/              # tasks, planner, ai, users
│   │   └── services/gemini_service.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/               # Login, Register, Dashboard, Tasks, Planner, Coach, Profile
│   │   ├── components/Layout.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── services/            # api.js, supabase.js
│   │   ├── App.jsx, main.jsx, index.css
│   ├── package.json, vite.config.js, tailwind.config.js
│   └── .env.example
├── database/schema.sql          # Full SQL schema
└── README.md
```

---

## 🚀 Setup Instructions

### 1️⃣ Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** → paste the contents of `database/schema.sql` → **Run**
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`
4. Go to **Project Settings → API → JWT Settings** and copy the `JWT Secret` → `SUPABASE_JWT_SECRET`
5. **Disable email confirmation** for fast testing: Authentication → Providers → Email → turn off "Confirm email"

### 2️⃣ Get Gemini API Key

Visit [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API Key → copy it.

### 3️⃣ Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in your Supabase + Gemini keys
uvicorn app.main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
Swagger docs: **http://localhost:8000/docs**

### 4️⃣ Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and fill in your Supabase URL/anon key and API URL
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 Environment Variables

### `backend/.env`
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=AIza...
PORT=8000
FRONTEND_URL=http://localhost:5173
```

### `frontend/.env`
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_API_URL=http://localhost:8000
```

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy /dist folder. Set env vars in Vercel dashboard.
```

### Backend → Render / Railway / Fly.io
```bash
# Start command:
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
Set the env vars from `backend/.env` in your hosting provider.

### Database → Supabase Cloud
Already cloud-hosted — just keep your project running.

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get profile |
| PUT | `/api/users/me` | Update profile |
| GET | `/api/users/stats` | Dashboard stats |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| POST | `/api/tasks/{id}/complete` | Mark done |
| POST | `/api/tasks/prioritize` | AI re-rank |
| POST | `/api/tasks/voice` | Voice → task |
| POST | `/api/planner/generate` | New study plan |
| GET | `/api/planner/current` | Active plan |
| POST | `/api/planner/reschedule` | Smart reschedule |
| GET | `/api/ai/daily-brief` | Daily brief |
| POST | `/api/ai/chat` | Chat with coach |
| GET | `/api/ai/chat/history` | Chat history |

---

## 🎤 Voice Input

Voice recognition uses the browser's built-in **Web Speech API** (works in Chrome, Edge, Safari).
Click the 🎤 button on the Tasks page and say something like:
- *"Add robotics assignment due Friday"*
- *"Math homework tomorrow at 6 pm, 2 hours"*

Gemini parses the transcript and creates a structured task.

---

## 📜 License

MIT — built for the Vibe2Ship Hackathon 🚀
