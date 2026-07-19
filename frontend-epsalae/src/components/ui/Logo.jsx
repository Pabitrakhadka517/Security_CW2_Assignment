/**
 * ePasaley brand mark — a shopping bag with a checkmark, standing for
 * "verified/secure shopping" rather than a generic cart glyph. Drawn at the
 * same 24x24 / stroke-based proportions as the lucide-react icon set used
 * everywhere else in the app so it sits naturally next to those icons.
 */
export function LogoMark({ className = 'w-5 h-5', strokeWidth = 1.8 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <path d="M6 9h12l-.94 11.06A2 2 0 0 1 15.07 22H8.93a2 2 0 0 1-1.99-1.94L6 9Z" />
      <path d="M9.5 13.8 11.3 15.6 14.8 11.2" />
    </svg>
  );
}

/**
 * Full lockup: gradient badge + LogoMark + "epasaley" wordmark. Used
 * anywhere the brand needs to be identifiable on its own (navbar, footer,
 * admin sidebar) rather than embedded inside a page-specific composition.
 */
export default function Logo({ badgeClassName = 'w-9 h-9', markClassName = 'w-4.5 h-4.5', textClassName = 'text-xl' }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex items-center justify-center rounded-xl bg-linear-to-br from-[#1E293B] to-[#047857] shrink-0 ${badgeClassName}`}>
        <LogoMark className={`${markClassName} text-white`} />
      </span>
      <span className={`font-bold tracking-tight ${textClassName}`}>
        epasal<span className="text-[#047857]">ey</span>
      </span>
    </span>
  );
}
