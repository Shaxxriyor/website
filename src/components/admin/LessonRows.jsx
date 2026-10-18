import { useState } from 'react';
import { api } from '../../lib/api.js';
import { band, duration, relativeDay, skillMeta } from '../../lib/format.js';
import { TrashIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { ConfirmSheet } from './ui.jsx';

/** Lessons grouped under date headers. `showStudent` adds the student column (all-lessons log). */
export function LessonRows({ lessons, showStudent = false, onDeleted }) {
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
              const skill = skillMeta(l.skill);
              return (
                <li key={l.id} className={`lesson-row ${showStudent ? 'lesson-row--wide' : ''}`}>
                  {showStudent && (
                    <a className="lesson-row__who" href={`#/students/${l.student_id}`}>
                      <Avatar name={l.student_name} size={30} />
                      <span>
                        <strong>{l.student_name}</strong>
                        {l.group_name && <span className="muted-sm">{l.group_name}</span>}
                      </span>
                    </a>
                  )}
                  <span className={`skill-chip tone-${skill.tone}`}>
                    <i style={{ background: skill.color }} />
                    {skill.label}
                  </span>
                  <span className="lesson-row__topic" title={l.notes || undefined}>
                    {l.topic || <span className="muted-sm">No topic</span>}
                    {l.notes && <span className="muted-sm lesson-row__notes">{l.notes}</span>}
                  </span>
                  <span className="lesson-row__meta num">{duration(l.duration_minutes)}</span>
                  <span className="lesson-row__band num" title="Band score">
                    {l.band != null ? <span className="band">{band(l.band)}</span> : <span className="muted-sm">—</span>}
                  </span>
                  <button
                    className="icon-btn icon-btn--ghost icon-btn--sm"
                    aria-label="Delete lesson"
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
          title="Delete this lesson?"
          message={`${skillMeta(deleting.skill).label} · ${duration(deleting.duration_minutes)} on ${relativeDay(deleting.lesson_date)}${
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
