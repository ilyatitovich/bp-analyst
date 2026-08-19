import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "./icons/CloseIcon";
import { HelpIcon } from "./icons/HelpIcon";
import { SupportContact } from "./SupportContact";
import { SupportMeLink } from "./SupportMeLink";

export function AboutHelpButton() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dialogId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="header-about-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        title="How to use & about"
        onClick={() => setOpen(true)}
      >
        <HelpIcon />
        <span className="visually-hidden">How to use and about</span>
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        className="about-dialog"
        closedby="any"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
      >
        <div className="about-dialog-panel">
          <div className="about-dialog-header">
            <div>
              <p className="eyebrow">Beatport Analyst</p>
              <h2 id={titleId} className="about-dialog-title">
                About
              </h2>
            </div>
            <button
              type="button"
              className="about-dialog-close"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="about-dialog-body">
            <p>
              A pocket market brief for the Beatport list you already have open.
              Built for producers doing reconnaissance — not crate digging, not
              harmonic mixing.
            </p>

            <h3>How to Use</h3>
            <ol className="about-steps">
              <li>
                Open a Beatport list — Top 100, a genre chart, search results, a
                label page, a release, anything with tracks in a row.
              </li>
              <li>
                Click the Beatport Analyst toolbar icon. The first open reloads
                the Beatport tab so we can read the catalog. That's expected,
                and only happens once until you hit Refresh.
              </li>
              <li>
                Click around. The brief stats and charts are filters — tap a BPM
                range, a label, Exclusive, last 7 days, whatever you want to
                zoom in on.
              </li>
              <li>
                Search the table, play a preview, then Export CSV or Download
                report when you want a copy of what's on screen.
              </li>
            </ol>
            <p>
              When Beatport's list changes, hit Refresh for a new snapshot. It
              won't update in the background.
            </p>

            <h3>What Stays Here</h3>
            <p>
              No Beatport account, no partner API, no backend. Track data never
              leaves this browser.
            </p>

            <h3>Say Hi</h3>
            <p>
              Something broken? Beatport redesigned a page? Idea for a feature?
              I'd genuinely like to know.
            </p>
            <SupportContact />

            <h3>Support the Project</h3>
            <p>
              If Beatport Analyst is saving you time, here are a few ways to say
              thanks — totally optional.
            </p>
            <SupportMeLink />
          </div>
        </div>
      </dialog>
    </>
  );
}
