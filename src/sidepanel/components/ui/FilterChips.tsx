export interface FilterChipsProps {
  values: string[];
  formatValue?: (value: string) => string;
  onRemove: (value: string) => void;
  onReset: () => void;
}

export function FilterChips({
  values,
  formatValue,
  onRemove,
  onReset,
}: FilterChipsProps) {
  if (!values.length) return null;
  const visible = values.slice(0, 3);
  const hiddenCount = values.length - visible.length;

  return (
    <div className="filter-summary">
      <div className="filter-chips">
        {visible.map((value) => {
          const label = formatValue ? formatValue(value) : value;
          return (
            <button
              key={value}
              type="button"
              className="filter-chip"
              onClick={() => onRemove(value)}
              aria-label={`Remove ${label} filter`}
            >
              <span className="filter-chip-label">{label}</span>
              <span aria-hidden="true">×</span>
            </button>
          );
        })}
        {hiddenCount > 0 ? (
          <span className="filter-chip filter-chip-static">+{hiddenCount}</span>
        ) : null}
      </div>
      <span
        className="filter-count"
        aria-label={`${values.length} filter${values.length === 1 ? "" : "s"} selected`}
      >
        {values.length}
      </span>
      <button className="filter-reset" onClick={onReset} type="button">
        Reset
      </button>
    </div>
  );
}
