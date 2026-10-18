import { LogoMark, BasketIcon, HomeIcon, UsersIcon, LessonIcon, SettingsIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';

const nav = [
  { id: 'home', label: 'Home', icon: HomeIcon, href: '#/' },
  { id: 'students', label: 'Students', icon: UsersIcon, href: '#/students' },
  { id: 'practice', label: 'Practice', icon: LessonIcon, href: '#/practice' },
];

export function Sidebar({ active, userName }) {
  return (
    <aside className="sidebar glass" aria-label="Primary">
      <a className="sidebar__logo" href="#/" aria-label="READING_CDI home">
        <LogoMark />
      </a>

      <button className="icon-btn icon-btn--soft sidebar__cart" aria-label="Basket, 1 item">
        <BasketIcon />
        <span className="dot" />
      </button>

      <nav className="sidebar__nav">
        {nav.map(({ id, label, icon: Icon, href }) => (
          <a key={id} href={href} className={`nav-item ${active === id ? 'is-active' : ''}`} aria-current={active === id ? 'page' : undefined}>
            <span className="icon-btn nav-btn" aria-hidden="true">
              <Icon />
            </span>
            <span className="nav-item__label">{label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar__bottom">
        <button className="icon-btn icon-btn--soft" aria-label="Settings">
          <SettingsIcon />
        </button>
        {userName && <Avatar name={userName} size={40} className="sidebar__me" />}
      </div>
    </aside>
  );
}
