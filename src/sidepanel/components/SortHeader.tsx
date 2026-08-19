import type { TrackSort, TrackSortColumn } from "../../lib/analysis/filters";

export interface SortHeaderProps {
  column: TrackSortColumn;
  label: string;
  sort: TrackSort;
  onSort: (column: TrackSortColumn) => void;
}

export function SortHeader({ column, label, sort, onSort }: SortHeaderProps) {
  const active = sort.column === column;
  const ariaSort = active
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  const sortLabel = column === "position" ? "position" : label.toLowerCase();
  const ariaLabel = active
    ? `Sorted by ${sortLabel}, ${sort.direction === "asc" ? "ascending" : "descending"}`
    : `Sort by ${sortLabel}`;

  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className={`sort-btn${active ? " active" : ""}`}
        onClick={() => onSort(column)}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {active ? (sort.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}
