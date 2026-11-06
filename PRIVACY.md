# Privacy Policy — Beatport Analyst

**Last updated:** 2026-11-06

Beatport Analyst is a local browser extension. It does not collect accounts, telemetry, or analytics from the extension itself, and it does not send Beatport track data to any server operated by the extension author.

## What data the extension handles

While you use it on Beatport list pages, the extension may temporarily hold:

- Track metadata already shown or loaded by Beatport on that page (title, artists, mix name, BPM, key, label, genre, dates, exclusive/hype flags, and preview sample URLs).
- Page context needed to label the snapshot (page URL and title).
- Your UI preference for key notation (Camelot vs scale names).

## How data is stored

- Live analysis snapshots live in the browser’s **session** storage, keyed per Beatport tab. Closing the browser clears them.
- Key notation preference is stored in the browser’s **local** extension storage on your device.
- Nothing is synced through `chrome.storage.sync` or equivalent cloud sync APIs.

## How data is used

- To build the side-panel market brief, charts, filters, and track table.
- To play Beatport’s own preview audio in the panel when you click play.
- To export a CSV of the currently visible rows when you choose Export CSV (the file is saved locally by your browser).

## Network activity

- The extension runs only on `*.beatport.com`.
- It does not call a Beatport partner API or any backend belonging to this project.
- Preview playback may request Beatport media URLs that Beatport already exposes for that track. Those requests go from your browser to Beatport’s hosts, not through an intermediary controlled by this extension.

## Third-party services

The extension package itself does not embed analytics, crash reporting, or advertising SDKs.

The separate marketing website (`bp-analyst.vercel.app`) may load analytics only when the site operator configures measurement IDs. That site analytics is independent of the extension and does not receive extension track snapshots.

## Data sharing

Track snapshots are not uploaded, sold, or shared with third parties by the extension.

## Retention and deletion

- Session snapshots end when the tab closes or the browser session ends.
- Clear the extension’s data (or uninstall it) to remove local preferences.

## Changes

If storage or network behavior changes in a way that affects privacy, this policy will be updated and the “Last updated” date revised.

## Contact

Privacy questions: [ilyatitovdev@gmail.com](mailto:ilyatitovdev@gmail.com)

Public copy of this policy: [https://bp-analyst.vercel.app/privacy](https://bp-analyst.vercel.app/privacy)
