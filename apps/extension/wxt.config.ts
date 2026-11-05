import { defineConfig, type ConfigEnv, type Wxt } from 'wxt'
import type { Browser } from 'wxt/browser'
import { version } from './package.json'

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg'
  },
  outDirTemplate: `{{browser}}-mv{{manifestVersion}}{{modeSuffix}}-${version}`,
  manifest: ({ browser }: ConfigEnv) => ({
    name: 'Beatport Analyst',
    description: 'Analyze Beatport lists for BPM, key, and label composition.',
    version,
    minimum_chrome_version: browser === 'firefox' ? undefined : '116',
    permissions: browser === 'firefox' ? ['storage'] : ['storage', 'sidePanel'],
    host_permissions: ['*://*.beatport.com/*'],
    action: {
      default_title: 'Open Beatport Analyst'
    },
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: 'bp-analyst@local',
              strict_min_version: '128.0',
              data_collection_permissions: {
                required: ['none']
              }
            }
          }
        : undefined
  }),
  hooks: {
    'build:manifestGenerated': (
      wxt: Wxt,
      manifest: Browser.runtime.Manifest
    ) => {
      // default_path makes a global panel that stays open on every tab.
      if (wxt.config.browser !== 'firefox') {
        delete manifest.side_panel
      }
    }
  },
  zip: {
    name: 'beatport-analyst',
    artifactTemplate: '{{name}}-{{packageVersion}}-{{browser}}.zip',
    sourcesTemplate: '{{name}}-{{packageVersion}}-sources.zip'
  },
  suppressWarnings: {
    firefoxDataCollection: true
  }
})
