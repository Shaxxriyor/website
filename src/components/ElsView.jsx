import { useRef, useState } from 'react';
import { api, compressImage, photoUrl } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { els } from '../data/els.js';
import { BookIcon, CheckIcon, LockIcon, PlusIcon, TrashIcon, XIcon } from './Icons.jsx';
import { askToSignIn, isFreeDay } from '../lib/access.js';
import { Avatar } from './Avatar.jsx';
import { Sheet, Skeleton, useLoad } from './admin/ui.jsx';

const tones = ['lilac', 'mint', 'peach', 'rose'];

/** ELS Reading: 20 days of reading, book exercises and a notebook translation (uploaded as photos). */
export function ElsView({ me, admin, unlocked = false }) {
  const [openDay, setOpenDay] = useState(null);
  const [version, setVersion] = useState(0);
  const signedIn = Boolean(me || admin);
  const progress = useLoad(() => (signedIn ? api.elsProgress() : Promise.resolve(null)), [signedIn, version]);
  const mine = (me && progress.data?.progress?.[me.student.id]) || {};
  const doneCount = Object.keys(mine).length;
  const classCount = (day) =>
    Object.values(progress.data?.progress ?? {}).filter((days) => days[day]).length;

  return (
    <section className="marathon" aria-labelledby="els-title">
      <header className="marathon__head card-white">
        <span className="marathon__icon">
          <BookIcon size={22} />
        </span>
        <div className="marathon__intro">
          <h2 id="els-title" className="marathon__title">
            {els.title}
          </h2>
          <p className="muted-sm">
            Each day: read the text, do its exercises in the book, translate the text in your notebook and upload a photo.
          </p>
        </div>
        {me && (
          <div className="marathon__progress" aria-label={`${doneCount} of 20 days uploaded`}>
            <span className="marathon__count">
              {doneCount}
              <small>/20 days</small>
            </span>
            <span className="meter">
              <span style={{ width: `${(doneCount / 20) * 100}%` }} />
            </span>
          </div>
        )}
      </header>

      <ol className="day-grid">
        {els.days.map((d, i) => {
          const photos = mine[d.day];
          const others = classCount(d.day);
          const locked = !unlocked && !isFreeDay(d.day);
          return (
            <li key={d.day} className={`day-card tone-${tones[i % tones.length]} ${locked ? 'is-locked' : ''}`}>
              <button
                type="button"
                className="day-card__link"
                onClick={() => (locked ? askToSignIn(`ELS Reading · Day ${d.day}`) : setOpenDay(d.day))}
              >
                <span className="day-card__top">
                  <span className="day-card__label">Day</span>
                  {locked ? (
                    <span className="pill pill--glass day-card__status">
                      <LockIcon size={12} /> Students
                    </span>
                  ) : !signedIn ? (
                    <span className="pill pill--glass day-card__status">Free</span>
                  ) : null}
                  {photos && (
                    <span className="pill pill--glass day-card__status">
                      <CheckIcon size={12} /> Uploaded
                    </span>
                  )}
                </span>
                <span className="day-card__num">{String(d.day).padStart(2, '0')}</span>
                <span className="day-card__meta">
                  <span className="day-card__name">{d.title}</span>
                  {signedIn ? `${others} ${others === 1 ? 'student' : 'students'} uploaded` : 'Read · exercises · translate'}
                </span>
                <span className="day-card__go" aria-hidden="true">
                  {locked ? <LockIcon size={15} /> : '→'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {openDay && (
        <ElsDaySheet
          day={els.days[openDay - 1]}
          me={me}
          admin={admin}
          onClose={() => setOpenDay(null)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
    </section>
  );
}

function ElsDaySheet({ day, me, admin, onClose, onChanged }) {
  const signedIn = Boolean(me || admin);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const input = useRef(null);
  const { data, loading } = useLoad(
    () => (signedIn ? api.elsDay(day.day) : Promise.resolve({ students: [] })),
    [day.day, signedIn, version],
  );
  const myId = me?.student.id;
  const mine = data?.students.find((s) => s.student_id === myId);
  const others = (data?.students ?? []).filter((s) => s.student_id !== myId);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);

  async function upload(files) {
    setError('');
    const list = [...files].slice(0, 8);
    try {
      for (let i = 0; i < list.length; i++) {
        setBusy(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : 'Uploading…');
        await api.elsUpload(day.day, await compressImage(list[i]));
      }
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
    setBusy('');
    if (input.current) input.current.value = '';
  }

  async function remove(id) {
    await api.elsDelete(id).catch((err) => setError(err.message));
    setVersion((v) => v + 1);
    onChanged();
  }

  return (
    <Sheet
      title={`Day ${day.day} · ${day.title}`}
      subtitle={`ELS Reading — Upper-Intermediate passage ${day.passage} · book pages ${day.bookPage}–${day.bookPage + 1}`}
      size="xl"
      onClose={onClose}
    >
      <div className="els-book">
        <div className="seg-tabs" role="tablist" aria-label="Page">
          {[`Text · p. ${day.bookPage}`, `Exercises · p. ${day.bookPage + 1}`].map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={page === i}
              className={`chip ${page === i ? 'is-active' : ''}`}
              onClick={() => setPage(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="els-book__frame" title="Tap to zoom" onClick={() => setZoom(true)}>
          <img
            key={page}
            className="els-book__page"
            src={day.pages[page]}
            alt={page === 0 ? `${day.title} — text` : `${day.title} — exercises`}
            draggable={false}
          />
          <Watermark name={me?.student.full_name} />
        </button>
        {page === 0 && (
          <button type="button" className="btn btn--glass els-book__next" onClick={() => setPage(1)}>
            Next: exercises →
          </button>
        )}
      </div>

      <ol className="els-steps">
        <li>
          <b>Read the text</b> <span className="muted-sm">(the Text page above — tap it to zoom).</span>
        </li>
        <li>
          <b>Do the exercises</b> <span className="muted-sm">(both pages) in your notebook.</span>
        </li>
        <li>
          <b>Translate the text</b> <span className="muted-sm">into your notebook, by hand.</span>
        </li>
        <li>
          <b>Upload photos of your translation</b> <span className="muted-sm">— your classmates can see them.</span>
        </li>
      </ol>

      {!signedIn ? (
        <p className="els-note">Sign in with your code (right panel) to upload your translation and see your classmates’.</p>
      ) : (
        <>
          {me && (
          <div className="els-upload">
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files.length && upload(e.target.files)}
            />
            <button type="button" className="btn btn--dark" disabled={Boolean(busy)} onClick={() => input.current?.click()}>
              <PlusIcon size={16} /> {busy || (mine ? 'Add more photos' : 'Upload my translation')}
            </button>
            <span className="muted-sm">Take a clear photo of each notebook page. Up to 8 photos per day.</span>
            {error && <span className="field__error">{error}</span>}
          </div>
          )}

          {mine && (
            <>
              <h3 className="label els-h">My translation</h3>
              <div className="els-photos">
                {mine.photos.map((p) => (
                  <figure key={p.id} className="els-photo">
                    <button type="button" onClick={() => setViewing(p.id)} aria-label="Open photo">
                      <img src={photoUrl(p.id)} alt={`Day ${day.day} translation`} loading="lazy" />
                    </button>
                    <button type="button" className="els-photo__del" aria-label="Delete photo" onClick={() => remove(p.id)}>
                      <TrashIcon size={14} />
                    </button>
                  </figure>
                ))}
              </div>
            </>
          )}

          <h3 className="label els-h">{me ? 'Classmates’ translations' : 'Students’ translations'}</h3>
          {loading && !data ? (
            <Skeleton rows={2} />
          ) : others.length === 0 ? (
            <p className="muted-sm">Nobody else has uploaded Day {day.day} yet — be the first.</p>
          ) : (
            <div className="els-people">
              {others.map((s) => (
                <div key={s.student_id} className="els-person">
                  <div className="els-person__head">
                    <Avatar name={s.full_name} size={28} studentId={s.student_id} v={s.avatar_v} />
                    <strong>{s.full_name}</strong>
                    <span className="muted-sm">
                      {s.group_name ? `${s.group_name} · ` : ''}
                      {timeAgo(s.photos[0].created_at)}
                    </span>
                  </div>
                  <div className="els-photos">
                    {s.photos.map((p) => (
                      <figure key={p.id} className="els-photo">
                        <button type="button" onClick={() => setViewing(p.id)} aria-label={`Open ${s.full_name}'s photo`}>
                          <img src={photoUrl(p.id)} alt={`${s.full_name}'s translation`} loading="lazy" />
                        </button>
                        {admin && (
                          <button type="button" className="els-photo__del" aria-label="Delete photo" onClick={() => remove(p.id)}>
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewing && <PhotoViewer id={viewing} onClose={() => setViewing(null)} />}
      {zoom && <PhotoViewer src={day.pages[page]} name={me?.student.full_name} onClose={() => setZoom(false)} />}
    </Sheet>
  );
}

/** Full-size photo over everything; click anywhere or press Esc to close. */
export function PhotoViewer({ id, src, name, onClose }) {
  return (
    <div
      className="photo-viewer"
      role="dialog"
      aria-label="Photo"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <span className="photo-viewer__frame">
        <img src={src || photoUrl(id)} alt="" draggable={false} />
        {src && <Watermark name={name} />}
      </span>
      <button type="button" className="icon-btn photo-viewer__close" aria-label="Close">
        <XIcon size={18} />
      </button>
    </div>
  );
}

/** Faint repeated name over book pages, so screenshots can be traced. */
function Watermark({ name }) {
  const text = `${name ? `${name} · ` : ''}READING_CDI`.replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="170"><text x="16" y="100" transform="rotate(-24 150 85)" font-family="system-ui,sans-serif" font-size="14" fill="rgba(29,27,26,0.09)">${text}</text></svg>`;
  return (
    <span
      className="watermark"
      aria-hidden="true"
      style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")` }}
    />
  );
}
