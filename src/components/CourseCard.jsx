import { ArrowRight } from './Icons.jsx';

/** Home page course card: opens its tab, or shows "Coming soon" when there is nothing yet. */
export function CourseCard({ course, onOpen }) {
  const { tone, category, icon: Icon, badge, title, meta, tab } = course;
  const ready = Boolean(tab);
  const Tag = ready ? 'button' : 'article';
  return (
    <Tag
      className={`course-card tone-${tone} ${ready ? '' : 'is-soon'}`}
      {...(ready ? { type: 'button', onClick: () => onOpen(tab) } : {})}
    >
      <span className="course-card__head">
        <span className="chip-cat">
          <span className="chip-cat__icon">
            <Icon size={16} />
          </span>
          {category}
        </span>
        <span className="course-card__pills">
          {ready ? (
            badge && <span className="pill pill--glass">✨ {badge}</span>
          ) : (
            <span className="pill pill--glass">Coming soon</span>
          )}
        </span>
      </span>

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
