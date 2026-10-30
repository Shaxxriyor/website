import { useState } from 'react';
import { avatarUrl } from '../lib/api.js';

// Placeholder avatar: initials on a soft colour chosen from the name (no external images).
const colours = ['var(--mint)', 'var(--peach)', 'var(--rose)', 'var(--lilac)', 'var(--sky)'];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Round avatar: the student's profile photo when they have one (`studentId` + `v`),
 * otherwise their initials on a soft colour.
 */
export function Avatar({ name, size = 28, ring = false, className = '', studentId = null, v = null }) {
  const [failed, setFailed] = useState(false);
  const src = studentId && v && !failed ? avatarUrl(studentId, v) : null;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, size < 32 ? 1 : 2)
    .toUpperCase();
  return (
    <span
      className={`avatar ${ring ? 'avatar--ring' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * (size < 32 ? 0.42 : 0.36)),
        background: colours[hash(name) % colours.length],
      }}
      title={name}
      aria-label={name}
      role="img"
    >
      {src ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials}
    </span>
  );
}

export function AvatarStack({ names, size = 26 }) {
  return (
    <span className="avatar-stack">
      {names.map((n) => (
        <Avatar key={n} name={n} size={size} ring />
      ))}
    </span>
  );
}
