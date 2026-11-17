import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import ts from 'typescript'
import { createHash } from 'node:crypto'

const live = '/Users/alex/Orca 插件/orca-raw-markdown/editor/dist/'
const restored = new URL('../orca-raw-markdown-rich-dev/editor/dist/', import.meta.url)
const sources = [await readFile(live + 'app.js', 'utf8'), await readFile(new URL('app.js', restored), 'utf8')]
const hash = text => createHash('sha256').update(text).digest('hex')
const results = []
for (const source of sources) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', pretendToBeVisual: true })
  const w = dom.window
  w.TextEncoder = TextEncoder
  w.TextDecoder = TextDecoder
  let value = '# Heading\n\n- [ ] Task\n\n```js\nconst n = 1\n```\n'
  let readOnly = false
  let replace
  let copied
  const events = new Map()
  w.orca = {
    on(name, handler) { events.set(name, handler) },
    document: { async session() { return {
      get value() { return value }, get readOnly() { return readOnly },
      change(next) { assert.equal(readOnly, false); value = next },
      onReplace(handler) { replace = handler; return { dispose() {} } }, dispose() {}
    } } }
  }
  w.document.execCommand = command => {
    assert.equal(command, 'copy')
    const event = new w.Event('copy', { cancelable: true })
    event.clipboardData = { setData(type, text) { assert.equal(type, 'text/plain'); copied = text } }
    w.document.dispatchEvent(event)
    return true
  }
  await w.eval('(async () => {' + source + '\n})()')
  const doc = w.document
  const modes = doc.querySelectorAll('.view-modes button')
  const copy = doc.querySelector('.copy-all')
  const clear = doc.querySelector('.clear-all')
  assert.equal(copy.disabled, false)
  assert.equal(clear.disabled, false)
  assert.equal(doc.querySelectorAll('.document-actions svg').length, 2)
  copy.click()
  assert.equal(copied, value)
  modes[0].click()
  const raw = doc.querySelector('.raw-editor')
  raw.value = '# Unsaved\r\n\r\n**Keep source**  \r\n'
  raw.dispatchEvent(new w.Event('input'))
  copy.click()
  assert.equal(copied, raw.value)
  clear.click()
  assert.equal(value, '')
  modes[1].click()
  events.get('editor.flush')()
  assert.equal(value, '')
  assert.equal(doc.querySelector('.rich-markdown-editor').textContent, '')
  value = '# Rich content\n'
  replace(value)
  clear.click()
  events.get('editor.flush')()
  assert.equal(value, '')
  readOnly = true
  value = '# Read only\n'
  replace(value)
  assert.equal(clear.disabled, true)
  clear.click()
  assert.equal(value, '# Read only\n')
  assert.equal(copy.disabled, false)
  copy.click()
  assert.equal(copied, value)
  results.push({ sourceCopy: true, unsavedRawCopy: true, rawClear: true, richClear: true, modeSwitch: true, readOnly: true, titles: [copy.title, clear.title] })
  w.dispatchEvent(new w.Event('pagehide'))
  w.close()
}
assert.deepEqual(results[0], results[1])
const css = [await readFile(live + 'app.css', 'utf8'), await readFile(new URL('app.css', restored), 'utf8')]
assert.equal(css[0], css[1])

// Compare syntax tokens while excluding minifier-chosen identifier spellings.
// This is structural evidence, not a proof of semantic equivalence.
const syntaxTokens = source => {
  const tokens = []
  const file = ts.createSourceFile('bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  function visit(node) {
    const children = node.getChildren(file)
    if (children.length) children.forEach(visit)
    else tokens.push([node.kind, node.kind === ts.SyntaxKind.Identifier ? '<identifier>' : node.getText(file)])
  }
  visit(file)
  return tokens
}
const core = sources.map(source => source.slice(0, /var \w+=document\.createElement\("header"\)/.exec(source).index))
const coreStructureEqual = JSON.stringify(syntaxTokens(core[0])) === JSON.stringify(syntaxTokens(core[1]))
assert.equal(coreStructureEqual, true)
const report = {
  generatedAt: new Date().toISOString(),
  javascriptByteIdentical: sources[0] === sources[1],
  javascriptHashes: sources.map(hash),
  cssByteIdentical: true,
  coreSyntaxMatchesIgnoringIdentifiers: coreStructureEqual,
  limitation: 'Identifier-normalized syntax comparison and JSDOM checks are not a proof of full semantic or browser equivalence.',
  checks: results
}
await writeFile(new URL('../verification.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
