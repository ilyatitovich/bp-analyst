import { useCallback, useId, useState, type ReactNode } from "react";
import { AccordionChevron } from "./icons";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function selectionClassName(selected: boolean, hasSelection: boolean): string {
  return cx(selected && "selected", hasSelection && !selected && "dimmed");
}

export function CollapsiblePanel({
  title,
  headerExtra,
  children,
  defaultOpen = true,
}: {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `${useId()}-content`;

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  return (
    <section className={`panel-card accordion-card${open ? "" : " collapsed"}`}>
      <div className="accordion-header">
        <button
          type="button"
          className="accordion-trigger"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
        >
          <h3>{title}</h3>
        </button>
        {headerExtra}
        <button
          type="button"
          className={`accordion-chevron${open ? " open" : ""}`}
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          onClick={toggle}
        >
          <AccordionChevron />
        </button>
      </div>
      <div
        className={`accordion-body${open ? " open" : ""}`}
        id={contentId}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="accordion-body-inner">{children}</div>
      </div>
    </section>
  );
}

export function FilterChips({
  values,
  formatValue,
  onRemove,
  onReset,
}: {
  values: string[];
  formatValue?: (value: string) => string;
  onRemove: (value: string) => void;
  onReset: () => void;
}) {
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

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
