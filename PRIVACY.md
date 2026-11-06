# Privacy Policy — BP Analyst

> **DRAFT FOR QUALIFIED LEGAL COUNSEL REVIEW**  
> This text is an analytical/implementation draft prepared during a compliance remediation pass. It is **not** licensed legal advice and is **not** a final counsel-approved policy. Replace placeholder controller details before relying on it.

**Last updated:** 2026-11-06

## Controller

**Controller:** Ilya Titov (individual), established in the EU/EEA.  
**Contact:** [ilyatitovdev@gmail.com](mailto:ilyatitovdev@gmail.com)  
**Postal address / Member State:** _[to be completed by the operator with counsel — GDPR Art. 13 requires identity and contact details]_  
**Supervisory authority:** _[competent DPA in the Member State of establishment — to be completed]_

BP Analyst is an independent project and is **not affiliated with Beatport or The Beatport Group LLC**.

## Scope

This notice covers:

1. The **browser extension** (Chrome / Edge / Firefox builds).
2. The **marketing website** (`https://bp-analyst.vercel.app` and successors).

## Extension — what data is handled

While you use the extension on Beatport list pages, it may temporarily hold on **your device**:

- Track metadata already shown or loaded by Beatport on that page (title, artists, mix name, BPM, key, label, genre, dates, price, exclusive/hype flags, ISRC when present, track URLs, preview sample URLs).
- Page context (page URL and title) to label the snapshot.
- Your UI preference for key notation (Camelot vs scale names).
- Short-lived panel/session flags needed to operate the side panel.

### How extension data is stored

- Live analysis snapshots use the browser’s **session** storage, keyed per Beatport tab. Closing the browser clears them.
- Key notation preference is stored in the browser’s **local** extension storage on your device.
- Nothing is synced through `chrome.storage.sync` or equivalent cloud sync APIs.
- The extension does **not** upload track snapshots to servers operated by the extension author.

### How extension data is used

- To build the side-panel market brief, charts, filters, and track table.
- To play Beatport’s own preview audio in the panel when you click play (requests go from your browser to Beatport media hosts).
- To export a CSV of the currently visible rows when you choose Export CSV (saved locally by your browser).

### Extension network activity

- Runs only on `*.beatport.com` (host permission).
- Does not call a Beatport partner API or any backend belonging to this project.
- Preview playback may request Beatport sample URLs already exposed on the page.

### Extension legal basis (preliminary draft)

Device-local processing to provide a tool you installed and requested. Where Member State law treats the publisher as a controller for on-device processing, the preliminary bases are **Art. 6(1)(b)** (steps requested by the user to provide the service) and/or **Art. 6(1)(f)** (legitimate interest in operating a local analysis tool with minimal data). Counsel should confirm.

## Marketing website

### Hosting

The site is hosted by **Vercel**. Server/CDN logs may include IP address, user agent, and request metadata for security and delivery. Preliminary basis: **Art. 6(1)(f)** legitimate interest in operating and securing the site.

### Analytics (non-essential)

If measurement IDs are configured, the site may use:

- **Google Analytics 4** (Google) — United States / global infrastructure.
- **Yandex Metrika** (Yandex) — Russian Federation / vendor infrastructure.

These tools can set cookies or similar identifiers and process IP address, device/browser data, and page interaction data (Metrika may include clickmap/link tracking when enabled).

**They do not load until you Accept analytics** in the cookie banner. You may Reject with equal ease, and reopen **Cookie settings** in the footer later. Consent preference is stored in `localStorage` under `bp-analyst-analytics-consent` (strictly necessary to remember your choice).

Preliminary basis for analytics: **Art. 6(1)(a) consent**, together with ePrivacy rules implementing Directive 2002/58/EC Art. 5(3).

International transfers to Google and/or Yandex require appropriate Chapter V safeguards (e.g. SCCs / vendor transfer tools). Details to be confirmed with counsel and linked vendor documentation.

See also the [Cookie Notice](https://bp-analyst.vercel.app/cookies) draft.

### What the site does **not** do

- It does not receive extension track snapshots.
- It does not create user accounts for BP Analyst.

## Sharing

Extension track snapshots are not sold or shared by the extension author.  
Website analytics data is processed by the vendors above only after consent.  
Hosting logs are processed by Vercel as a service provider.

## Retention

- Extension session snapshots: end of browser session / tab lifecycle.
- Key notation preference: until you clear extension data or uninstall.
- Consent preference: until you change it or clear site data.
- Analytics retention: per vendor configuration (to be documented when IDs are enabled).
- Support emails: as needed to respond, then deleted or minimized.

## Your rights (GDPR)

Depending on applicable law, you may have rights of access, rectification, erasure, restriction, portability, objection, and withdrawal of consent. Withdraw analytics consent via **Cookie settings** without affecting basic site use. To exercise other rights, email [ilyatitovdev@gmail.com](mailto:ilyatitovdev@gmail.com). You may lodge a complaint with your supervisory authority.

## Children

The product is aimed at adult music producers and is not directed to children.

## Changes

Material changes to storage or network behavior will update this policy and the “Last updated” date.

## Public copy

https://bp-analyst.vercel.app/privacy
