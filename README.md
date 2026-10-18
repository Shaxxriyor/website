# IELTS Academy — Dashboard UI

Step 1 of the build: the student dashboard UI (layout, components, and visual polish).
Backend, auth, and data features come in step 2. All content is static placeholder data in `src/data/mock.js`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Structure

- `src/App.jsx` — page layout (sidebar · main · profile panel)
- `src/components/` — `Sidebar`, `CategoryTabs`, `CourseCard`, `MarathonView`, `FeaturedCourse`, `ProfilePanel`, `ActivityChart`, `MyCourseCard`, `Avatar`, `Icons`
- `public/marathon/listening/` — Listening Marathon practice pages and PDFs (`day-01` … `day-20`), opened from the Listening Marathon tab
- `src/styles/tokens.css` — colors, radii, shadows, motion tokens
- `src/styles/app.css` — component styles and responsive breakpoints (1280 / 1080 / 720px)
