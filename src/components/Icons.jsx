// Stroke icon set (24×24, 1.75 stroke) — consistent weight across the UI.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const make = (paths) =>
  function Icon({ size = 20, ...props }) {
    return (
      <svg {...base} width={size} height={size} {...props}>
        {paths}
      </svg>
    );
  };

export const LogoMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <path d="M6 3h10.5L12 11.5h9L9 25l3-10H5.5z" fill="currentColor" />
  </svg>
);

export const HomeIcon = make(
  <>
    <path d="M3.5 10.5 12 3.8l8.5 6.7" />
    <path d="M5.5 9v10.2a1.3 1.3 0 0 0 1.3 1.3h10.4a1.3 1.3 0 0 0 1.3-1.3V9" />
  </>
);

export const CalendarIcon = make(
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="4" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>
);

export const BookIcon = make(
  <>
    <path d="M12 6.5C10 5 7.2 4.5 3.5 4.8v13.7c3.7-.3 6.5.2 8.5 1.7 2-1.5 4.8-2 8.5-1.7V4.8C16.8 4.5 14 5 12 6.5Z" />
    <path d="M12 6.5v13.7" />
  </>
);

export const GridIcon = make(
  <>
    <rect x="4" y="4" width="6.5" height="6.5" rx="2.2" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="2.2" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="2.2" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2.2" />
  </>
);

export const BasketIcon = make(
  <>
    <path d="M3.5 9.5h17l-1.6 9a2 2 0 0 1-2 1.6H7.1a2 2 0 0 1-2-1.6Z" />
    <path d="m8 9.5 3-5.5M16 9.5 13 4M9.5 13.5v3M14.5 13.5v3" />
  </>
);

export const SettingsIcon = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1.1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </>
);

export const BellIcon = make(
  <>
    <path d="M6 9.5a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15.5 6 9.5Z" />
    <path d="M10.3 20.5a2 2 0 0 0 3.4 0" />
  </>
);

export const UserCircleIcon = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.7 18.6a6 6 0 0 1 10.6 0" />
  </>
);

export const ChevronRight = make(<path d="m9.5 6 6 6-6 6" />);
export const ChevronDown = make(<path d="m6 9.5 6 6 6-6" />);
export const ArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);

export const StarIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="m12 3.2 2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8Z"
      fill="#f5a524"
      stroke="#f5a524"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlayIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" />
  </svg>
);

// Category glyphs
export const ReadingIcon = make(
  <>
    <rect x="4" y="3.5" width="16" height="17" rx="3" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </>
);

export const ListeningIcon = make(
  <>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3.5" y="13.5" width="4" height="6.5" rx="1.8" />
    <rect x="16.5" y="13.5" width="4" height="6.5" rx="1.8" />
  </>
);

export const ReadingMarathonIcon = make(
  <>
    <path d="M5 21V4" />
    <path d="M5 4.5h11.5l-2.5 4 2.5 4H5" />
  </>
);

export const ListeningMarathonIcon = make(
  <>
    <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
  </>
);

export const DownloadIcon = make(
  <>
    <path d="M12 4v11M7 10.5l5 5 5-5" />
    <path d="M5 19.5h14" />
  </>
);

export const CheckIcon = make(<path d="m5 12.5 4.5 4.5L19 7.5" />);

export const VocabularyIcon = make(
  <>
    <path d="M4 6.5 12 3l8 3.5-8 3.5Z" />
    <path d="M4 6.5v6L12 16l8-3.5v-6" />
    <path d="M4 17.5 12 21l8-3.5" />
  </>
);

export const MockTestIcon = make(
  <>
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8Z" />
    <path d="M4 8l8 4.5L20 8M12 12.5v8" />
  </>
);

export const SparkleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.5c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z"
      fill="currentColor"
    />
  </svg>
);
