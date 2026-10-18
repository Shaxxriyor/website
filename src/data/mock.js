// Static placeholder content for the UI stage. Replaced by real data in step 2.
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

export const popularCourses = [
  {
    id: 1,
    tone: 'rose',
    category: 'Reading',
    icon: ReadingIcon,
    rating: 4.8,
    title: 'Recently Tested Reading: Academic Set 2026',
    students: 9530,
    learners: ['Malika R', 'Jasur T', 'Aziza K'],
  },
  {
    id: 2,
    tone: 'peach',
    category: 'Listening Marathon',
    icon: ListeningMarathonIcon,
    rating: 4.9,
    badge: 'New',
    title: 'Listening Marathon: 20 Days of Sections 2 & 3',
    students: 1463,
    learners: ['Dilnoza S', 'Bekzod A'],
  },
  {
    id: 3,
    tone: 'lilac',
    category: 'Listening',
    icon: ListeningIcon,
    rating: 4.9,
    title: 'Listening Sections 1–4: Real Exam Practice',
    students: 6726,
    learners: ['Kamola N', 'Timur U'],
  },
  {
    id: 4,
    tone: 'mint',
    category: 'Reading Marathon',
    icon: ReadingMarathonIcon,
    rating: 5.0,
    badge: 'Top 10',
    title: 'Reading Marathon: One Real Passage a Day',
    students: 8735,
    learners: ['Sardor M'],
  },
];

export const featuredCourse = {
  category: 'Daily Article',
  title: 'Why cities are turning to “sponge” design to fight floods',
  meta: 'Band 7+ vocabulary · 8 min read · 13 questions',
  progress: 0,
};

export const user = {
  name: 'Annette Black',
  friends: 274,
  friendAvatars: ['Nodira B', 'Otabek J', 'Lola F'],
};

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

// Hours of study per skill, per month — drives the stacked activity chart.
export const activitySeries = [
  { key: 'reading', label: 'Reading', color: 'var(--chart-reading)' },
  { key: 'listening', label: 'Listening', color: 'var(--chart-listening)' },
];

export const activity = [
  { month: 'Jun', reading: 1.8, listening: 1.1 },
  { month: 'Jul', reading: 1.5, listening: 1.1 },
  { month: 'Aug', reading: 1.1, listening: 0.7 },
  { month: 'Sep', reading: 1.9, listening: 1.2 },
  { month: 'Oct', reading: 1.2, listening: 0.8 },
  { month: 'Nov', reading: 1.1, listening: 0.7 },
  { month: 'Dec', reading: 2.1, listening: 1.4 },
];

export const myCourses = [
  {
    id: 'm1',
    tone: 'rose',
    category: 'Reading',
    icon: ReadingIcon,
    rating: 4.8,
    title: 'Reading Masterclass (True/False/Not Given & More)',
    students: 9530,
    progress: 0.58,
    learners: ['Aziza K', 'Jasur T'],
  },
  {
    id: 'm2',
    tone: 'peach',
    category: 'Listening Marathon',
    icon: ListeningMarathonIcon,
    rating: 4.9,
    title: 'Listening Marathon — Day 7: Sections 2 & 3',
    students: 1463,
    progress: 0.3,
    learners: ['Dilnoza S'],
  },
  {
    id: 'm3',
    tone: 'lilac',
    category: 'Listening',
    icon: ListeningIcon,
    rating: 4.7,
    title: 'Map Labelling & Multiple Choice Drills',
    students: 2087,
    progress: 0.74,
    learners: ['Kamola N', 'Timur U'],
  },
];
