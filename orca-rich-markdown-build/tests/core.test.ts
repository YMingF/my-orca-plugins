import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createRichEditor } from '../../orca-raw-markdown-rich-dev/editor/rich/index'
import { codeBlockNodeView } from '../../orca-raw-markdown-rich-dev/editor/code-view'
import { installSearch } from '../../orca-raw-markdown-rich-dev/editor/search'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://editor.test/' })
for (const name of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'MutationObserver', 'DOMParser', 'Event', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent', 'getComputedStyle']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name as keyof Window] })
}
Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (fn: FrameRequestCallback) => setTimeout(fn, 0) })
Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: clearTimeout })

function open(content: string, editable = true) {
  const element = document.createElement('div')
  document.body.append(element)
  const changes: string[] = []
  const controller = createRichEditor({ element, content, editable, onChange: value => changes.push(value) })
  return { ...controller, changes, close() { controller.dispose(); element.remove() } }
}

test('opening and mode round trips preserve exact source bytes', () => {
  const source = '# 標題\r\n\r\n*emphasis*  \r\n[ref][id]\r\n\r\n[id]: https://example.com "Title"\r\n'
  const rich = open(source)
  try {
    assert.equal(rich.getMarkdown(), source)
    rich.setMarkdown(rich.getMarkdown())
    assert.equal(rich.getMarkdown(), source)
    assert.deepEqual(rich.changes, [])
  } finally { rich.close() }
})

test('source ownership preserves raw HTML, document links and literal transport-like text', () => {
  const source = '<!-- keep me -->\n\nA <span class="x">tag</span> and [[Some Page|label]].\n\n```html\n<div>literal</div>\n```\n'
  const rich = open(source)
  try {
    assert.equal(rich.getMarkdown(), source)
    rich.editor.commands.insertContentAt(rich.editor.state.doc.content.size, { type: 'paragraph', content: [{ type: 'text', text: 'added' }] })
    const result = rich.getMarkdown()
    assert.ok(result.includes('<!-- keep me -->'))
    assert.ok(result.includes('<span class="x">tag</span>'))
    assert.ok(result.includes('[[Some Page|label]]'))
    assert.ok(result.includes('added'))
    assert.ok(!result.includes('[[ORCA_RICH_MD:'))
  } finally { rich.close() }
})

test('registers actual list, table, details and code schemas', () => {
  const source = '# Heading\n\n- [ ] Task\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<details open>\n<summary>More</summary>\n\nBody\n\n</details>\n\n```ts\nconst x = 1\n```\n'
  const rich = open(source)
  try {
    const types = new Set<string>()
    rich.editor.state.doc.descendants(node => { types.add(node.type.name) })
    for (const type of ['heading', 'taskList', 'taskItem', 'table', 'tableCell', 'details', 'detailsSummary', 'detailsContent', 'codeBlock']) {
      assert.ok(types.has(type), `missing parsed ${type}`)
    }
    assert.equal(rich.getMarkdown(), source)
  } finally { rich.close() }
})

test('formula text and fenced Mermaid source survive unrelated edits and undo', () => {
  const source = '# Heading\n\nInline $a_b + c^2$ stays text.\n\n$$\n\\frac{a}{b} + x_1\n$$\n\n```mermaid\nflowchart LR\n  A[Raw] --> B[Rich]\n```\n'
  const rich = open(source)
  try {
    assert.equal(rich.getMarkdown(), source)
    rich.setMarkdown(rich.getMarkdown())
    assert.equal(rich.getMarkdown(), source)
    assert.equal(rich.editor.schema.nodes.inlineMath, undefined)
    assert.equal(rich.editor.schema.nodes.blockMath, undefined)
    assert.ok(rich.editor.state.doc.textContent.includes('$a_b + c^2$'))
    assert.ok(rich.editor.state.doc.textContent.includes('$$\n\\frac{a}{b} + x_1\n$$'))
    let added = ''
    for (const character of ' edited') {
      const headingEnd = rich.editor.state.doc.firstChild!.nodeSize - 1
      rich.editor.commands.insertContentAt(headingEnd, character)
      added += character
      assert.equal(rich.getMarkdown(), source.replace('# Heading\n', `# Heading${added}\n`))
    }
    assert.equal(rich.editor.commands.undo(), true)
    assert.equal(rich.getMarkdown(), source)
  } finally { rich.close() }
})

test('fenced Mermaid uses ordinary editable code controls without a diagram preview', () => {
  const element = document.createElement('div')
  document.body.append(element)
  const source = '```mermaid\nflowchart LR\n  A --> B\n```\n'
  const rich = createRichEditor({ element, content: source, editable: true, codeBlockNodeView, onChange() {} })
  try {
    const language = element.querySelector<HTMLSelectElement>('[aria-label="代码语言"]')!
    assert.equal(language.value, 'mermaid')
    assert.equal(element.querySelector('pre code')?.textContent, 'flowchart LR\n  A --> B')
    assert.equal(element.querySelectorAll('.code-toolbar button').length, 1)
    assert.equal(element.querySelector('.code-toolbar button')?.textContent, '复制代码')
    assert.equal(element.querySelector('.mermaid-preview'), null)
    assert.equal(rich.getMarkdown(), source)
    language.value = 'javascript'
    language.dispatchEvent(new Event('change'))
    assert.ok(rich.getMarkdown().startsWith('```javascript\n'))
    assert.ok(rich.getMarkdown().includes('flowchart LR\n  A --> B'))
  } finally { rich.dispose(); element.remove() }
})

test('editing one paragraph preserves untouched Markdown source styles and CRLF', () => {
  const source = '# Heading\r\n\r\nFirst paragraph.\r\n\r\n* untouched emphasis *\r\n'
  const rich = open(source)
  try {
    let position = -1
    rich.editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'First paragraph.') position = pos
    })
    assert.ok(position >= 0)
    rich.editor.commands.insertContentAt(position + 'First'.length, ' edited')
    const result = rich.getMarkdown()
    assert.ok(result.includes('First edited paragraph.'))
    assert.ok(result.includes('* untouched emphasis *'))
    assert.ok(result.includes('\r\n'))
    assert.equal(result.replace(/\r\n/g, '').includes('\n'), false)
    assert.equal(rich.changes.at(-1), result)
  } finally { rich.close() }
})

test('undo restores the document and external replacement does not emit local edits', () => {
  const source = 'Original paragraph.\n'
  const rich = open(source)
  try {
    rich.editor.commands.insertContentAt(1, 'Edit ')
    assert.ok(rich.getMarkdown().includes('Edit Original'))
    rich.setMarkdown(rich.getMarkdown())
    assert.equal(rich.editor.commands.undo(), true)
    assert.equal(rich.getMarkdown(), source)
    const changes = rich.changes.length
    rich.setMarkdown('# External replacement\n', { resetHistory: true })
    assert.equal(rich.getMarkdown(), '# External replacement\n')
    assert.equal(rich.changes.length, changes)
    assert.equal(rich.editor.commands.undo(), false)
  } finally { rich.close() }
})

test('read-only documents remain available for exact source copying', () => {
  const source = '**read only**\n'
  const rich = open(source, false)
  try {
    assert.equal(rich.editor.isEditable, false)
    assert.equal(rich.getMarkdown(), source)
  } finally { rich.close() }
})

test('external replacement clears history even when it equals the current draft', () => {
  const rich = open('Original\n')
  try {
    rich.editor.commands.insertContentAt(1, 'Edit ')
    const current = rich.getMarkdown()
    rich.setMarkdown(current, { resetHistory: true })
    assert.equal(rich.editor.commands.undo(), false)
    assert.equal(rich.getMarkdown(), current)
  } finally { rich.close() }
})

test('search replacement refreshes positions after raw or external document replacement', () => {
  const rich = open('needle\n')
  try {
    const search = installSearch(rich.editor)
    assert.equal(search.update('needle'), 1)
    rich.setMarkdown('prefix needle\n', { resetHistory: true })
    search.replace('replacement', true)
    assert.equal(rich.getMarkdown(), 'prefix replacement\n')
  } finally { rich.close() }
})

test('case-insensitive search keeps source offsets after Unicode case expansion', () => {
  const rich = open('İ token token\n')
  try {
    const search = installSearch(rich.editor)
    assert.equal(search.update('token'), 2)
    search.replace('x', true)
    assert.equal(rich.getMarkdown(), 'İ x x\n')
  } finally { rich.close() }
})

test('search treats punctuation as literal text and does not replace read-only content', () => {
  const rich = open('a+b aab\n', false)
  try {
    const search = installSearch(rich.editor)
    assert.equal(search.update('a+b'), 1)
    search.replace('changed', true)
    assert.equal(rich.getMarkdown(), 'a+b aab\n')
  } finally { rich.close() }
})

test('heading edits and undo preserve untouched task, code and table source', () => {
  const source = '# Raw Markdown 复制示例\n\n**加粗**、*斜体*、[链接](https://example.com) 都保留 Markdown 标记。\n\n- [ ] 不需要全选\n- [x] 点击顶部「复制全部 Markdown」\n\n```ts\nconst message = \'复制的是源码，不是渲染后的文字\'\n```\n\n| 功能 | 行为 |\n| --- | --- |\n| 复制全部 | 包含最新编辑 |\n| 保存 | 使用 Orca 原有保存操作 |\n'
  const rich = open(source)
  try {
    let added = ''
    for (const character of ' 编辑验证') {
      const headingEnd = rich.editor.state.doc.firstChild!.nodeSize - 1
      rich.editor.commands.insertContentAt(headingEnd, character)
      added += character
      assert.equal(rich.getMarkdown(), source.replace('复制示例\n', `复制示例${added}\n`))
    }
    assert.equal(rich.editor.commands.undo(), true)
    assert.equal(rich.getMarkdown(), source)
  } finally { rich.close() }
})

test('normalized safety proof still retains table, mark and raw-source edits', () => {
  const rich = open('# Heading\n\n<!-- keep -->\n\nplain\n\n| A | B |\n| --- | --- |\n| one | two |\n')
  try {
    rich.editor.commands.insertContentAt(rich.editor.state.doc.firstChild!.nodeSize - 1, ' ')
    rich.getMarkdown()
    let cellPosition = -1
    let plainPosition = -1
    let commentPosition = -1
    rich.editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'one') cellPosition = pos
      if (node.isText && node.text === 'plain') plainPosition = pos
      if (node.type.name === 'rawMarkdownHtmlBlock' && node.attrs.value.includes('keep')) commentPosition = pos
    })
    assert.ok(cellPosition >= 0 && plainPosition >= 0 && commentPosition >= 0)
    rich.editor.commands.insertContentAt({ from: cellPosition, to: cellPosition + 3 }, 'changed')
    rich.editor.commands.setTextSelection({ from: plainPosition, to: plainPosition + 5 })
    rich.editor.commands.toggleBold()
    const comment = rich.editor.state.doc.nodeAt(commentPosition)!
    rich.editor.view.dispatch(rich.editor.state.tr.setNodeMarkup(commentPosition, undefined, { ...comment.attrs, value: '<!-- changed -->' }))
    const result = rich.getMarkdown()
    assert.ok(result.includes('changed'))
    assert.ok(result.includes('**plain**'))
    assert.ok(result.includes('<!-- changed -->'))
    assert.ok(!result.includes('<!-- keep -->'))
    assert.ok(!result.includes('| one'))
    assert.ok(!result.includes('[[ORCA_RICH_MD:'))
  } finally { rich.close() }
})
