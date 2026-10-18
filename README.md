# READING_CDI — IELTS Dashboard

Student-facing dashboard (Reading & Listening Marathons) plus a private
student management system for the teacher: student registration, profiles,
and practice tracking — marathon days and exercises, with scores, study hours
and activity. Students' contact details are only shown on their own profile,
and only after the teacher signs in.

**Automatic tracking:** each student gets an 8-character sign-in code (shown on their
profile). Once they enter it on the home page, `public/track.js` — loaded by every marathon
page — saves their active time on each day (visible tab + recent input or playing audio) and
their score when the page shows one. These records appear as **Auto** in Practice.

## Stack

- **Frontend:** Vite + React (`src/`), hash routes (`#/students`, `#/students/12`, `#/practice`)
- **API:** Vercel Functions (`api/*.js`, Web `Request`/`Response` handlers) with shared code in `server/`
- **Database:** Postgres — Neon in production, an in-process [PGlite](https://pglite.dev) database locally.
  Tables are created automatically on first request.
- **Auth:** one teacher account from environment variables; students sign in with their code.
  Both use signed, HttpOnly cookies; 5 failed sign-ins per IP lock that IP out for 15 minutes.

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
- `api/` — `auth`, `students`, `lessons` (practice records), `overview`; student side: `me`, `track`, `leaderboard` (shared rating)
- `server/` — `db.js` (Neon / PGlite + schema), `auth.js`, `model.js` (validation & queries), `http.js`
- `dev/api-plugin.js` — serves `api/` from the Vite dev server
- `content/` — all course materials (marathons, practice, ELS). Not public: served by `api/content.js`
  (rewritten from `/marathon/*`, `/practice/*`, `/els/*` in `vercel.json`). Visitors get Day 1 of each section
  (`src/lib/access.js`); everything else needs a student code or the teacher login
- `public/track.js` — progress tracker for marathon and practice pages; `npm run add-tracker` adds it to new pages
- `content/els/` — ELS Reading: 20 Upper-Intermediate passages from the ELS Reading book (`day-NN-1.webp` text,
  `day-NN-2.webp` exercises, `day-NN.pdf`); day list in `src/data/els.js`. Students upload notebook translation
  photos (stored in Postgres, resized in the browser) that classmates see in the day view and the Rating
- `content/practice/reading/` — Reading Practice passages (`p1-…`, `p2-…`, `p3-…`); add more with
  `npm run import-practice -- "<folder with Passage 1/2/3>"` then `npm run add-tracker`
- `content/marathon/` — Reading (`day-01` … `day-20`, no day 13 yet) and Listening (`day-01` … `day-20` + PDFs) Marathon pages
