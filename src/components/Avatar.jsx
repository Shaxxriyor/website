// Placeholder avatar: deterministic gradient + initials (no external images).
const palettes = [
  ['#f6c6a8', '#d98b6a'],
  ['#c9c3f5', '#8c82e0'],
  ['#b6ebd3', '#5fbf97'],
  ['#f4b9b4', '#df7b74'],
  ['#f9d8ac', '#e3a75a'],
  ['#c4dcf7', '#6f9fd8'],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, size = 28, ring = false, className = '' }) {
  const [a, b] = palettes[hash(name) % palettes.length];
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
        background: `linear-gradient(140deg, ${a}, ${b})`,
      }}
      title={name}
      aria-label={name}
      role="img"
    >
      {initials}
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
