// أيقونات خفيفة مرسومة داخل الكود (بدون مكتبات)
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

export function ChatIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z" />
      <path d="M9.2 8.6c.2-.5.6-.6.9-.6h.4c.2 0 .4.1.5.4l.6 1.4c.1.3 0 .5-.1.7l-.5.6c.5 1 1.3 1.8 2.3 2.3l.6-.5c.2-.2.5-.2.7-.1l1.4.6c.3.1.4.3.4.5v.4c0 .4-.2.7-.6.9-.9.4-2.2.2-3.7-.8a9 9 0 0 1-2.4-2.4c-1-1.5-1.2-2.8-.5-3.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  );
}

export function PinIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function AreaIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9h5V4" />
    </svg>
  );
}

export function BedIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 18V6" />
      <path d="M3 14h18v4" />
      <path d="M21 14v-2.5a2.5 2.5 0 0 0-2.5-2.5H11v5" />
      <path d="M6 11h3" />
    </svg>
  );
}

export function BathIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16v2.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 14.5z" />
      <path d="M7 12V6.5A2.5 2.5 0 0 1 9.5 4c1 0 1.8.6 2.2 1.4" />
      <path d="M7 19l-1 2M17 19l1 2" />
    </svg>
  );
}

export function RoadIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3L5 21M16 3l3 18M12 4v2.5M12 10.5v3M12 17.5V20" />
    </svg>
  );
}

export function CompassIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z" />
    </svg>
  );
}

export function HouseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function BuildingIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3" width="10" height="18" rx="1.5" />
      <path d="M14 9h4.5a1.5 1.5 0 0 1 1.5 1.5V21H14" />
      <path d="M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1M17 13h.5M17 17h.5" />
    </svg>
  );
}

export function LandIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17l5-3 4 2 4-3 5 3" />
      <path d="M3 21h18" />
      <path d="M12 3v8M12 3l5 2-5 2" />
    </svg>
  );
}

export function ChevronIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ShareIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="M8.3 10.8l6.4-3.6M8.3 13.2l6.4 3.6" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

export function StoreIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v10h16V10" />
      <path d="M3 10l1.5-5h15L21 10z" />
      <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }) {
  return (
    <svg {...base} {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function SlidersIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

export function MapIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}

export function ExpandIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function InboxIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13.5l2.2-7.2A2 2 0 018.1 5h7.8a2 2 0 011.9 1.3l2.2 7.2V18a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
      <path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.8 12a1.5 1.5 0 001.5 1.4h6.4a1.5 1.5 0 001.5-1.4l.8-12" />
    </svg>
  );
}

export function LinkIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
    </svg>
  );
}

export function CopyIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" />
    </svg>
  );
}

export const TYPE_ICON = { villa: HouseIcon, apartment: BuildingIcon, land: LandIcon, other: StoreIcon };
