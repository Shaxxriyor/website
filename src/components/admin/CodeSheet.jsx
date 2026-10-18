import { useState } from 'react';
import { formatCode } from '../../lib/format.js';
import { CheckIcon } from '../Icons.jsx';
import { Sheet } from './ui.jsx';

/** Shown right after registering: the student's sign-in code and a message to send them. */
export function CodeSheet({ name, code, onClose, onOpenProfile }) {
  const [copied, setCopied] = useState('');
  const first = name.split(' ')[0];
  const pretty = formatCode(code);
  const site = window.location.origin;
  const message = `Hi ${first}! Your READING_CDI code is ${pretty}.\nOpen ${site}, enter the code under “Save your progress”, and every marathon day you do will be saved automatically.`;

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* clipboard blocked: the code is selectable */
    }
  }

  return (
    <Sheet
      title={`${first} is registered`}
      subtitle="Send them this code so their progress is saved automatically."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--glass" onClick={onOpenProfile}>
            Open profile
          </button>
          <button type="button" className="btn btn--dark" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="code-sheet">
        <code className="access__code access__code--lg">{pretty}</code>
        <div className="code-sheet__actions">
          <button type="button" className="btn btn--glass btn--sm" onClick={() => copy(pretty, 'code')}>
            {copied === 'code' ? (
              <>
                <CheckIcon size={14} /> Copied
              </>
            ) : (
              'Copy code'
            )}
          </button>
          <button type="button" className="btn btn--glass btn--sm" onClick={() => copy(message, 'message')}>
            {copied === 'message' ? (
              <>
                <CheckIcon size={14} /> Copied
              </>
            ) : (
              'Copy message for Telegram'
            )}
          </button>
        </div>
        <p className="code-sheet__preview">{message}</p>
        <p className="muted-sm">You can always find this code again on {first}’s profile.</p>
      </div>
    </Sheet>
  );
}
