import { useMemo, type ReactNode } from "react";
import { formatTrackKey, scaleToCamelot } from "../../lib/analysis/camelot";
import type { KeyNotation } from "../../lib/messaging/protocol";
import { CollapsiblePanel, FilterChips, StatCard, cx, selectionClassName } from "./ui";

type HistogramItem = { label: string; count: number };

export function ColumnHistogram({
  title,
  items,
  dense = false,
  formatLabel,
  headerExtra,
  selectedLabels,
  onToggle,
  leading,
}: {
  title: string;
  items: HistogramItem[];
  dense?: boolean;
  formatLabel?: (label: string) => string;
  headerExtra?: ReactNode;
  selectedLabels?: Set<string>;
  onToggle?: (label: string) => void;
  leading?: ReactNode;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const hasSelection = Boolean(selectedLabels?.size);

  return (
    <CollapsiblePanel title={title} headerExtra={headerExtra}>
      {leading}
      {items.length ? (
        <div
          className={`column-histogram${dense ? " column-histogram-dense" : ""}`}
        >
          {items.map((item) => {
            const selected = selectedLabels?.has(item.label) ?? false;
            const label = formatLabel ? formatLabel(item.label) : item.label;

            return (
              <button
                className={cx("hist-col", selectionClassName(selected, hasSelection))}
                disabled={!item.count || !onToggle}
                key={item.label}
                onClick={() => onToggle?.(item.label)}
                aria-pressed={selected}
                aria-label={
                  selected ? `Remove ${label} filter` : `Filter ${label}`
                }
                type="button"
              >
                <span className="hist-count">{item.count || ""}</span>
                <div className="hist-track">
                  <span className="hist-popup" aria-hidden="true">
                    {item.label.replace("-", "–")}
                  </span>
                  <div
                    className="hist-fill"
                    style={{ height: `${(item.count / max) * 100}%` }}
                  />
                </div>
                <span className="hist-label">{label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="muted">No data</p>
      )}
    </CollapsiblePanel>
  );
}

export function KeyHistogram({
  notation,
  onNotationChange,
  camelotItems,
  scaleItems,
  selectedKeys,
  onToggle,
  onReset,
  medianKey,
  modeKey,
}: {
  notation: KeyNotation;
  onNotationChange: (notation: KeyNotation) => void;
  camelotItems: HistogramItem[];
  scaleItems: HistogramItem[];
  selectedKeys: string[];
  onToggle: (camelot: string) => void;
  onReset: () => void;
  medianKey: string | null;
  modeKey: string | null;
}) {
  const selectedLabels = useMemo(() => {
    if (notation === "camelot") return new Set(selectedKeys);
    return new Set(
      selectedKeys.map(
        (key) => formatTrackKey(key, null, "scale") ?? key,
      ),
    );
  }, [notation, selectedKeys]);

  return (
    <ColumnHistogram
      title="Keys"
      dense
      items={notation === "camelot" ? camelotItems : scaleItems}
      selectedLabels={selectedLabels}
      onToggle={(label) => {
        const camelot =
          notation === "camelot" ? label : scaleToCamelot(label);
        if (camelot) onToggle(camelot);
      }}
      leading={
        <div className="panel-stats">
          <StatCard
            label="Median"
            value={formatTrackKey(medianKey, null, notation) ?? "-"}
          />
          <StatCard
            label="Mode"
            value={formatTrackKey(modeKey, null, notation) ?? "-"}
          />
        </div>
      }
      headerExtra={
        <>
          <FilterChips
            values={selectedKeys}
            formatValue={(key) =>
              formatTrackKey(key, null, notation) ?? key
            }
            onRemove={onToggle}
            onReset={onReset}
          />
          <div className="segmented" role="group" aria-label="Key notation">
            <button
              className={notation === "camelot" ? "active" : undefined}
              onClick={() => onNotationChange("camelot")}
              type="button"
            >
              Camelot
            </button>
            <button
              className={notation === "scale" ? "active" : undefined}
              onClick={() => onNotationChange("scale")}
              type="button"
            >
              Scale
            </button>
          </div>
        </>
      }
    />
  );
}

export function DistributionChart({
  title,
  items,
  selectedLabels,
  onToggle,
  onReset,
}: {
  title: string;
  items: HistogramItem[];
  selectedLabels: string[];
  onToggle: (label: string) => void;
  onReset: () => void;
}) {
  if (items.length <= 1) return null;
  const max = Math.max(1, ...items.map((item) => item.count));
  const selected = new Set(selectedLabels);
  const hasSelection = selected.size > 0;

  return (
    <CollapsiblePanel
      title={title}
      headerExtra={
        <FilterChips
          values={selectedLabels}
          onRemove={onToggle}
          onReset={onReset}
        />
      }
    >
      <div className="bars">
        {items.map((item) => {
          const isSelected = selected.has(item.label);
          return (
            <button
              className={cx("bar-row", selectionClassName(isSelected, hasSelection))}
              key={item.label}
              onClick={() => onToggle(item.label)}
              aria-pressed={isSelected}
              title={
                isSelected
                  ? `Remove ${item.label} filter`
                  : `Filter ${item.label}`
              }
              type="button"
            >
              <div className="bar-meta">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}

export function CountTable({
  title,
  nameHeader,
  items,
  selectedLabels,
  onToggle,
  onReset,
}: {
  title: string;
  nameHeader: string;
  items: HistogramItem[];
  selectedLabels: string[];
  onToggle: (label: string) => void;
  onReset: () => void;
}) {
  if (items.length <= 1) return null;
  const selected = new Set(selectedLabels);
  const hasSelection = selected.size > 0;

  return (
    <CollapsiblePanel
      title={title}
      headerExtra={
        <FilterChips
          values={selectedLabels}
          onRemove={onToggle}
          onReset={onReset}
        />
      }
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{nameHeader}</th>
              <th className="count-cell">Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = selected.has(item.label);
              return (
                <tr
                  className={cx(
                    "filter-row",
                    selectionClassName(isSelected, hasSelection),
                  )}
                  key={item.label}
                  onClick={() => onToggle(item.label)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggle(item.label);
                    }
                  }}
                  aria-pressed={isSelected}
                  role="button"
                  tabIndex={0}
                  title={
                    isSelected
                      ? `Remove ${item.label} filter`
                      : `Filter ${item.label}`
                  }
                >
                  <td>{item.label}</td>
                  <td className="count-cell">{item.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}
