# READING_CDI — IELTS Dashboard

Student-facing dashboard (Reading & Listening Marathons) plus a private
student management system for the teacher: student registration, profiles,
and practice tracking — marathon days and exercises, with scores, study hours
and activity. Students' contact details are only shown on their own profile,
and only after the teacher signs in.

## Stack

- **Frontend:** Vite + React (`src/`), hash routes (`#/students`, `#/students/12`, `#/practice`)
- **API:** Vercel Functions (`api/*.js`, Web `Request`/`Response` handlers) with shared code in `server/`
- **Database:** Postgres — Neon in production, an in-process [PGlite](https://pglite.dev) database locally.
  Tables are created automatically on first request.
- **Auth:** one teacher account from environment variables; signed, HttpOnly session cookie;
  5 failed sign-ins per IP lock that IP out for 15 minutes.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 — sign in with admin / devpassword
npm run test:api   # end-to-end checks of every API endpoint
npm run build
```

Local data lives in `.data/` (git-ignored). Copy `.env.example` to `.env.local` to change the dev login
or to point at a real `DATABASE_URL`.

## Deploy on Vercel

1. **Import** this GitHub repo in Vercel (framework: Vite — detected automatically).
2. **Storage → Create Database → Neon (Postgres)** and connect it to the project.
   This sets `DATABASE_URL` for you.
3. **Settings → Environment Variables:**
   - `ADMIN_USERNAME` — e.g. `admin`
   - `ADMIN_PASSWORD` — at least 8 characters (sign-in is refused until it's set)
   - `SESSION_SECRET` — optional long random string
4. **Redeploy** so the variables take effect, then open `/#/students` and sign in.

## Structure

- `src/components/HomeView.jsx` — public dashboard; `ProfilePanel`, `CourseCard`, `MarathonView`, …
- `src/components/admin/` — `StudentsView`, `StudentProfile`, `PracticeView`, `StudentForm`, `PracticeForm`,
  `AdminPanel` (right-hand panels), `LoginView`, shared `ui.jsx` (sheet, fields, segmented control)
- `src/lib/` — `api.js` client, `router.js`, `format.js` (levels, skills, dates)
- `api/` — `auth`, `students`, `lessons` (practice records), `overview` endpoints
- `server/` — `db.js` (Neon / PGlite + schema), `auth.js`, `model.js` (validation & queries), `http.js`
- `dev/api-plugin.js` — serves `api/` from the Vite dev server
- `public/marathon/` — Reading (`day-01` … `day-20`, no day 13 yet) and Listening (`day-01` … `day-20` + PDFs) Marathon pages
