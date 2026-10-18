// Static placeholder content for the UI stage. Replaced by real data in step 2.
import {
  ReadingIcon,
  ListeningIcon,
  ReadingMarathonIcon,
  ListeningMarathonIcon,
  VocabularyIcon,
  MockTestIcon,
} from '../components/Icons.jsx';

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
      href: `/marathon/listening/day-${n}.html`,
      pdf: `/marathon/listening/day-${n}.pdf`,
    };
  }),
};

// No Reading Marathon days published yet — the view shows an empty state.
export const readingMarathon = {
  title: 'Reading Marathon',
  subtitle: 'One recently tested passage a day',
  days: [],
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
