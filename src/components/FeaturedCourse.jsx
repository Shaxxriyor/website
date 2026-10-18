import { PlayIcon, SparkleIcon, ArrowRight } from './Icons.jsx';
import { readingMarathon } from '../data/mock.js';

/** Today's pick: the student's next unfinished Reading Marathon day (Day 1 for visitors). */
export function FeaturedCourse({ results = [] }) {
  const done = new Set(results.filter((r) => r.skill === 'reading').map((r) => r.day));
  const next = readingMarathon.days.find((d) => !done.has(d.day)) ?? readingMarathon.days[0];
  return (
    <a className="featured" href={next.href} target="_blank" rel="noopener">
      <span className="featured__art" aria-hidden="true">
        <span className="blob blob--a" />
        <span className="blob blob--b" />
        <span className="blob blob--c" />
        <span className="featured__play">
          <PlayIcon size={18} />
        </span>
      </span>
      <span className="featured__content">
        <span className="pill pill--dark">
          <SparkleIcon size={12} /> {done.size ? 'Your next day' : 'Start here'}
        </span>
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
