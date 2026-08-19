export interface SkipIconProps {
  direction: -1 | 1;
}

export function SkipIcon({ direction }: SkipIconProps) {
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
