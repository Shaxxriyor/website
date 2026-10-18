// Home page content: categories, course cards and the marathon day lists.
import {
  ReadingIcon,
  ListeningIcon,
  ReadingMarathonIcon,
  ListeningMarathonIcon,
  VocabularyIcon,
  MockTestIcon,
} from '../components/Icons.jsx';

// Static files in /public are served next to index.html, wherever it lives.
const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

export const categories = [
  { id: 'all', label: 'All' },
  { id: 'reading', label: 'Reading', icon: ReadingIcon },
  { id: 'listening', label: 'Listening', icon: ListeningIcon },
  { id: 'reading-marathon', label: 'Reading Marathon', icon: ReadingMarathonIcon },
  { id: 'listening-marathon', label: 'Listening Marathon', icon: ListeningMarathonIcon },
  { id: 'vocabulary', label: 'Vocabulary', icon: VocabularyIcon },
  { id: 'mock', label: 'Mock Tests', icon: MockTestIcon },
];

// Home page cards. `tab` opens that tab; cards without one are announced as coming soon.
export const popularCourses = [
  {
    id: 'reading-marathon',
    tone: 'mint',
    category: 'Reading Marathon',
    skill: 'reading',
    icon: ReadingMarathonIcon,
    badge: 'New',
    title: 'Reading Marathon: One Real Passage a Day',
    meta: '19 days · 13 questions each · Uzbek translation',
    tab: 'reading-marathon',
  },
  {
    id: 'listening-marathon',
    tone: 'peach',
    category: 'Listening Marathon',
    skill: 'listening',
    icon: ListeningMarathonIcon,
    badge: 'New',
    title: 'Listening Marathon: 20 Days of Sections 2 & 3',
    meta: '20 days · 20 questions each · PDF included',
    tab: 'listening-marathon',
  },
  {
    id: 'recent-reading',
    tone: 'rose',
    category: 'Reading',
    skill: 'reading',
    icon: ReadingIcon,
    title: 'Recently Tested Reading: Academic Set 2026',
    meta: 'Real exam passages from this year',
  },
  {
    id: 'recent-listening',
    tone: 'lilac',
    category: 'Listening',
    skill: 'listening',
    icon: ListeningIcon,
    title: 'Listening Sections 1–4: Real Exam Practice',
    meta: 'Full tests from recent exams',
  },
];

export const listeningMarathon = {
  title: 'Listening Marathon',
  subtitle: 'Sections 2 & 3 from recent exams — one day at a time',
  days: Array.from({ length: 20 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      day: i + 1,
      title: 'Sections 2 & 3',
      questions: 20,
      href: asset(`marathon/listening/day-${n}.html`),
      pdf: asset(`marathon/listening/day-${n}.pdf`),
      storagePrefix: `lm_day${i + 1}_`,
    };
  }),
};

// Reading pages are self-contained CDI exam simulators; they keep no saved
// progress, so these days have no `storagePrefix`.
export const readingMarathon = {
  title: 'Reading Marathon',
  subtitle: 'Read the passage with its Uzbek translation, then take the test in CDI format',
  days: [
    [1, 'The History of Pencil'],
    [2, 'The Origin of Paper'],
    [3, 'The Tuatara of New Zealand'],
    [4, 'Keeping the water away'],
    [5, 'The fashion industry'],
    [6, 'The Tasmanian tiger'],
    [7, 'The internal body clock'],
    [8, 'Why do singers lose their voices?'],
    [9, 'The fascinating world of attine ants'],
    [10, 'The women scientists of Bologna'],
    [11, 'Thinking for themselves'],
    [12, 'Science and Filmmaking'],
    [14, 'Are we born able to imitate?'],
    [15, 'Is artificial intelligence a threat?'],
    [16, 'Mind Music'],
    [17, 'Solving the problem of waste disposal'],
    [18, 'A unique golden textile'],
    [19, 'Flower Power'],
    [20, 'Mercator the Map Maker'],
  ].map(([day, title]) => ({
    day,
    title,
    questions: 13,
    href: asset(`marathon/reading/day-${String(day).padStart(2, '0')}.html`),
  })),
};
