import { cx } from "../../lib/utils/cx";

export interface BriefStatProps {
  label: string;
  value: string;
  hint: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function BriefStat({
  label,
  value,
  hint,
  pressed,
  disabled,
  onClick,
}: BriefStatProps) {
  const className = cx(
    "brief-stat",
    !onClick && "brief-stat-static",
    pressed && "selected",
  );

  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      <span className="brief-stat-popup">{hint}</span>
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button
      className={className}
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {body}
    </button>
  );
}
