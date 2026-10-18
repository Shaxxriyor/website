import { useState } from 'react';
import { api } from '../../lib/api.js';
import { categoryOf, duration, practiceTitle, relativeDay, score, scorePct } from '../../lib/format.js';
import { TrashIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { ConfirmSheet } from './ui.jsx';

/** Practice records grouped under date headers. `showStudent` adds the student column (all-practice log). */
export function PracticeRows({ lessons, showStudent = false, onDeleted }) {
  const [deleting, setDeleting] = useState(null);

  const byDay = [];
  for (const l of lessons) {
    const last = byDay.at(-1);
    if (last?.date === l.lesson_date) last.items.push(l);
    else byDay.push({ date: l.lesson_date, items: [l] });
  }

  return (
    <div className="lesson-days">
      {byDay.map((day) => (
        <section key={day.date} className="lesson-day">
          <h3 className="lesson-day__title">{relativeDay(day.date)}</h3>
          <ul className="lesson-list card-white">
            {day.items.map((l) => {
              const cat = categoryOf(l);
              const pct = scorePct(l);
              return (
                <li key={l.id} className={`lesson-row ${showStudent ? 'lesson-row--wide' : ''}`}>
                  {showStudent && (
                    <a className="lesson-row__who" href={`#/students/${l.student_id}`}>
                      <Avatar name={l.student_name} size={30} studentId={l.student_id} v={l.avatar_v} />
                      <span>
                        <strong>{l.student_name}</strong>
                        {l.group_name && <span className="muted-sm">{l.group_name}</span>}
                      </span>
                    </a>
                  )}
                  <span className={`skill-chip tone-${cat.tone}`} title={cat.label}>
                    <i style={{ background: cat.color }} />
                    {cat.short}
                  </span>
                  <span className="lesson-row__topic" title={l.notes || undefined}>
                    <span className="lesson-row__title">
                      {practiceTitle(l) || <span className="muted-sm">Untitled</span>}
                      {l.source === 'auto' && (
                        <span className="auto-tag" title="Recorded automatically when the student used the marathon page">
                          Auto
                        </span>
                      )}
                    </span>
                    {l.notes && <span className="muted-sm lesson-row__notes">{l.notes}</span>}
                  </span>
                  <span className="lesson-row__meta num">{duration(l.duration_minutes)}</span>
                  <span className="lesson-row__band num" title={pct != null ? `${pct}%` : 'No score'}>
                    {pct != null ? (
                      <span className={`band ${pct >= 80 ? 'band--good' : pct < 50 ? 'band--low' : ''}`}>
                        {score(l)}
                        <small>Band {Number(l.band).toFixed(1)}</small>
                      </span>
                    ) : (
                      <span className="muted-sm">—</span>
                    )}
                  </span>
                  <button
                    className="icon-btn icon-btn--ghost icon-btn--sm"
                    aria-label="Delete record"
                    onClick={() => setDeleting(l)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {deleting && (
        <ConfirmSheet
          title="Delete this record?"
          message={`${categoryOf(deleting).label} · ${practiceTitle(deleting)} on ${relativeDay(deleting.lesson_date)}${
            showStudent ? ` for ${deleting.student_name}` : ''
          }. This can’t be undone.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.deleteLesson(deleting.id);
            setDeleting(null);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}
