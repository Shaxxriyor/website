import { useState } from 'react';
import { api } from '../../lib/api.js';
import { LEVELS, todayISO } from '../../lib/format.js';
import { Field, Segmented, Sheet } from './ui.jsx';

const EMPTY = {
  full_name: '',
  phone: '',
  email: '',
  group_name: '',
  level: 'B1',
  registered_at: todayISO(),
  status: 'active',
  notes: '',
};

/** Register a new student, or edit one when `student` is given. */
export function StudentForm({ student, groups = [], onClose, onSaved }) {
  const editing = Boolean(student);
  const [form, setForm] = useState(() => (editing ? { ...EMPTY, ...student } : { ...EMPTY, registered_at: todayISO() }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function submit() {
    const local = {};
    if (!form.full_name.trim()) local.full_name = 'Required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) local.email = 'Enter a valid email';
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const data = { ...form };
      delete data.id;
      if (editing) {
        await api.updateStudent(student.id, data);
        onSaved(student.id);
      } else {
        const { id, access_code } = await api.createStudent(data);
        onSaved(id, access_code, form.full_name.trim());
      }
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={editing ? 'Edit student' : 'Register student'}
      subtitle={editing ? student.full_name : 'They’ll appear in your students list right away.'}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          {message && <span className="sheet__error">{message}</span>}
          <button type="button" className="btn btn--glass" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--dark" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Register'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Full name" error={errors.full_name} wide htmlFor="sf-name">
          <input
            id="sf-name"
            className="input"
            value={form.full_name}
            onChange={set('full_name')}
            placeholder="e.g. Malika Rahimova"
            autoComplete="off"
            maxLength={120}
          />
        </Field>
        <Field label="Phone number" error={errors.phone} htmlFor="sf-phone">
          <input
            id="sf-phone"
            className="input"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+998 90 123 45 67"
            maxLength={40}
          />
        </Field>
        <Field label="Email" error={errors.email} htmlFor="sf-email">
          <input
            id="sf-email"
            className="input"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="name@example.com"
            maxLength={160}
          />
        </Field>
        <Field label="Group / class" error={errors.group_name} hint="Pick an existing group or type a new one" htmlFor="sf-group">
          <input
            id="sf-group"
            className="input"
            list="sf-groups"
            value={form.group_name}
            onChange={set('group_name')}
            placeholder="e.g. IELTS-7A"
            maxLength={80}
          />
          <datalist id="sf-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Field>
        <Field label="Registration date" error={errors.registered_at} htmlFor="sf-date">
          <input id="sf-date" className="input" type="date" value={form.registered_at} onChange={set('registered_at')} />
        </Field>
        <Field label="English level" error={errors.level} wide>
          <Segmented
            label="English level"
            value={form.level}
            onChange={set('level')}
            options={LEVELS.map((l) => ({ value: l.id, label: l.label, title: l.name }))}
          />
          <span className="field__hint">{LEVELS.find((l) => l.id === form.level)?.name}</span>
        </Field>
        <Field label="Status" error={errors.status} wide>
          <Segmented
            label="Status"
            value={form.status}
            onChange={set('status')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Field>
        <Field label="Notes (optional)" error={errors.notes} wide htmlFor="sf-notes">
          <textarea
            id="sf-notes"
            className="input input--area"
            rows={2}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Target band, exam date, anything useful…"
            maxLength={2000}
          />
        </Field>
      </div>
    </Sheet>
  );
}
