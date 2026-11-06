import type { Bucket } from '../../lib/analysis/stats'
import { cx } from '../../lib/utils/cx'
import { formatShare } from '../../lib/utils/format'

export type ConcentrationItem = Bucket & {
  /** Filter value when display label differs (e.g. scale vs Camelot). */
  value?: string
}

export interface ConcentrationGroupProps {
  title: string
  share: number | null
  items: ConcentrationItem[]
  selected?: Set<string>
  onToggle?: (value: string) => void
}

function itemValue(item: ConcentrationItem): string {
  return item.value ?? item.label
}

export function ConcentrationGroup({
  title,
  share,
  items,
  selected,
  onToggle
}: ConcentrationGroupProps) {
  if (!items.length) return null

  const filterable = Boolean(onToggle)

  return (
    <div>
      <p className="brief-group-label brief-group-heading">
        <span>{title}</span>
        <strong className="brief-group-share">{formatShare(share)}</strong>
      </p>
      <div className="brief-chips">
        {items.map(item => {
          const value = itemValue(item)
          const isSelected = selected?.has(value) ?? false

          if (!filterable) {
            return (
              <span className="brief-chip brief-chip-static" key={value}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </span>
            )
          }

          return (
            <button
              key={value}
              type="button"
              className={cx('brief-chip', isSelected && 'selected')}
              aria-pressed={isSelected}
              disabled={item.count === 0 && !isSelected}
              onClick={() => onToggle?.(value)}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          )
        })}
      </div>
    </div>
  )
}
