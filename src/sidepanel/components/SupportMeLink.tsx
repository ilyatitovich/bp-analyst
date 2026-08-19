import { SUPPORT_PAGE_URL } from "../../lib/constants/support";

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
