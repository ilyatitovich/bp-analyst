# Source Code Review (Firefox / AMO)

This archive is the `@bp-analyst/extension` package produced by `wxt zip -b firefox`. It is enough to rebuild the Firefox MV3 add-on without the rest of the monorepo.

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io/) 9+ (Corepack: `corepack enable`)

## Rebuild

From the extracted archive root:

```bash
pnpm install
pnpm build:firefox
```

Output directory: `.output/firefox-mv3-<version>/` (see `version` in `package.json`).

To produce the same zip artifacts reviewers receive from CI:

```bash
pnpm zip:firefox
```

That writes:

- `.output/beatport-analyst-<version>-firefox.zip` — extension package
- `.output/beatport-analyst-<version>-sources.zip` — this sources archive

## Notes for Reviewers

- Build tool: [WXT](https://wxt.dev) (`wxt build -b firefox --mv3`). Bundle output is minified; this archive is the human-readable source.
- Gecko add-on ID: `bp-analyst@local` (matches the AMO listing GUID).
- No private registries or secret env files are required for the production build.
- Unit tests (`pnpm test`) and lint are optional for rebuild verification; they are not part of the shipped package.
