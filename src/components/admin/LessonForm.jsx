import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { SKILLS, todayISO } from '../../lib/format.js';
import { CheckIcon, SearchIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { Field, Segmented, Sheet, Skeleton, useLoad } from './ui.jsx';

const DURATIONS = [30, 45, 60, 90, 120];
const BANDS = Array.from({ length: 19 }, (_, i) => (i / 2).toFixed(1)).reverse();

/** Record a lesson for one student or a whole group at once. */
export function LessonForm({ presetStudentId, onClose, onSaved }) {
  const { data, loading } = useLoad(() => api.students(), []);
  const students = useMemo(() => data?.students ?? [], [data]);
  const groups = useMemo(() => [...new Set(students.map((s) => s.group_name).filter(Boolean))].sort(), [students]);

  const [selected, setSelected] = useState(() => new Set(presetStudentId ? [presetStudentId] : []));
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ lesson_date: todayISO(), skill: 'reading', duration_minutes: 90, topic: '', band: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const visible = students.filter(
    (s) =>
      (s.status === 'active' || selected.has(s.id)) &&
      (!search || `${s.full_name} ${s.group_name}`.toLowerCase().includes(search.toLowerCase())),
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectGroup = (g) => {
    const ids = students.filter((s) => s.group_name === g && s.status === 'active').map((s) => s.id);
    const allIn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
    setErrors((er) => ({ ...er, student_ids: undefined }));
  };

  async function submit() {
    if (!selected.size) {
      setErrors({ student_ids: 'Choose at least one student' });
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { created } = await api.createLessons({
        ...form,
        duration_minutes: Number(form.duration_minutes),
        student_ids: [...selected],
      });
      onSaved(created);
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Record lesson"
      subtitle="Log a lesson for one student or a whole group."
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          {message && <span className="sheet__error">{message}</span>}
          <button type="button" className="btn btn--glass" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--dark" disabled={busy || loading}>
            {busy
              ? 'Saving…'
              : selected.size > 1
                ? `Save for ${selected.size} students`
                : 'Save lesson'}
          </button>
        </>
      }
    >
      <div className="lesson-form">
        <Field label={`Students${selected.size ? ` · ${selected.size} selected` : ''}`} error={errors.student_ids} wide>
          {loading ? (
            <Skeleton rows={3} />
          ) : students.length === 0 ? (
            <p className="muted-sm">Register a student first.</p>
          ) : (
            <div className="picker">
              {groups.length > 0 && (
                <div className="picker__groups">
                  <span className="muted-sm">Whole group:</span>
                  {groups.map((g) => {
                    const ids = students.filter((s) => s.group_name === g && s.status === 'active').map((s) => s.id);
                    const on = ids.length > 0 && ids.every((id) => selected.has(id));
                    return (
                      <button
                        type="button"
                        key={g}
                        className={`chip ${on ? 'is-active' : ''}`}
                        onClick={() => selectGroup(g)}
                        disabled={!ids.length}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
              <label className="search search--inline">
                <SearchIcon size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students"
                  aria-label="Search students"
                />
              </label>
              <ul className="picker__list">
                {visible.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`picker__item ${selected.has(s.id) ? 'is-checked' : ''}`}
                      aria-pressed={selected.has(s.id)}
                      onClick={() => {
                        toggle(s.id);
                        setErrors((er) => ({ ...er, student_ids: undefined }));
                      }}
                    >
                      <Avatar name={s.full_name} size={28} />
                      <span className="picker__name">{s.full_name}</span>
                      <span className="muted-sm">{s.group_name}</span>
                      <span className="picker__check">{selected.has(s.id) && <CheckIcon size={14} />}</span>
                    </button>
                  </li>
                ))}
                {!visible.length && <li className="muted-sm picker__none">No matching active students</li>}
              </ul>
            </div>
          )}
        </Field>

        <div className="form-grid">
          <Field label="Date" error={errors.lesson_date} htmlFor="lf-date">
            <input id="lf-date" className="input" type="date" value={form.lesson_date} onChange={set('lesson_date')} />
          </Field>
          <Field label="Band score (optional)" error={errors.band} htmlFor="lf-band">
            <select id="lf-band" className="input" value={form.band} onChange={set('band')}>
              <option value="">No score</option>
              {BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Skill" error={errors.skill} wide>
            <Segmented
              label="Skill"
              value={form.skill}
              onChange={set('skill')}
              options={SKILLS.map((s) => ({ value: s.key, label: s.label }))}
            />
          </Field>
          <Field label="Duration" error={errors.duration_minutes} wide>
            <div className="duration">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`chip ${Number(form.duration_minutes) === d ? 'is-active' : ''}`}
                  onClick={() => set('duration_minutes')(d)}
                >
                  {d < 60 ? `${d} min` : `${d / 60}h`.replace('.5h', 'h 30m')}
                </button>
              ))}
              <label className="duration__custom">
                <input
                  className="input"
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={form.duration_minutes}
                  onChange={set('duration_minutes')}
                  aria-label="Duration in minutes"
                />
                <span className="muted-sm">min</span>
              </label>
            </div>
          </Field>
          <Field label="Topic" error={errors.topic} wide htmlFor="lf-topic">
            <input
              id="lf-topic"
              className="input"
              value={form.topic}
              onChange={set('topic')}
              placeholder="e.g. Reading Marathon Day 7 — True / False / Not Given"
              maxLength={200}
            />
          </Field>
          <Field label="Notes (optional)" error={errors.notes} wide htmlFor="lf-notes">
            <textarea
              id="lf-notes"
              className="input input--area"
              rows={2}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Homework, weak points, feedback…"
              maxLength={2000}
            />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
