import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { MARATHON_DAYS, MARATHON_TOTAL, marathonTitle, todayISO } from '../../lib/format.js';
import { CheckIcon, SearchIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { Field, Segmented, Sheet, Skeleton, useLoad } from './ui.jsx';

const DURATIONS = [20, 30, 45, 60, 90];
const durationLabel = (d) => (d < 60 ? `${d} min` : `${d / 60}h`.replace('.5h', 'h 30m'));

/** Record a marathon day or an exercise for one student or a whole group. */
export function PracticeForm({ presetStudentId, onClose, onSaved }) {
  const { data, loading } = useLoad(() => api.students(), []);
  const students = useMemo(() => data?.students ?? [], [data]);
  const groups = useMemo(() => [...new Set(students.map((s) => s.group_name).filter(Boolean))].sort(), [students]);

  const [selected, setSelected] = useState(() => new Set(presetStudentId ? [presetStudentId] : []));
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    kind: 'marathon',
    skill: 'reading',
    day: '',
    topic: '',
    correct: '',
    total: '',
    lesson_date: todayISO(),
    duration_minutes: 60,
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const isMarathon = form.kind === 'marathon';
  const many = selected.size > 1;
  const fixedTotal = isMarathon ? MARATHON_TOTAL[form.skill] : null;

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

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setErrors((er) => ({ ...er, student_ids: undefined }));
  };

  const groupIds = (g) => students.filter((s) => s.group_name === g && s.status === 'active').map((s) => s.id);
  const toggleGroup = (g) => {
    const ids = groupIds(g);
    const allIn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
    setErrors((er) => ({ ...er, student_ids: undefined }));
  };

  async function submit() {
    const local = {};
    if (!selected.size) local.student_ids = 'Choose at least one student';
    if (isMarathon && !form.day) local.day = 'Choose a day';
    if (!isMarathon && !form.topic.trim()) local.topic = 'Name the passage or exercise';
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const withScore = !many && form.correct !== '';
      const { created } = await api.createLessons({
        student_ids: [...selected],
        kind: form.kind,
        skill: form.skill,
        day: isMarathon ? Number(form.day) : null,
        topic: isMarathon ? marathonTitle(form.skill, Number(form.day)) ?? '' : form.topic,
        correct: withScore ? Number(form.correct) : null,
        total: withScore ? (fixedTotal ?? (form.total === '' ? null : Number(form.total))) : null,
        lesson_date: form.lesson_date,
        duration_minutes: Number(form.duration_minutes),
        notes: form.notes,
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
      title="Record practice"
      subtitle="A marathon day or a practice passage — for one student or a whole group."
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
            {busy ? 'Saving…' : many ? `Save for ${selected.size} students` : 'Save'}
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
                    const ids = groupIds(g);
                    const on = ids.length > 0 && ids.every((id) => selected.has(id));
                    return (
                      <button
                        type="button"
                        key={g}
                        className={`chip ${on ? 'is-active' : ''}`}
                        onClick={() => toggleGroup(g)}
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
                      onClick={() => toggle(s.id)}
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
          <Field label="Type" error={errors.kind}>
            <Segmented
              label="Type"
              value={form.kind}
              onChange={set('kind')}
              options={[
                { value: 'marathon', label: 'Marathon' },
                { value: 'exercise', label: 'Practice' },
              ]}
            />
          </Field>
          <Field label="Skill" error={errors.skill}>
            <Segmented
              label="Skill"
              value={form.skill}
              onChange={set('skill')}
              options={[
                { value: 'reading', label: 'Reading' },
                { value: 'listening', label: 'Listening' },
              ]}
            />
          </Field>

          {isMarathon ? (
            <Field label={`${form.skill === 'reading' ? 'Reading' : 'Listening'} Marathon day`} error={errors.day} wide htmlFor="pf-day">
              <select id="pf-day" className="input" value={form.day} onChange={set('day')}>
                <option value="">Choose a day…</option>
                {Array.from({ length: MARATHON_DAYS }, (_, i) => i + 1).map((d) => {
                  const t = marathonTitle(form.skill, d);
                  return (
                    <option key={d} value={d}>
                      Day {d}
                      {t ? ` — ${t}` : ''}
                    </option>
                  );
                })}
              </select>
            </Field>
          ) : (
            <Field label="Passage or exercise" error={errors.topic} wide htmlFor="pf-topic">
              <input
                id="pf-topic"
                className="input"
                value={form.topic}
                onChange={set('topic')}
                placeholder={form.skill === 'reading' ? 'e.g. Matching headings — Cambridge 18 Test 2' : 'e.g. Map labelling — Section 2'}
                maxLength={200}
              />
            </Field>
          )}

          <Field
            label="Score (optional)"
            error={errors.correct || errors.total}
            hint={many ? 'Scores are per student — record one student at a time to add a score.' : undefined}
            wide
          >
            <div className="score">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={0}
                max={fixedTotal ?? 200}
                value={many ? '' : form.correct}
                onChange={set('correct')}
                placeholder="Correct"
                aria-label="Correct answers"
                disabled={many}
              />
              <span className="score__of">out of</span>
              {fixedTotal ? (
                <span className="score__total">{fixedTotal}</span>
              ) : (
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  value={many ? '' : form.total}
                  onChange={set('total')}
                  placeholder="Total"
                  aria-label="Total questions"
                  disabled={many}
                />
              )}
            </div>
          </Field>

          <Field label="Date" error={errors.lesson_date} htmlFor="pf-date">
            <input id="pf-date" className="input" type="date" value={form.lesson_date} onChange={set('lesson_date')} />
          </Field>
          <Field label="Time spent" error={errors.duration_minutes} wide>
            <div className="duration">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`chip ${Number(form.duration_minutes) === d ? 'is-active' : ''}`}
                  onClick={() => set('duration_minutes')(d)}
                >
                  {durationLabel(d)}
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
                  aria-label="Time spent in minutes"
                />
                <span className="muted-sm">min</span>
              </label>
            </div>
          </Field>
          <Field label="Notes (optional)" error={errors.notes} wide htmlFor="pf-notes">
            <textarea
              id="pf-notes"
              className="input input--area"
              rows={2}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Weak question types, feedback, homework…"
              maxLength={2000}
            />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
