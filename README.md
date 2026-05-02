# 🏋️ GymBuddy — Full-Stack Fitness PWA

A complete gym management web app that runs on Android, iOS, and desktop as a PWA.
Admin manages members, exercises, and diet plans. Members view their personalized plans.

---

## 📁 Project Structure

```
gymbuddy/
├── backend/          ← Node.js + Express REST API
│   ├── prisma/
│   │   ├── schema.prisma   ← Database schema
│   │   └── seed.js         ← Sample data
│   └── src/
│       ├── index.js        ← Entry point
│       ├── lib/prisma.js   ← DB client
│       ├── middleware/auth.js
│       └── routes/         ← auth, members, exercises, diet, gallery, upload
└── frontend/         ← Next.js 14 PWA
    ├── app/
    │   ├── auth/login/       ← Login page
    │   ├── admin/            ← Admin panel (sidebar layout)
    │   │   ├── members/      ← CRUD + OCR form scanning
    │   │   ├── exercises/    ← Exercise directory management
    │   │   ├── diet-plans/   ← Diet plan creator
    │   │   └── gallery/      ← Public gallery management
    │   ├── member/           ← Member app (bottom nav layout)
    │   │   ├── dashboard/    ← Home with stats + quick view
    │   │   ├── exercises/    ← Assigned exercises + video player
    │   │   ├── diet/         ← Diet plan viewer
    │   │   └── profile/      ← Profile + logout
    │   ├── exercises/        ← Public exercise library
    │   └── gallery/          ← Public recipe & tutorial gallery
    └── lib/
        ├── api.ts            ← Axios client + all API calls
        ├── store.ts          ← Zustand auth state
        └── utils.ts          ← Helpers, constants
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) account (PostgreSQL)
- A free [Cloudinary](https://cloudinary.com) account (media uploads)

---

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env` with your credentials:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
JWT_SECRET="any-long-random-string"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
FRONTEND_URL="http://localhost:3000"
```

Push schema and seed the database:

```bash
npm run db:push      # Create tables in Supabase
npm run db:seed      # Add sample admin, member, exercises
npm run dev          # Start backend on http://localhost:5000
```

---

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev          # Start frontend on http://localhost:3000
```

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### 3. Login

| Role   | Phone        | Password   |
|--------|-------------|------------|
| Admin  | 9999999999  | admin123   |
| Member | 9876543210  | member123  |

---

## 🌐 Free Deployment

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your `backend/` folder (or use the root with a `railway.json`)
3. Add environment variables (same as `.env`)
4. Railway auto-detects Node.js and runs `npm start`
5. Copy the public URL (e.g. `https://gymbuddy-backend.railway.app`)

> **Alternatively:** Use [Render.com](https://render.com) → New Web Service → same process

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set root directory to `frontend/`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://gymbuddy-backend.railway.app/api
   ```
4. Deploy — Vercel handles the rest

### Database → Supabase (already free)

- Your PostgreSQL is already hosted on Supabase
- Free tier: 500MB storage, 2 projects

### Media → Cloudinary (already free)

- Free tier: 25GB storage, 25GB bandwidth/month
- More than enough for a small gym

---

## 📱 Install as PWA (Mobile)

**Android (Chrome):**
1. Open `https://your-app.vercel.app` in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Tap "Add" — app appears on home screen

**iOS (Safari):**
1. Open `https://your-app.vercel.app` in Safari
2. Tap Share (□↑) → "Add to Home Screen"
3. Tap "Add"

---

## ✨ Features

| Feature | Admin | Member | Public |
|---|:---:|:---:|:---:|
| Register/login | ✅ | ✅ | — |
| Manage members (CRUD) | ✅ | — | — |
| OCR form scanning | ✅ | — | — |
| Upload photos | ✅ | — | — |
| Exercise directory (CRUD) | ✅ | — | ✅ |
| Assign exercises to members | ✅ | — | — |
| Create diet plans | ✅ | — | — |
| View assigned exercises + videos | — | ✅ | — |
| View diet plan | — | ✅ | — |
| View profile + stats | — | ✅ | — |
| Public exercise library | — | ✅ | ✅ |
| Public gallery (recipes + tutorials) | — | ✅ | ✅ |
| Manage gallery | ✅ | — | — |

---

## 🔧 API Endpoints

```
POST   /api/auth/login              Login
POST   /api/auth/register           Register
GET    /api/auth/me                 Current user

GET    /api/members                 List members (admin)
POST   /api/members                 Create member (admin)
PUT    /api/members/:id             Update member (admin)
DELETE /api/members/:id             Deactivate (admin)
POST   /api/members/:id/assign-exercise    Assign exercise
DELETE /api/members/:id/assign-exercise/:exerciseId

GET    /api/exercises               Public exercise list (filterable)
POST   /api/exercises               Create (admin)
PUT    /api/exercises/:id           Update (admin)
DELETE /api/exercises/:id           Delete (admin)
GET    /api/exercises/member/:id    Member's assigned exercises

GET    /api/diet/member/:id         Member's diet plans
POST   /api/diet                    Create diet plan (admin)
PUT    /api/diet/:id                Update (admin)
DELETE /api/diet/:id                Delete (admin)

GET    /api/gallery                 Public gallery
POST   /api/gallery                 Add item (admin)
PUT    /api/gallery/:id             Update (admin)
DELETE /api/gallery/:id             Delete (admin)

POST   /api/upload/image            Upload image → Cloudinary
POST   /api/upload/video            Upload video → Cloudinary
POST   /api/upload/ocr              Scan form → extract text
```

---

## 🗺 Roadmap (Next Steps)

- [ ] OTP login via Twilio (replace password)
- [ ] Push notifications (workout reminders)
- [ ] Attendance tracking
- [ ] Progress photos upload by member
- [ ] Weight/measurement tracking with charts
- [ ] WhatsApp diet plan sharing
- [ ] Multi-gym / branch support
- [ ] Payment / subscription tracking

---

## 🆓 Cost Breakdown

| Service | Free Tier | Limit |
|---|---|---|
| Vercel | Free | 100GB bandwidth/mo |
| Railway | $5 free credits/mo | ~500 hrs of runtime |
| Supabase | Free | 500MB DB, 2 projects |
| Cloudinary | Free | 25GB storage |

**Total monthly cost: $0** for a gym with up to ~100 members.
