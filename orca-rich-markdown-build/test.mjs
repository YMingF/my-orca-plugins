import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const output = resolve(root, '.test-bundle/core.test.mjs')
await build({
  entryPoints: [resolve(root, 'tests/core.test.ts')],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['jsdom'],
  nodePaths: [resolve(root, 'node_modules')]
})
const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
