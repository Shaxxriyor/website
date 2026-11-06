import { SECTIONS, SECTION_KEYS } from '../../lib/access.js';
import { CheckIcon, LockIcon } from '../Icons.jsx';

const TONES = {
  'reading-marathon': 'mint',
  'listening-marathon': 'peach',
  'reading-practice': 'rose',
  'listening-practice': 'lilac',
  vocabulary: 'sky',
  mock: 'lemon',
};

/** One switch per section: which parts of the site are opened for a student. */
export function AccessPicker({ value = [], onChange, disabled = false }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : SECTION_KEYS.filter((k) => k === key || value.includes(k)));
  return (
    <div className="access-picker">
      <div className="access-picker__grid">
        {SECTIONS.map((s) => {
          const on = value.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              className={`access-chip tone-${TONES[s.key]} ${on ? 'is-on' : ''}`}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(s.key)}
            >
              <span className="access-chip__icon">{on ? <CheckIcon size={14} /> : <LockIcon size={13} />}</span>
              <span className="access-chip__text">
                <strong>{s.label}</strong>
                <small>{on ? 'Open' : s.trial ? `Trial: ${s.trial}` : 'Closed'}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="access-picker__all">
        <button type="button" className="link-btn" disabled={disabled || value.length === SECTION_KEYS.length} onClick={() => onChange(SECTION_KEYS)}>
          Open everything
        </button>
        <button type="button" className="link-btn" disabled={disabled || value.length === 0} onClick={() => onChange([])}>
          Close everything
        </button>
      </div>
    </div>
  );
}
