import { useCallback, useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "../../lib/utils/clipboard";

export const SUPPORT_EMAIL = "ilyatitovdev@gmail.com";

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const copy = useCallback(async () => {
    try {
      await copyTextToClipboard(email);
      setCopied(true);
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [email]);

  return (
    <div className="support-email-row">
      <span className="support-email">
        <a className="support-email-link" href={`mailto:${email}`}>
          {email}
        </a>
      </span>
      <button
        type="button"
        className="copy-email-btn"
        onClick={() => void copy()}
        aria-label={copied ? "Email copied" : `Copy ${email}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ExtractionHelpCard() {
  return (
    <section className="panel-card support-card" role="status">
      <h3>Couldn't read tracks from this page</h3>
      <p>
        If this is a chart, search, or release list, Beatport may have changed
        their layout. Email me so I can update the extension:
      </p>
      <CopyEmailButton email={SUPPORT_EMAIL} />
    </section>
  );
}
