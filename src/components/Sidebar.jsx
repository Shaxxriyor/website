import { useState } from 'react';
import {
  LogoMark,
  BasketIcon,
  HomeIcon,
  CalendarIcon,
  BookIcon,
  GridIcon,
  SettingsIcon,
} from './Icons.jsx';
import { Avatar } from './Avatar.jsx';

const nav = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
  { id: 'library', label: 'Library', icon: BookIcon },
  { id: 'catalog', label: 'Catalog', icon: GridIcon },
];

export function Sidebar() {
  const [active, setActive] = useState('home');

  return (
    <aside className="sidebar glass" aria-label="Primary">
      <a className="sidebar__logo" href="#" aria-label="IELTS Academy home">
        <LogoMark />
      </a>

      <button className="icon-btn icon-btn--soft sidebar__cart" aria-label="Basket, 1 item">
        <BasketIcon />
        <span className="dot" />
      </button>

      <nav className="sidebar__nav">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`icon-btn nav-btn ${active === id ? 'is-active' : ''}`}
            aria-label={label}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => setActive(id)}
          >
            <Icon />
            <span className="nav-btn__tip">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__bottom">
        <button className="icon-btn icon-btn--soft" aria-label="Settings">
          <SettingsIcon />
        </button>
        <Avatar name="Annette Black" size={40} className="sidebar__me" />
      </div>
    </aside>
  );
}
