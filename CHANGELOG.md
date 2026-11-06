# Changelog

All notable changes to BP Analyst are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Public brand name renamed from “Beatport Analyst” to **BP Analyst** (repo `bp-analyst`, domain, zip/store slugs, and extension storage keys unchanged).

### Added

- `ARCHITECTURE.md` with runtime diagram and ADRs for MAIN-world capture, per-tab session storage, and reload-as-fallback.
- Repository `LICENSE` (ISC), `CHANGELOG.md`, and `PRIVACY.md`, plus a marketing-site `/privacy` page for store listings.
- README screenshots of the side panel and a Limitations section.
- Tag release workflow attaches Chrome, Edge, and Firefox zip artifacts (store submit remains Edge + Firefox).

## [1.1.0] - 2026-11-05

### Added

- Edge Add-ons and Firefox AMO tag-triggered publish workflow (`release-stores.yml`).
- Marketing site download CTAs for Edge / Firefox store listings; Chrome remains a sideload zip.
- Extraction diagnostics and “Copy diagnostics” on the help card.
- Fixture-based extraction tests and Playwright E2E against a local Beatport fixture page.
- Per-tab session snapshots, MAIN-world catalog hook, and in-tab capture before reload.

### Changed

- Mix identity includes mix name so Original / Extended / Radio versions stay distinct.
- List coverage (`Based on N of M`) when catalog pagination metadata is present.
- Preview URLs restricted to known Beatport media hosts; CSV cells neutralized for spreadsheet formula injection.
- Dropped the broad `tabs` permission; panel enablement uses content-script tab hello.

## [0.1.0] - 2026-08-19

### Added

- Initial Manifest V3 extension for Chrome, Edge, and Firefox: side-panel market brief, charts, filters, track table, preview, and CSV export.
- Three-source extraction (catalog JSON, `__NEXT_DATA__`, DOM).
- First Edge and Firefox store listings; Firefox gecko id `bp-analyst@local` (AMO GUID).

[Unreleased]: https://github.com/ilyatitovich/bp-analyst/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/ilyatitovich/bp-analyst/compare/v0.1.0...v1.1.0
[0.1.0]: https://github.com/ilyatitovich/bp-analyst/releases/tag/v0.1.0
