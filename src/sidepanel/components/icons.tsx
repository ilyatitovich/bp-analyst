export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M5 3.2v9.6L13 8 5 3.2z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 3h3v10H4V3zm5 0h3v10H9V3z" fill="currentColor" />
    </svg>
  );
}

export function SkipIcon({ direction }: { direction: -1 | 1 }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      style={direction === -1 ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M3 3h2v10H3V3zm3 0l8 5-8 5V3z" fill="currentColor" />
    </svg>
  );
}

export function AccordionChevron() {
  return (
    <svg
      className="accordion-chevron-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
