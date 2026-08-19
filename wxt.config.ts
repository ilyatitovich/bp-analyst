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
      'Analyze Beatport lists for BPM, key, and label composition.',
    version: '0.1.0',
    minimum_chrome_version: browser === 'firefox' ? undefined : '116',
    permissions: browser === 'firefox' ? ['storage'] : ['storage', 'sidePanel', 'tabs'],
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
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      // default_path makes a global panel that stays open on every tab.
      if (wxt.config.browser !== 'firefox') {
        delete manifest.side_panel;
      }
    },
  },
  zip: {
    name: 'beatport-analyst',
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
