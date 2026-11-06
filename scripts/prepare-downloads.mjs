import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extensionDir = join(root, 'apps/extension')
const outputDir = join(extensionDir, '.output')
const downloadsDir = join(root, 'apps/website/public/downloads')

const { version } = JSON.parse(
  readFileSync(join(extensionDir, 'package.json'), 'utf8')
)

const browsers = ['chrome', 'edge', 'firefox']

const zipScripts = {
  chrome: 'zip:chrome',
  edge: 'zip',
  firefox: 'zip:firefox'
}

mkdirSync(downloadsDir, { recursive: true })

for (const name of readdirSync(downloadsDir)) {
  if (name.endsWith('.zip')) {
    rmSync(join(downloadsDir, name))
  }
}

for (const browser of browsers) {
  execFileSync('pnpm', ['run', zipScripts[browser]], {
    cwd: extensionDir,
    stdio: 'inherit'
  })

  const sourceName = `beatport-analyst-${version}-${browser}.zip`
  const sourcePath = join(outputDir, sourceName)
  const destPath = join(downloadsDir, `beatport-analyst-${browser}.zip`)

  copyFileSync(sourcePath, destPath)
  console.log(`Copied ${sourceName} → public/downloads/beatport-analyst-${browser}.zip`)
}
