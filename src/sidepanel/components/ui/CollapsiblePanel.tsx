import { useCallback, useId, useState, type ReactNode } from "react";
import { AccordionChevron } from "../icons/AccordionChevron";

export interface CollapsiblePanelProps {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsiblePanel({
  title,
  headerExtra,
  children,
  defaultOpen = true,
}: CollapsiblePanelProps) {
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
