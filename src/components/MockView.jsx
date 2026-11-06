import { MOCKS } from '../lib/mocks.js';
import { api } from '../lib/api.js';
import { askToSignIn } from '../lib/access.js';
import { ArrowRight, LockIcon, MockTestIcon } from './Icons.jsx';
import { MockResults } from './MockResults.jsx';
import { ErrorNote, Skeleton, useLoad } from './admin/ui.jsx';

/** Mock Tests tab: the full mocks (registered students only) and the student's own results. */
export function MockView({ signedIn = false, isStudent = false, teacher = false }) {
  const { data, error, loading, reload } = useLoad(() => (isStudent ? api.mockResults() : Promise.resolve({ results: [] })), [isStudent]);
  const results = data?.results ?? [];

  return (
    <section className="marathon" aria-labelledby="mock-title">
      <header className="marathon__head card-white">
        <span className="marathon__icon">
          <MockTestIcon size={22} />
        </span>
        <div className="marathon__intro">
          <h2 id="mock-title" className="marathon__title">
            Mock Tests
          </h2>
          <p className="muted-sm">
            Full IELTS mocks in CDI format: Listening, Reading and Writing in one sitting. The test opens full screen; stay in it until you
            submit Writing, because leaving the window is recorded for your teacher.
          </p>
        </div>
      </header>

      <ol className="day-grid mock-grid">
        {MOCKS.map((m, i) => {
          const locked = !signedIn;
          const Link = locked ? 'button' : 'a';
          return (
            <li key={m.id} className={`day-card tone-${['lemon', 'rose', 'lilac', 'mint', 'sky'][i % 5]} ${locked ? 'is-locked' : ''}`}>
              <Link
                className="day-card__link"
                {...(locked ? { type: 'button', onClick: () => askToSignIn(m.title) } : { href: `./mock/${m.id}.html` })}
              >
                <span className="day-card__top">
                  <span className="day-card__label">Full mock</span>
                  {locked && (
                    <span className="pill pill--glass day-card__status">
                      <LockIcon size={12} /> Students
                    </span>
                  )}
                </span>
                <span className="day-card__num mock-card__date">{m.title.replace(/^Full Mock Test /, '')}</span>
                <span className="day-card__meta">
                  <span className="day-card__name">{m.parts}</span>
                  {Math.floor(m.minutes / 60)} h {m.minutes % 60} min
                </span>
                <span className="day-card__go" aria-hidden="true">
                  {locked ? <LockIcon size={15} /> : <ArrowRight size={16} />}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {isStudent && (
        <section aria-labelledby="mock-results-title" className="mock-mine">
          <div className="section-head">
            <h2 id="mock-results-title" className="label">
              Your results
            </h2>
          </div>
          {loading && !data ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorNote error={error} onRetry={reload} />
          ) : results.length ? (
            <MockResults results={results} />
          ) : (
            <p className="muted-sm">Your mock results will appear here after you finish a part.</p>
          )}
        </section>
      )}
      {teacher && !isStudent && (
        <p className="muted-sm">
          Every student&rsquo;s result is in <a href="#/mock-results">Mock results</a>.
        </p>
      )}
    </section>
  );
}
