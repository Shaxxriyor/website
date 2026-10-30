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

// READING_CDI mark: laptop outline with an "R" and a checklist (one red tick).
export const LogoMark = ({ size = 36 }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 64 48" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
      <path d="M8.5 33V5.5h45a3 3 0 0 1 3 3V33" />
      <path d="M15.5 37V9.5H24a7 7 0 0 1 0 14h-8.5" />
      <path d="m22 23.5 9.5 13.5" strokeLinecap="square" />
    </g>
    <path d="M2 36h60c0 2.4-1.9 4-4.2 4H6.2C3.9 40 2 38.4 2 36Z" fill="currentColor" />
    <g fill="none" stroke="#b9b6b3" strokeWidth="1.6">
      <rect x="35" y="10" width="4.5" height="4.5" rx="0.8" />
      <rect x="35" y="25" width="4.5" height="4.5" rx="0.8" />
      <path d="M42.5 12.25h7.5M42.5 19.75h7.5M42.5 27.25h7.5" strokeLinecap="round" />
    </g>
    <rect x="34.6" y="17.1" width="5.3" height="5.3" rx="1" fill="var(--brand-red, #d6282f)" />
    <path d="m35.9 19.8 1.2 1.2 1.9-2.2" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Wordmark = () => (
  <span className="wordmark">
    READING<span className="wordmark__us">_</span>CDI
  </span>
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

/** The signature: the red tick box from the READING_CDI logo, for a finished day, a known card or a saved score. */
export const Tick = ({ size = 14, label }) => (
  <svg className="tick" width={size} height={size} viewBox="0 0 16 16" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <rect width="16" height="16" rx="3" fill="var(--accent)" />
    <path d="m4.4 8.3 2.3 2.3 4.9-5.2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpeakerIcon = make(
  <>
    <path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3Z" />
    <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 7a7 7 0 0 1 0 10" />
  </>
);

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

// Student management
export const UsersIcon = make(
  <>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </>
);

export const LessonIcon = make(
  <>
    <rect x="5" y="4" width="14" height="17" rx="3" />
    <path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6" />
  </>
);

export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const XIcon = make(<path d="M6 6l12 12M18 6 6 18" />);
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </>
);
export const LogoutIcon = make(
  <>
    <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </>
);
export const TrashIcon = make(
  <>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12" />
  </>
);
export const EditIcon = make(
  <>
    <path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    <path d="M13.5 6.5l3 3" />
  </>
);
export const PhoneIcon = make(
  <path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />
);
export const MailIcon = make(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </>
);
export const ArrowLeft = make(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const ClockIcon = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
);

export const TrophyIcon = make(
  <>
    <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
    <path d="M8 5.5H5a2.5 2.5 0 0 0 3 3.5M16 5.5h3a2.5 2.5 0 0 1-3 3.5" />
    <path d="M12 13v3.5M8.5 20h7M10 16.5h4l.5 3.5h-5Z" />
  </>
);

export const CameraIcon = make(
  <>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </>
);

export const LockIcon = make(
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </>
);
