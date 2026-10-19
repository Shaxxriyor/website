import { navigate } from '../lib/router.js';
import { CategoryTabs } from './CategoryTabs.jsx';
import { CourseCard } from './CourseCard.jsx';
import { FeaturedCourse } from './FeaturedCourse.jsx';
import { MarathonView } from './MarathonView.jsx';
import { PracticeLibrary } from './PracticeLibrary.jsx';
import { ElsView } from './ElsView.jsx';
import { PrizeBanner } from './PrizeBanner.jsx';
import { ReadingMarathonIcon, ListeningMarathonIcon, LogoMark, Wordmark, SparkleIcon } from './Icons.jsx';
import { categories, popularCourses, listeningMarathon, readingMarathon } from '../data/mock.js';

const SOON = {
  vocabulary: 'Vocabulary lists from the marathon passages are on the way.',
  mock: 'Full mock tests in CDI format are on the way.',
};

/** The public student-facing dashboard (marathons and courses). */
// The open tab lives in the address (#/reading-practice), so the test pages'
// back button and the browser's Back button return to the same tab.
export function HomeView({ tab: routeTab, results = [], practice = [], signedIn = false, checking = false, me = null, admin = null }) {
  const tab = categories.some((c) => c.id === routeTab) ? routeTab : 'all';
  const setTab = (id) => navigate(id === 'all' ? '/' : `/${id}`);
  // Signed-in students and the teacher can open everything; visitors get Day 1 of each section.
  // While the session is still being checked nothing is shown as locked (the server enforces it anyway).
  const unlocked = signedIn || Boolean(admin) || checking;

  return (
    <>
      <a className="brand" href="https://t.me/READING_CDI" target="_blank" rel="noopener">
        <span className="brand__mark">
          <LogoMark size={30} />
        </span>
        <Wordmark />
        <span className="brand__tag">IELTS Reading & Listening</span>
      </a>

      <h1 className="hero-title">
        Prepare with
        <br />
        the best
      </h1>

      {tab === 'all' && <PrizeBanner />}

      <CategoryTabs items={categories} active={tab} onChange={setTab} />

      {tab === 'els' ? (
        <ElsView me={me} admin={admin} unlocked={unlocked} />
      ) : tab === 'reading-practice' ? (
        <PracticeLibrary results={practice} attempts={me?.attempts} signedIn={signedIn} unlocked={unlocked} />
      ) : tab === 'listening-marathon' ? (
        <MarathonView marathon={listeningMarathon} icon={ListeningMarathonIcon} skill="listening" results={results} attempts={me?.attempts} signedIn={unlocked} />
      ) : tab === 'reading-marathon' ? (
        <MarathonView marathon={readingMarathon} icon={ReadingMarathonIcon} skill="reading" results={results} attempts={me?.attempts} signedIn={unlocked} />
      ) : SOON[tab] ? (
        <div className="empty card-white">
          <span className="empty__icon">
            <SparkleIcon size={20} />
          </span>
          <h3 className="empty__title">Coming soon</h3>
          <p className="muted-sm">{SOON[tab]}</p>
          <button type="button" className="btn btn--dark" onClick={() => setTab('reading-marathon')}>
            Try the Reading Marathon
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="popular-title">
            <div className="section-head">
              <h2 id="popular-title" className="label">Most popular</h2>
            </div>
            <div className="course-grid">
              {popularCourses.map((c) => (
                <CourseCard key={c.id} course={c} onOpen={setTab} />
              ))}
            </div>
          </section>

          <section aria-labelledby="featured-title">
            <div className="section-head">
              <h2 id="featured-title" className="label">Featured</h2>
            </div>
            <FeaturedCourse results={results} />
          </section>
        </>
      )}
    </>
  );
}
