/* eslint-disable react-refresh/only-export-components --
 * Every export in this file IS a component, but they are produced by the
 * `stroke()` / `filled()` factories below, and the rule's static analysis
 * cannot see through a call expression to prove that. Suppressing it here is
 * safe rather than a shortcut: icons are stateless and effectively frozen, so
 * the only cost is a full reload instead of a state-preserving refresh on the
 * rare occasion this file is edited.
 */

/**
 * Every shared icon in the app.
 *
 * Icons are hand-inlined rather than pulled from a package — the same
 * deliberate choice `ServiceIcon.jsx` and `tasks/taskUi.jsx` already make.
 * What was missing was a single home for them: `LogoIcon` alone was defined
 * verbatim in nine files, and `MailIcon`/`LockIcon`/`EyeIcon` and friends were
 * redeclared in every page that used them.
 *
 * The `stroke()` factory bakes in viewBox, stroke width, caps, joins and
 * `aria-hidden`, so those can never drift between call sites. Glyph paths are
 * carried over unchanged from the previous local definitions, so nothing moves
 * visually.
 *
 * This file exports components only — variant maps and other non-component
 * values live in `.js` siblings so react-refresh/only-export-components stays
 * happy.
 */

/* -------------------------------------------------------------------------- */
/* Factory                                                                     */
/* -------------------------------------------------------------------------- */

/** Builds a 24×24 stroked icon. `strokeWidth` 1.75 is the app-wide default. */
const stroke = (children, { strokeWidth = 1.75 } = {}) =>
  function StrokeIcon({ className = "h-5 w-5", ...rest }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };

/** Builds a filled icon. Star ratings and verification ticks use these. */
const filled = (children, viewBox = "0 0 24 24") =>
  function FilledIcon({ className = "h-5 w-5", ...rest }) {
    return (
      <svg
        className={className}
        viewBox={viewBox}
        fill="currentColor"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };

/* -------------------------------------------------------------------------- */
/* Form and input                                                              */
/* -------------------------------------------------------------------------- */

export const MailIcon = stroke(
  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
);

export const LockIcon = stroke(
  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
);

export const PhoneIcon = stroke(
  <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
);

export const UserIcon = stroke(
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
);

/** Password reveal toggle. `open` shows the struck-through variant. */
const EyeOpenIcon = stroke(
  <>
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </>,
);

const EyeClosedIcon = stroke(
  <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />,
);

export function EyeIcon({ open, className = "h-5 w-5", ...rest }) {
  const Glyph = open ? EyeOpenIcon : EyeClosedIcon;
  return <Glyph className={className} {...rest} />;
}

export const SearchIcon = stroke(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

/* -------------------------------------------------------------------------- */
/* Navigation and chrome                                                       */
/* -------------------------------------------------------------------------- */

export const MenuIcon = stroke(<path d="M4 6h16M4 12h16M4 18h16" />, {
  strokeWidth: 2,
});

export const XIcon = stroke(<path d="M6 6l12 12M18 6L6 18" />, {
  strokeWidth: 2,
});

export const ArrowRightIcon = stroke(<path d="M14 5l7 7m0 0l-7 7m7-7H3" />, {
  strokeWidth: 2,
});

export const ArrowLeftIcon = stroke(<path d="M10 19l-7-7m0 0l7-7m-7 7h18" />, {
  strokeWidth: 2,
});

export const ChevronRightIcon = stroke(<path d="M9 5l7 7-7 7" />, {
  strokeWidth: 2,
});

export const ChevronDownIcon = stroke(<path d="M6 9l6 6 6-6" />, {
  strokeWidth: 2,
});

export const CheckIcon = stroke(<path d="M5 13l4 4L19 7" />, {
  strokeWidth: 2,
});

export const PlusIcon = stroke(<path d="M12 5v14M5 12h14" />, {
  strokeWidth: 2,
});

export const BellIcon = stroke(
  <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </>,
);

export const GridIcon = stroke(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);

export const ClipboardIcon = stroke(
  <>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </>,
);

export const UsersIcon = stroke(
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
);

export const ChatIcon = stroke(
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
);

export const CardIcon = stroke(
  <>
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <path d="M1 10h22" />
  </>,
);

export const StarOutlineIcon = stroke(
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
);

export const HelpIcon = stroke(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </>,
);

export const LogOutIcon = stroke(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </>,
);

/* -------------------------------------------------------------------------- */
/* Content and status                                                          */
/* -------------------------------------------------------------------------- */

export const MapPinIcon = stroke(
  <>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </>,
);

export const ClockIcon = stroke(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
);

export const CalendarIcon = stroke(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
);

export const ShieldIcon = stroke(
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);

export const InfoIcon = stroke(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
);

export const AlertIcon = stroke(
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);

export const CheckCircleIcon = stroke(
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4 12 14.01l-3-3" />
  </>,
);

export const TrashIcon = stroke(
  <>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </>,
);

export const PaperclipIcon = stroke(
  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
);

export const SendIcon = stroke(
  <>
    <path d="M22 2 11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </>,
);

/** Solid star, for ratings. Uses the 20×20 Heroicons path already in the app. */
export const StarIcon = filled(
  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />,
  "0 0 20 20",
);

/** Solid verification tick, as used on worker cards. */
export const VerifiedIcon = filled(
  <path d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />,
);

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The SewaSathi mark — two hands cradling a heart.
 *
 * Was defined verbatim in nine files (User/Header, User/Sidebar, User/Footer,
 * Admin/AdminSidebar, Worker/WorkerSidebar, Login, SignupOption, UserSignup,
 * WorkerSignup). The stroke colour is a prop because the navy shells draw it
 * white while light surfaces draw it in the brand blue.
 */
export function LogoIcon({ size = 22, className = "", color = "white" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
