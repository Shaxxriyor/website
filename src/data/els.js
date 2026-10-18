// ELS Reading: 20 days, one Upper-Intermediate passage from the ELS Reading book per day.
// Each day has its two book pages (text + exercises) as images and as a small PDF in public/els/.
const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

export const els = {
  title: 'ELS Reading',
  subtitle: 'Upper-Intermediate passages',
  days: [
    { day: 1, passage: 2, title: "Darwin's Theory of Evolution", bookPage: 162 },
    { day: 2, passage: 4, title: 'Hagia Sophia', bookPage: 166 },
    { day: 3, passage: 5, title: 'The Lost Settlers', bookPage: 168 },
    { day: 4, passage: 9, title: 'Active Noise Control', bookPage: 176 },
    { day: 5, passage: 11, title: 'The Loch Ness Monster', bookPage: 180 },
    { day: 6, passage: 12, title: 'The Puffer Fish', bookPage: 182 },
    { day: 7, passage: 13, title: 'Spartacus', bookPage: 184 },
    { day: 8, passage: 14, title: 'The Chinese Language', bookPage: 186 },
    { day: 9, passage: 18, title: 'The Habit of Cheerfulness', bookPage: 194 },
    { day: 10, passage: 22, title: 'What Are You Laughing At?', bookPage: 202 },
    { day: 11, passage: 24, title: 'Henry Ford: Humanitarian and Businessman', bookPage: 206 },
    { day: 12, passage: 27, title: 'The First Renaissance Man', bookPage: 212 },
    { day: 13, passage: 28, title: 'Without a Trace', bookPage: 214 },
    { day: 14, passage: 45, title: 'Tourism', bookPage: 248 },
    { day: 15, passage: 46, title: 'Organic Farming', bookPage: 250 },
    { day: 16, passage: 52, title: 'Culture Shock', bookPage: 262 },
    { day: 17, passage: 55, title: 'The English Language', bookPage: 268 },
    { day: 18, passage: 57, title: 'Apollo 13', bookPage: 272 },
    { day: 19, passage: 61, title: 'Sphinx', bookPage: 280 },
    { day: 20, passage: 68, title: 'Cyrus Field', bookPage: 294 },
  ].map((d) => {
    const n = String(d.day).padStart(2, '0');
    return {
      ...d,
      pages: [asset(`els/day-${n}-1.webp`), asset(`els/day-${n}-2.webp`)],
      pdf: asset(`els/day-${n}.pdf`),
    };
  }),
};
