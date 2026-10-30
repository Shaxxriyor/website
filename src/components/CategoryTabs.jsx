import { GridIcon } from './Icons.jsx';
import { sectionTones } from '../data/mock.js';

export function CategoryTabs({ items, active, onChange }) {
  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist" aria-label="Course categories">
        {items.map(({ id, label, icon: Icon = GridIcon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            className={`tab ${sectionTones[id] ? `tone-${sectionTones[id]}` : ''} ${active === id ? 'is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="tab__icon">
              <Icon size={18} />
            </span>
            <span className="tab__label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
