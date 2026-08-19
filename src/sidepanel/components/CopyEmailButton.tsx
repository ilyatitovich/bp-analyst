import { useCallback, useEffect, useRef, useState } from "react";
import { SUPPORT_EMAIL } from "../../lib/constants/support";
import { copyTextToClipboard } from "../../lib/utils/clipboard";

export function CopyEmailButton() {
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
      await copyTextToClipboard(SUPPORT_EMAIL);
      setCopied(true);
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <div className="support-email-row">
      <span className="support-email">
        <a className="support-email-link" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </span>
      <button
        type="button"
        className="copy-email-btn"
        onClick={() => void copy()}
        aria-label={copied ? "Email copied" : `Copy ${SUPPORT_EMAIL}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
