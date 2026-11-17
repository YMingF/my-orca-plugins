import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFile, rm, writeFile } from 'node:fs/promises'

const root = dirname(fileURLToPath(import.meta.url))
const plugin = resolve(root, '../orca-raw-markdown-rich-dev')
// This directory contains only generated outputs from this build.
await rm(resolve(plugin, 'editor/dist'), { recursive: true, force: true })
const result = await build({
  entryPoints: [resolve(plugin, 'editor/app.ts')],
  outdir: resolve(plugin, 'editor/dist'),
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome140',
  nodePaths: [resolve(root, 'node_modules')],
  loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file' },
  assetNames: 'assets/[name]-[hash]',
  minify: true,
  legalComments: 'linked',
  plugins: [{
    name: 'csp-safe-global-object',
    setup(builder) {
      builder.onLoad({ filter: /(?:[\\/]_root\.js|[\\/]cytoscape\.(?:cjs\.js|esm\.mjs))$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8')
        // Lodash's legacy global detector compiles a string. All target browsers
        // support globalThis; remove that detector for Orca's strict plugin CSP.
        return { contents: source.replace(/Function\(['"]return this['"]\)\(\)/g, 'globalThis'), loader: 'js' }
      })
    }
  }],
  logLevel: 'info',
  metafile: true
})

await writeFile(resolve(root, 'build-metafile.json'), JSON.stringify(result.metafile, null, 2))
const packages = new Set()
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.includes('node_modules/')) continue
  let directory = dirname(resolve(root, input))
  while (directory.includes('node_modules')) {
    try {
      const info = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
      if (!info.name || !info.version) { directory = dirname(directory); continue }
      packages.add(directory)
      break
    }
    catch { directory = dirname(directory) }
  }
}
const upstreamLicense = await readFile(resolve(plugin, 'editor/rich/upstream/LICENSE'), 'utf8')
const notices = ['# Third-party software notices', '', '## Orca rich Markdown core', '', 'Ported from Orca 1.4.259, commit `73b3f872ed2397bf7a53da343b509eab2b3eed18`.', '', 'Source: https://github.com/stablyai/orca/tree/73b3f872ed2397bf7a53da343b509eab2b3eed18', '', upstreamLicense, '']
for (const directory of [...packages].sort()) {
  const info = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
  notices.push(`## ${info.name} ${info.version}`, '', `License: ${info.license ?? 'See bundled source license comments'}`, '')
  for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'license.txt']) {
    try { notices.push(await readFile(resolve(directory, file), 'utf8'), ''); break } catch {}
  }
}
await writeFile(resolve(plugin, 'THIRD_PARTY_NOTICES.md'), notices.join('\n'))
