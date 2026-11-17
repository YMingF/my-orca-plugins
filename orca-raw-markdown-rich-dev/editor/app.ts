import type { Editor } from '@tiptap/core'
import type { Level } from '@tiptap/extension-heading'
import { createRichEditor } from './rich'
import { copyMarkdown } from './copy'
import { codeBlockNodeView } from './code-view'
import { installSearch } from './search'
import { start } from './sync'
import './style.css'

const header = document.createElement('header')
header.className = 'app-header'
const title = document.createElement('strong')
title.textContent = 'MARKDOWN'
const modes = document.createElement('div')
modes.className = 'view-modes'
modes.setAttribute('role', 'group')
modes.setAttribute('aria-label', '编辑模式')
const rawMode = document.createElement('button')
rawMode.textContent = '<> Raw'
const richMode = document.createElement('button')
richMode.textContent = '✎ 富文本'
modes.append(rawMode, richMode)
const status = document.createElement('span')
status.className = 'status'
status.setAttribute('role', 'status')
status.setAttribute('aria-live', 'polite')
status.textContent = '正在加载…'
const documentActions = document.createElement('div')
documentActions.className = 'document-actions'
const copy = document.createElement('button')
copy.type = 'button'
copy.className = 'copy-all'
copy.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
copy.title = '复制当前文件全部 Markdown 内容，包含尚未保存的编辑（⌘ ⇧ C）'
copy.setAttribute('aria-label', copy.title)
copy.setAttribute('aria-keyshortcuts', 'Meta+Shift+C')
copy.disabled = true
const clearAllButton = document.createElement('button')
clearAllButton.type = 'button'
clearAllButton.className = 'clear-all'
clearAllButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"/></svg>'
clearAllButton.title = '清空当前文件全部内容，修改后需保存（⌘ ⇧ X）'
clearAllButton.setAttribute('aria-label', clearAllButton.title)
clearAllButton.setAttribute('aria-keyshortcuts', 'Meta+Shift+X')
clearAllButton.disabled = true
documentActions.append(copy, clearAllButton)
header.append(title, modes, status, documentActions)
const toolbar = document.createElement('div')
toolbar.className = 'format-toolbar'
toolbar.setAttribute('aria-label', '富文本格式工具栏')
const tablebar = document.createElement('div')
tablebar.className = 'table-toolbar'
tablebar.hidden = true
const searchbar = document.createElement('div')
searchbar.className = 'search-toolbar'
searchbar.hidden = true
const body = document.createElement('main')
const raw = document.createElement('textarea')
raw.className = 'raw-editor'
raw.spellcheck = false
raw.wrap = 'soft'
raw.setAttribute('aria-label', 'Markdown 源文')
const richPane = document.createElement('div')
richPane.className = 'rich-pane'
const outline = document.createElement('aside')
outline.className = 'outline'
outline.hidden = true
const richHost = document.createElement('div')
richHost.className = 'rich-host'
richPane.append(outline, richHost)
body.append(raw, richPane)
const footer = document.createElement('footer')
footer.textContent = 'Markdown 编辑 · 未保存的修改也可直接复制'
document.body.replaceChildren(header, toolbar, tablebar, searchbar, body, footer)

let messageTimeout: number | undefined
function showError(error: unknown) {
  window.clearTimeout(messageTimeout)
  messageTimeout = undefined
  status.dataset.error = ''
  status.textContent = error instanceof Error ? error.message : String(error)
}
function message(text = '', duration = 0) {
  window.clearTimeout(messageTimeout)
  messageTimeout = undefined
  status.removeAttribute('data-error')
  status.textContent = text
  if (duration > 0) messageTimeout = window.setTimeout(() => message(), duration)
}

// Register before session() so any save request sees the latest rich source.
let flushCurrent = () => {}
orca.on('editor.flush', () => flushCurrent())

try {
  const doc = await start()
  let mode: 'raw' | 'rich' = 'rich'
  let replacing = false
  const controller = createRichEditor({
    element: richHost,
    content: doc.value,
    editable: !doc.readOnly,
    codeBlockNodeView,
    onChange(markdown: string) {
      if (!replacing) { doc.change(markdown); message(doc.readOnly ? '只读' : ''); refreshOutline() }
    }
  })
  const editor: Editor = controller.editor
  editor.view.dom.setAttribute('aria-label', 'Markdown 富文本编辑器')
  const search = installSearch(editor)
  raw.value = doc.value
  raw.readOnly = doc.readOnly
  const formattingButtons: { element: HTMLButtonElement; active?: () => boolean }[] = []
  const toolbarIcons: Record<string, string> = {
    '粗体': '<path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z"/>',
    '斜体': '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
    '下划线': '<path d="M6 4v7a6 6 0 0 0 12 0V4M4 21h16"/>',
    '删除线': '<path d="M17 5a6 6 0 0 0-10 1c-1 3 2 5 5 6s6 2 5 5a6 6 0 0 1-10 2M3 12h18"/>',
    '行内代码': '<path d="m8 7-5 5 5 5m8-10 5 5-5 5"/>',
    '无序列表': '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    '有序列表': '<path d="M10 6h11M10 12h11M10 18h11M3 4h1v4M3 8h2M2 15a2 2 0 0 1 4 0c0 1-4 3-4 5h4"/>',
    '任务列表': '<path d="m3 6 2 2 3-4M11 6h10m-18 6 2 2 3-4m3 2h10M11 18h10"/><rect x="3" y="16" width="4" height="4" rx="1"/>',
    '引用': '<path d="M10 11H4V5h6v7a6 6 0 0 1-6 6M20 11h-6V5h6v7a6 6 0 0 1-6 6"/>',
    '代码块': '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-9-2 10"/>',
    '分隔线': '<path d="M3 12h18M8 5h8M8 19h8"/>',
    '链接': '<path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2" transform="translate(1 0) scale(.9 1)"/>',
    '图片': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    '表格': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    '折叠块': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 7 3 3-3 3m6-3h5M7 17h11"/>',
    'Emoji': '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01"/>',
    '撤销': '<path d="M3 10h11a7 7 0 0 1 0 14" transform="translate(0 -4)"/><path d="m7 2-4 4 4 4"/>',
    '重做': '<path d="M21 6H10a7 7 0 0 0 0 14m7-18 4 4-4 4"/>',
    '目录': '<path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"/><path d="M5 5v14"/>',
    '查找 / 替换': '<circle cx="10" cy="9" r="6"/><path d="m15 14 6 6M3 19h8m-3-3 3 3-3 3"/>'
  }
  function addButton(container: HTMLElement, label: string, run: () => void, active?: () => boolean, editing = true) {
    const button = document.createElement('button')
    button.type = 'button'
    if (container === toolbar) {
      button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${toolbarIcons[label]}</svg>`
    } else button.textContent = label
    button.title = label
    button.setAttribute('aria-label', label)
    button.disabled = editing && doc.readOnly
    button.addEventListener('mousedown', event => event.preventDefault())
    button.addEventListener('click', () => { try { run() } catch (error) { showError(error) } })
    container.append(button)
    if (editing) formattingButtons.push({ element: button, active })
    return button
  }

  function editValue(title: string, initial: string, apply: (value: string) => void) {
    const modal = document.createElement('dialog')
    modal.className = 'edit-dialog'
    const form = document.createElement('form')
    const label = document.createElement('label')
    label.textContent = title
    const input = document.createElement('input')
    input.value = initial
    input.setAttribute('aria-label', title)
    label.append(input)
    const buttons = document.createElement('div')
    const submit = document.createElement('button')
    submit.type = 'submit'
    submit.textContent = '确定'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = '取消'
    cancel.addEventListener('click', () => modal.close())
    buttons.append(cancel, submit)
    form.append(label, buttons)
    form.addEventListener('submit', event => { event.preventDefault(); try { apply(input.value); modal.close() } catch (error) { showError(error) } })
    modal.append(form)
    document.body.append(modal)
    modal.addEventListener('close', () => { modal.remove(); editor.commands.focus() }, { once: true })
    modal.showModal()
    input.focus()
    input.select()
  }

  const blocks = document.createElement('select')
  blocks.setAttribute('aria-label', '段落类型')
  for (const [value, label] of [['paragraph', '正文'], ...[1, 2, 3, 4, 5, 6].map(level => [`h${level}`, `标题 ${level}`])]) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    blocks.append(option)
  }
  blocks.disabled = doc.readOnly
  blocks.addEventListener('change', () => {
    if (blocks.value === 'paragraph') editor.chain().focus().setParagraph().run()
    else editor.chain().focus().toggleHeading({ level: Number(blocks.value.slice(1)) as Level }).run()
  })
  toolbar.append(blocks)
  addButton(toolbar, '粗体', () => { editor.chain().focus().toggleBold().run() }, () => editor.isActive('bold'))
  addButton(toolbar, '斜体', () => { editor.chain().focus().toggleItalic().run() }, () => editor.isActive('italic'))
  addButton(toolbar, '下划线', () => { editor.chain().focus().toggleUnderline().run() }, () => editor.isActive('underline'))
  addButton(toolbar, '删除线', () => { editor.chain().focus().toggleStrike().run() }, () => editor.isActive('strike'))
  addButton(toolbar, '行内代码', () => { editor.chain().focus().toggleCode().run() }, () => editor.isActive('code'))
  addButton(toolbar, '无序列表', () => { editor.chain().focus().toggleBulletList().run() }, () => editor.isActive('bulletList'))
  addButton(toolbar, '有序列表', () => { editor.chain().focus().toggleOrderedList().run() }, () => editor.isActive('orderedList'))
  addButton(toolbar, '任务列表', () => { editor.chain().focus().toggleTaskList().run() }, () => editor.isActive('taskList'))
  addButton(toolbar, '引用', () => { editor.chain().focus().toggleBlockquote().run() }, () => editor.isActive('blockquote'))
  addButton(toolbar, '代码块', () => { editor.chain().focus().toggleCodeBlock().run() }, () => editor.isActive('codeBlock'))
  addButton(toolbar, '分隔线', () => { editor.chain().focus().setHorizontalRule().run() })
  const insertLink = () => editValue('链接地址（留空移除链接）', editor.getAttributes('link').href ?? '', value => {
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!value.trim()) { chain.unsetLink().run(); return }
    const href = value.trim()
    if (/^(?:javascript|vbscript|data):/i.test(href)) throw new Error('不支持此链接协议')
    if (editor.state.selection.empty && !editor.isActive('link')) chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
    else chain.setLink({ href }).run()
  })
  addButton(toolbar, '链接', insertLink, () => editor.isActive('link'))
  addButton(toolbar, '图片', () => editValue('图片地址（支持内嵌 data:image；外部图片受插件隔离限制）', '', value => {
    const src = value.trim()
    if (!src || /^(?:javascript|vbscript):/i.test(src)) throw new Error('请输入有效图片地址')
    editor.chain().focus().setImage({ src, alt: '图片' }).run()
  }))
  const insertTable = () => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() }
  addButton(toolbar, '表格', insertTable)
  function insertToggle(level?: number) {
    const pos = editor.state.selection.from
    editor.chain().focus().insertContentAt(pos, {
      type: 'details', attrs: { open: true, ...(level ? { variant: `heading-${level}` } : {}) },
      content: [{ type: 'detailsSummary', content: [{ type: 'text', text: '折叠标题' }] }, { type: 'detailsContent', content: [{ type: 'paragraph' }] }]
    }).setTextSelection(pos + 1).run()
  }
  addButton(toolbar, '折叠块', () => insertToggle())
  const insertEmoji = () => editValue('输入或粘贴 Emoji', '🙂', value => { editor.chain().focus().insertContent({ type: 'text', text: value }).run() })
  addButton(toolbar, 'Emoji', insertEmoji)
  addButton(toolbar, '撤销', () => { editor.chain().focus().undo().run() })
  addButton(toolbar, '重做', () => { editor.chain().focus().redo().run() })
  addButton(toolbar, '目录', () => { outline.hidden = !outline.hidden; refreshOutline() }, undefined, false)
  addButton(toolbar, '查找 / 替换', () => openSearch(), undefined, false)

  for (const [label, run] of [
    ['上方插行', () => editor.chain().focus().addRowBefore().run()],
    ['下方插行', () => editor.chain().focus().addRowAfter().run()],
    ['左侧插列', () => editor.chain().focus().addColumnBefore().run()],
    ['右侧插列', () => editor.chain().focus().addColumnAfter().run()],
    ['删除行', () => editor.chain().focus().deleteRow().run()],
    ['删除列', () => editor.chain().focus().deleteColumn().run()],
    ['合并单元格', () => editor.chain().focus().mergeCells().run()],
    ['拆分单元格', () => editor.chain().focus().splitCell().run()],
    ['切换表头', () => editor.chain().focus().toggleHeaderRow().run()],
    ['删除表格', () => editor.chain().focus().deleteTable().run()]
  ] as const) addButton(tablebar, label, () => { run() })

  const query = document.createElement('input')
  query.placeholder = '查找文本'
  query.setAttribute('aria-label', '查找文本')
  const replace = document.createElement('input')
  replace.placeholder = '替换为'
  replace.setAttribute('aria-label', '替换为')
  const count = document.createElement('span')
  const matchCase = document.createElement('input'); matchCase.type = 'checkbox'
  const word = document.createElement('input'); word.type = 'checkbox'
  const caseLabel = document.createElement('label'); caseLabel.append(matchCase, '区分大小写')
  const wordLabel = document.createElement('label'); wordLabel.append(word, '全词')
  const updateSearch = () => { count.textContent = `${search.update(query.value, matchCase.checked, word.checked)} 处` }
  query.addEventListener('input', updateSearch)
  matchCase.addEventListener('change', updateSearch)
  word.addEventListener('change', updateSearch)
  query.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search.move(event.shiftKey ? -1 : 1) } })
  searchbar.append(query, count, caseLabel, wordLabel)
  addButton(searchbar, '上一处', () => search.move(-1), undefined, false)
  addButton(searchbar, '下一处', () => search.move(1), undefined, false)
  searchbar.append(replace)
  addButton(searchbar, '替换', () => { search.replace(replace.value, false); updateSearch() })
  addButton(searchbar, '全部替换', () => { search.replace(replace.value, true); updateSearch() })
  addButton(searchbar, '关闭查找', () => { searchbar.hidden = true; search.clear(); editor.commands.focus() }, undefined, false)
  function openSearch() { if (mode !== 'rich') setMode('rich'); searchbar.hidden = false; updateSearch(); query.focus(); query.select() }

  const slash = document.createElement('div')
  slash.className = 'slash-menu'
  slash.hidden = true
  slash.setAttribute('role', 'listbox')
  document.body.append(slash)
  const slashActions = [
    ['正文', () => editor.chain().focus().setParagraph().run()],
    ...[1, 2, 3, 4, 5, 6].map(level => [`标题 ${level}`, () => editor.chain().focus().toggleHeading({ level: level as Level }).run()] as const),
    ['无序列表', () => editor.chain().focus().toggleBulletList().run()],
    ['有序列表', () => editor.chain().focus().toggleOrderedList().run()],
    ['任务列表', () => editor.chain().focus().toggleTaskList().run()],
    ['引用', () => editor.chain().focus().toggleBlockquote().run()],
    ['代码块', () => editor.chain().focus().toggleCodeBlock().run()],
    ['分隔线', () => editor.chain().focus().setHorizontalRule().run()],
    ['表格', insertTable], ['折叠块', () => insertToggle()],
    ...[1, 2, 3, 4, 5].map(level => [`折叠标题 ${level}`, () => insertToggle(level)] as const),
    ['Emoji', insertEmoji]
  ] as const
  let slashRange: { from: number; to: number } | null = null
  let slashIndex = 0
  let filteredSlash: typeof slashActions[number][] = []
  function runSlash(index: number) {
    if (!slashRange || !filteredSlash[index]) return
    editor.chain().focus().deleteRange(slashRange).run()
    const action = filteredSlash[index][1]
    slashRange = null
    slash.hidden = true
    action()
  }
  function updateSlash() {
    const { $from, empty } = editor.state.selection
    const text = $from.parent.textBetween(0, $from.parentOffset, '\u0000')
    const match = empty && $from.parent.type.name === 'paragraph' ? /(?:^|\s)\/([^/\s]*)$/.exec(text) : null
    if (!match || !editor.isEditable || mode !== 'rich') { slash.hidden = true; slashRange = null; return }
    const needle = match[1].toLowerCase()
    slashRange = { from: $from.pos - needle.length - 1, to: $from.pos }
    filteredSlash = slashActions.filter(([label]) => label.toLowerCase().includes(needle))
    slashIndex = Math.min(slashIndex, filteredSlash.length - 1)
    if (slashIndex < 0) slashIndex = 0
    slash.replaceChildren()
    filteredSlash.forEach(([label], index) => {
      const option = addButton(slash, label, () => runSlash(index), undefined, false)
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(index === slashIndex))
    })
    slash.hidden = !filteredSlash.length
    if (!slash.hidden) {
      const pos = editor.view.coordsAtPos($from.pos)
      slash.style.left = `${Math.max(8, Math.min(pos.left, innerWidth - 240))}px`
      slash.style.top = `${Math.min(pos.bottom + 6, Math.max(50, innerHeight - 310))}px`
      slash.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    }
  }

  function refreshOutline() {
    if (outline.hidden) return
    outline.replaceChildren()
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'heading') return
      const button = addButton(outline, node.textContent || '空标题', () => { editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run() }, undefined, false)
      button.style.paddingLeft = `${8 + (Number(node.attrs.level) - 1) * 10}px`
    })
  }
  function refreshToolbar() {
    clearAllButton.disabled = doc.readOnly
    blocks.value = editor.isActive('heading') ? `h${editor.getAttributes('heading').level}` : 'paragraph'
    tablebar.hidden = mode !== 'rich' || !editor.isActive('table') || doc.readOnly
    for (const item of formattingButtons) {
      item.element.disabled = doc.readOnly
      if (item.active) item.element.setAttribute('aria-pressed', String(item.active()))
    }
  }
  editor.on('selectionUpdate', () => { refreshToolbar(); updateSlash() })
  editor.on('update', () => { refreshToolbar(); updateSlash(); if (!searchbar.hidden) updateSearch() })
  editor.setOptions({ editorProps: {
    ...editor.options.editorProps,
    handleKeyDown: (_view, event) => {
      if (event.isComposing || event.keyCode === 229) return false
      if (!slash.hidden && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
        event.preventDefault()
        if (event.key === 'Escape') { slash.hidden = true; slashRange = null }
        else if (event.key === 'Enter') runSlash(slashIndex)
        else { slashIndex = (slashIndex + (event.key === 'ArrowDown' ? 1 : -1) + filteredSlash.length) % filteredSlash.length; updateSlash() }
        return true
      }
      return false
    }
  } })
  editor.view.dom.addEventListener('dblclick', event => {
    if ((event.target as Element).closest('a') && !doc.readOnly) insertLink()
  })

  function latest() { return mode === 'rich' ? controller.getMarkdown() : doc.value }
  flushCurrent = () => { const markdown = latest(); if (markdown !== doc.value) doc.change(markdown) }
  function setMode(next: 'raw' | 'rich') {
    try {
      if (next !== mode) {
        flushCurrent()
        if (next === 'raw') raw.value = doc.value
        else controller.setMarkdown(doc.value)
        mode = next
      }
      raw.hidden = mode !== 'raw'
      richPane.hidden = mode !== 'rich'
      toolbar.hidden = mode !== 'rich'
      if (mode === 'raw') { searchbar.hidden = true; tablebar.hidden = true; slash.hidden = true }
      rawMode.setAttribute('aria-pressed', String(mode === 'raw'))
      richMode.setAttribute('aria-pressed', String(mode === 'rich'))
      refreshToolbar()
    } catch (error) { showError(error) }
  }
  rawMode.addEventListener('click', () => setMode('raw'))
  richMode.addEventListener('click', () => setMode('rich'))
  raw.addEventListener('input', () => { doc.change(raw.value); message(doc.readOnly ? '只读' : '') })
  copy.addEventListener('click', () => {
    try { flushCurrent(); copyMarkdown(document, latest()); message('已复制完整 Markdown', 2000) }
    catch (error) { showError(error) }
  })
  clearAllButton.addEventListener('click', () => {
    if (doc.readOnly) return
    try {
      controller.setMarkdown('')
      raw.value = ''
      doc.change('')
      refreshToolbar()
      refreshOutline()
      if (!searchbar.hidden) updateSearch()
      if (mode === 'raw') raw.focus()
      else editor.commands.focus()
      message('已清空当前文件内容', 2000)
    } catch (error) { showError(error) }
  })
  const replacement = doc.onReplace(value => {
    try {
      replacing = true
      raw.value = value
      raw.readOnly = doc.readOnly
      controller.setMarkdown(value, { resetHistory: true })
      editor.setEditable(!doc.readOnly)
      blocks.disabled = doc.readOnly
      refreshToolbar()
      refreshOutline()
      if (!searchbar.hidden) updateSearch()
      message(doc.readOnly ? '只读' : '已更新文档内容')
    } catch (error) { showError(error) }
    finally { replacing = false }
  })
  document.addEventListener('keydown', event => {
    if (event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey && !event.isComposing && event.keyCode !== 229) {
      const target = event.target
      if (target instanceof HTMLElement && !target.closest('dialog') && (!target.closest('input, textarea, select') || target === raw)) {
        const action = event.key.toLowerCase() === 'c' ? copy : event.key.toLowerCase() === 'x' ? clearAllButton : null
        if (action) {
          event.preventDefault()
          event.stopPropagation()
          if (!event.repeat) action.click()
          return
        }
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); event.stopPropagation(); openSearch() }
    if (event.key === 'Escape') { slash.hidden = true; searchbar.hidden = true; search.clear() }
  }, true)
  window.addEventListener('pagehide', () => { window.clearTimeout(messageTimeout); flushCurrent = () => {}; replacement.dispose(); controller.dispose(); doc.dispose() }, { once: true })
  setMode('rich')
  copy.disabled = false
  message(doc.readOnly ? '只读' : '')
} catch (error) {
  showError(error)
  rawMode.disabled = true
  richMode.disabled = true
}
