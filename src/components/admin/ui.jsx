import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '../Icons.jsx';

/** Fetch-on-mount helper: re-runs when `deps` change. */
export function useLoad(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run };
}

/** iOS-style glass sheet. Closes on Escape or backdrop click. */
export function Sheet({ title, subtitle, onClose, children, footer, size = 'md', onSubmit }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Runs once per opening: focus the first field, wire Escape, restore focus on close.
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('has-sheet');
    // Skip on touch screens so the keyboard doesn't pop up over the sheet.
    if (window.matchMedia('(pointer: fine)').matches) {
      ref.current?.querySelector('input:not([type=hidden]), select, textarea')?.focus({ preventScroll: true });
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-sheet');
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  const Tag = onSubmit ? 'form' : 'div';
  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Tag
        ref={ref}
        className={`sheet sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={
          onSubmit &&
          ((e) => {
            e.preventDefault();
            onSubmit();
          })
        }
        noValidate
      >
        <header className="sheet__head">
          <div>
            <h2 id={titleId} className="sheet__title">
              {title}
            </h2>
            {subtitle && <p className="muted-sm">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn icon-btn--ghost" aria-label="Close" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </Tag>
    </div>,
    document.body,
  );
}

export function Field({ label, error, hint, children, wide = false, htmlFor }) {
  return (
    <div className={`field ${wide ? 'field--wide' : ''} ${error ? 'has-error' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

/** Segmented control (iOS style) with a thumb that slides to the chosen option. */
export function Segmented({ options, value, onChange, label }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current?.querySelector('.segmented__opt.is-active');
    if (!el) return setThumb(null);
    const place = () => setThumb({ x: el.offsetLeft, w: el.offsetWidth });
    place();
    const ro = new ResizeObserver(place);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div ref={ref} className={`segmented ${thumb ? 'has-thumb' : ''}`} role="radiogroup" aria-label={label}>
      {thumb && (
        <span className="segmented__thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} aria-hidden="true" />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented__opt ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ConfirmSheet({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--glass" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="sheet__message">{message}</p>
    </Sheet>
  );
}

export function StatusPill({ status }) {
  return (
    <span className={`status status--${status}`}>
      <i />
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty card-white">
      {Icon && (
        <span className="empty__icon">
          <Icon size={22} />
        </span>
      )}
      <h3 className="empty__title">{title}</h3>
      {children && <p className="muted-sm">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="error-note card-white" role="alert">
      <span>{error?.message || 'Something went wrong.'}</span>
      {onRetry && (
        <button className="btn btn--glass btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}
