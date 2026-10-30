import { ArrowRight, Tick } from './Icons.jsx';
import { readingMarathon } from '../data/mock.js';

/**
 * Today's pick: the student's next unfinished Reading Marathon day (Day 1 for visitors),
 * next to the marathon drawn as an answer sheet — finished days ticked, today's day marked.
 */
export function FeaturedCourse({ results = [] }) {
  const done = new Set(results.filter((r) => r.skill === 'reading').map((r) => r.day));
  const next = readingMarathon.days.find((d) => !done.has(d.day)) ?? readingMarathon.days[0];
  return (
    <a className="featured" href={next.href}>
      <span className="featured__sheet" aria-label={`${done.size} of ${readingMarathon.days.length} days done`}>
        {readingMarathon.days.map((d) => (
          <span
            key={d.day}
            className={`featured__cell ${done.has(d.day) ? 'is-done' : ''} ${d.day === next.day ? 'is-next' : ''}`}
          >
            {done.has(d.day) ? <Tick size={12} /> : <span className="num">{d.day}</span>}
          </span>
        ))}
      </span>
      <span className="featured__content">
        <span className="muted-sm">{done.size ? 'Your next day' : 'Start here'}</span>
        <span className="featured__title">
          Reading Marathon · Day {next.day}: {next.title}
        </span>
        <span className="muted-sm">{next.questions} questions · passage with Uzbek translation</span>
      </span>
      <span className="btn btn--dark featured__cta">
        Start reading <ArrowRight size={16} />
      </span>
    </a>
  );
}
