import { LogoMark, HomeIcon, UsersIcon, LessonIcon, TrophyIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';

const nav = [
  { id: 'home', label: 'Home', icon: HomeIcon, href: '#/' },
  { id: 'rating', label: 'Rating', icon: TrophyIcon, href: '#/rating' },
  // Teacher-only: shown when the teacher is signed in (or already on a teacher page).
  { id: 'students', label: 'Students', icon: UsersIcon, href: '#/students', teacher: true },
  { id: 'practice', label: 'Practice', icon: LessonIcon, href: '#/practice', teacher: true },
];

export function Sidebar({ active, userName, userId = null, userAvatar = null, teacher = false }) {
  return (
    <aside className="sidebar glass" aria-label="Primary">
      <a className="sidebar__logo" href="#/" aria-label="READING_CDI home">
        <LogoMark />
      </a>


      <nav className="sidebar__nav">
        {nav.filter((item) => teacher || !item.teacher).map(({ id, label, icon: Icon, href }) => (
          <a key={id} href={href} className={`nav-item ${active === id ? 'is-active' : ''}`} aria-current={active === id ? 'page' : undefined}>
            <span className="icon-btn nav-btn" aria-hidden="true">
              <Icon />
            </span>
            <span className="nav-item__label">{label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar__bottom">
        {userName && <Avatar name={userName} size={40} className="sidebar__me" studentId={userId} v={userAvatar} />}
      </div>
    </aside>
  );
}
