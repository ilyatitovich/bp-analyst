import { SupportContact } from "./SupportContact";

export function ExtractionHelpCard() {
  return (
    <section className="panel-card support-card" role="status">
      <h3>Couldn't read tracks from this page</h3>
      <p>
        If this is a chart, search, or release list, Beatport may have changed
        their layout. Email me or open a GitHub issue so I can update the
        extension:
      </p>
      <SupportContact />
    </section>
  );
}
