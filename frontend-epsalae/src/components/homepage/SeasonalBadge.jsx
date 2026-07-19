// Reusable seasonal badge overlay component
// Colors chosen to meet WCAG AA contrast (4.5:1) against white badge text.
const SEASON_CONFIG = {
  dashain:  { emoji: '🎉', label: 'DASHAIN OFFER',  bg: '#B34500', text: '#fff' },
  tihar:    { emoji: '🪔', label: 'TIHAR SPECIAL',  bg: '#92400E', text: '#fff' },
  new_year: { emoji: '🎆', label: 'NEW YEAR DEAL',  bg: '#6D28D9', text: '#fff' },
  summer:   { emoji: '🌞', label: 'SUMMER SALE',    bg: '#0369A1', text: '#fff' },
  winter:   { emoji: '❄️', label: 'WINTER SALE',    bg: '#1D4ED8', text: '#fff' },
};

export default function SeasonalBadge({ season, label, color, size = 'sm', className = '' }) {
  const cfg = SEASON_CONFIG[season];
  const displayLabel = label || cfg?.label || 'SALE';
  const bgColor = color || cfg?.bg || '#047857';
  const textColor = cfg?.text || '#fff';

  const sizeClass = size === 'lg'
    ? 'text-[10px] sm:text-xs px-2.5 py-1'
    : 'text-[9px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full uppercase tracking-wide whitespace-nowrap ${sizeClass} ${className}`}
      style={{ background: bgColor, color: textColor }}
    >
      {cfg?.emoji && <span>{cfg.emoji}</span>}
      {displayLabel}
    </span>
  );
}
