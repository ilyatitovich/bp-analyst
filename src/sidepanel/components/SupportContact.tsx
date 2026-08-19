import { GITHUB_REPO_URL } from "../../lib/constants/support";
import { CopyEmailButton } from "./CopyEmailButton";

export function SupportContact() {
  return (
    <div className="support-contact">
      <CopyEmailButton />
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
