import { ArrowRight } from './Icons.jsx';

/** Home page course card: opens its tab, or shows "Coming soon" when there is nothing yet. */
export function CourseCard({ course, onOpen }) {
  const { tone, icon: Icon, figure, unit, title, meta, tab } = course;
  const ready = Boolean(tab);
  const Tag = ready ? 'button' : 'article';
  return (
    <Tag
      className={`course-card tone-${tone} ${ready ? '' : 'is-soon'}`}
      {...(ready ? { type: 'button', onClick: () => onOpen(tab) } : {})}
    >
      <span className="course-card__head">
        <span className="chip-cat__icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        {!ready && <span className="pill pill--glass">Coming soon</span>}
      </span>

      {figure && (
        <span className="course-card__figure">
          <span className="num">{figure}</span> {unit}
        </span>
      )}
      <span className="course-card__title">{title}</span>

      <span className="course-card__foot">
        <span className="muted-sm">{meta}</span>
        {ready && (
          <span className="course-card__go" aria-hidden="true">
            <ArrowRight size={16} />
          </span>
        )}
      </span>
    </Tag>
  );
}
