import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'
import type { Bucket } from '../../../lib/analysis/stats'
import { cx, selectionClassName } from '../../../lib/utils/cx'
import { CollapsiblePanel } from '../ui/CollapsiblePanel'

const POPUP_GAP = 8
const POPUP_MARGIN = 8

interface HistogramPopup {
  text: string
  anchor: HTMLButtonElement
}

function anchorInView(anchor: HTMLElement): boolean {
  const scroller = anchor.closest('.column-histogram')
  if (!(scroller instanceof HTMLElement)) return true
  const anchorRect = anchor.getBoundingClientRect()
  const bounds = scroller.getBoundingClientRect()
  return (
    anchorRect.right > bounds.left + 1 && anchorRect.left < bounds.right - 1
  )
}

function placeHistogramPopup(popup: HTMLElement, anchor: HTMLElement): void {
  const anchorRect = anchor.getBoundingClientRect()
  const width = popup.offsetWidth
  const height = popup.offsetHeight
  const maxLeft = Math.max(
    POPUP_MARGIN,
    window.innerWidth - POPUP_MARGIN - width
  )
  const left = Math.min(
    Math.max(POPUP_MARGIN, anchorRect.left + anchorRect.width / 2 - width / 2),
    maxLeft
  )
  const aboveTop = anchorRect.top - POPUP_GAP - height
  const placement = aboveTop >= POPUP_MARGIN ? 'above' : 'below'
  const top = placement === 'above' ? aboveTop : anchorRect.bottom + POPUP_GAP

  popup.style.left = `${left}px`
  popup.style.top = `${top}px`
  popup.dataset.placement = placement
  popup.style.setProperty(
    '--hist-popup-arrow',
    `${anchorRect.left + anchorRect.width / 2 - left}px`
  )
}

export interface ColumnHistogramProps {
  title: string
  items: Bucket[]
  dense?: boolean
  formatLabel?: (label: string) => string
  headerExtra?: ReactNode
  selectedLabels?: Set<string>
  onToggle?: (label: string) => void
  leading?: ReactNode
}

function popupText(label: string): string {
  return label.replace('-', '–')
}

export function ColumnHistogram({
  title,
  items,
  dense = false,
  formatLabel,
  headerExtra,
  selectedLabels,
  onToggle,
  leading
}: ColumnHistogramProps) {
  const max = Math.max(1, ...items.map(item => item.count))
  const hasSelection = Boolean(selectedLabels?.size)
  const popupRef = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<HistogramPopup | null>(null)

  useLayoutEffect(() => {
    const element = popupRef.current
    if (!element) return

    if (!popup?.anchor.isConnected) {
      if (element.matches(':popover-open')) element.hidePopover()
      return
    }

    if (!element.matches(':popover-open')) element.showPopover()
    placeHistogramPopup(element, popup.anchor)
  }, [popup])

  useEffect(() => {
    if (!popup) return

    const sync = () => {
      const element = popupRef.current
      const anchor = popup.anchor
      if (!element || !anchor.isConnected || !anchorInView(anchor)) {
        setPopup(null)
        return
      }
      if (!element.matches(':popover-open')) element.showPopover()
      placeHistogramPopup(element, anchor)
    }

    document.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      document.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [popup])

  const showPopup = (anchor: HTMLButtonElement) => {
    const text = anchor.dataset.popup
    if (!text) return
    setPopup(current =>
      current?.anchor === anchor ? current : { text, anchor }
    )
  }

  const hidePopup = (event: ReactPointerEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setPopup(null)
  }

  const trackPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const anchor = hit?.closest('.hist-col')
    if (
      !(anchor instanceof HTMLButtonElement) ||
      !event.currentTarget.contains(anchor)
    ) {
      return
    }
    showPopup(anchor)
  }

  return (
    <CollapsiblePanel title={title} headerExtra={headerExtra}>
      {leading}
      {items.length ? (
        <div
          className={`column-histogram${dense ? ' column-histogram-dense' : ''}`}
          onPointerMove={trackPointer}
          onPointerLeave={hidePopup}
        >
          {items.map(item => {
            const selected = selectedLabels?.has(item.label) ?? false
            const label = formatLabel ? formatLabel(item.label) : item.label
            const inactive = !item.count || !onToggle

            return (
              <button
                className={cx(
                  'hist-col',
                  selectionClassName(selected, hasSelection)
                )}
                aria-disabled={inactive}
                tabIndex={inactive ? -1 : undefined}
                data-popup={popupText(item.label)}
                key={item.label}
                onClick={() => {
                  if (!inactive) onToggle(item.label)
                }}
                onFocus={event => showPopup(event.currentTarget)}
                onBlur={() => setPopup(null)}
                aria-pressed={selected}
                aria-label={
                  selected ? `Remove ${label} filter` : `Filter ${label}`
                }
                type="button"
              >
                <span className="hist-count">{item.count || ''}</span>
                <div className="hist-track">
                  <div
                    className="hist-fill"
                    style={{ height: `${(item.count / max) * 100}%` }}
                  />
                </div>
                <span className="hist-label">{label}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="muted">No data</p>
      )}
      <div
        ref={popupRef}
        className="hist-popup"
        popover="manual"
        role="tooltip"
        aria-hidden="true"
      >
        {popup?.text}
      </div>
    </CollapsiblePanel>
  )
}
