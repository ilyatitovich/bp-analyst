import { useCallback, useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "../../lib/utils/clipboard";

export const SUPPORT_EMAIL = "ilyatitovdev@gmail.com";
export const GITHUB_REPO_URL = "https://github.com/ilyatitovich/bp-analyst";
export const SUPPORT_PAGE_URL = "https://ilyatitov.vercel.app/support";

export function CopyEmailButton({ email }: { email: string }) {
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

export function SupportMeLink() {
  return (
    <a
      className="support-page-link"
      href={SUPPORT_PAGE_URL}
      target="_blank"
      rel="noreferrer"
    >
      Support the project
    </a>
  );
}

export function SupportContact() {
  return (
    <div className="support-contact">
      <CopyEmailButton email={SUPPORT_EMAIL} />
      <a
        className="support-github-link"
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noreferrer"
      >
        github.com/ilyatitovich/bp-analyst
      </a>
    </div>
  );
}
