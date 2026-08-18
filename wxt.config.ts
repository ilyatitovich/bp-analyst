import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  webExt: {
    binaries: {
      edge: '/usr/bin/microsoft-edge-stable',
      firefox: '/usr/bin/firefox',
    },
  },
  manifest: ({ browser }) => ({
    name: 'Beatport Analyst',
    description:
      'Analyze Beatport track pages by BPM, key/Camelot, genre, labels, and export CSV.',
    version: '0.1.0',
    minimum_chrome_version: browser === 'firefox' ? undefined : '116',
    permissions: browser === 'firefox' ? ['storage'] : ['storage', 'sidePanel'],
    host_permissions: ['*://*.beatport.com/*'],
    action: {
      default_title: 'Open Beatport Analyst',
    },
    web_accessible_resources: [
      {
        resources: ['beatport-fetch.js'],
        matches: ['*://*.beatport.com/*'],
      },
    ],
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: 'bp-analyst@local',
              strict_min_version: '128.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          }
        : undefined,
  }),
  zip: {
    name: 'beatport-analyst',
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
