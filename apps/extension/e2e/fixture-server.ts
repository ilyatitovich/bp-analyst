import { createServer, type Server } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../__tests__/fixtures'
)

const CHART_PATH = '/genre/tech-house/11/top-100'
const CATALOG_PATH = '/v4/catalog/tracks/'

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8')
}

function buildChartPage(): string {
  const chartHtml = loadFixture('chart-tracks-table.html')
  const nextData = loadFixture('next-data-top-100.json')
  const bodyMatch = chartHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyInner = bodyMatch?.[1] ?? ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tech House Top 100 | Beatport</title>
    <script id="__NEXT_DATA__" type="application/json">${nextData}</script>
  </head>
  <body>
    ${bodyInner}
    <script>
      // Exercise the MAIN-world /catalog/ fetch hook against the local fixture.
      void fetch('${CATALOG_PATH}?genre_id=11&page=1&per_page=25', {
        headers: { Accept: 'application/json' }
      }).catch(() => {})
    </script>
  </body>
</html>`
}

export type FixtureServer = {
  port: number
  /** Origin that looks like Beatport once Chromium host-resolver MAP is applied. */
  beatportOrigin: string
  chartUrl: string
  close: () => Promise<void>
}

export async function startFixtureServer(
  preferredPort = 0
): Promise<FixtureServer> {
  const catalogJson = loadFixture('catalog-tracks-page.json')
  const chartPage = buildChartPage()

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')

    if (url.pathname === CHART_PATH || url.pathname === `${CHART_PATH}/`) {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      })
      res.end(chartPage)
      return
    }

    if (
      url.pathname === CATALOG_PATH ||
      url.pathname === CATALOG_PATH.slice(0, -1)
    ) {
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      })
      res.end(catalogJson)
      return
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(preferredPort, '127.0.0.1', () => resolve())
  })

  const port = (server.address() as AddressInfo).port

  return {
    port,
    beatportOrigin: `http://www.beatport.com:${port}`,
    chartUrl: `http://www.beatport.com:${port}${CHART_PATH}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()))
      })
  }
}
