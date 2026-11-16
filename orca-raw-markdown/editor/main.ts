import { start } from './sync'
import { copyMarkdown } from './copy'

const style = document.createElement('style')
style.textContent = `
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; flex-direction: column;
    color: var(--orca-foreground); background: var(--orca-background);
    font: 13px system-ui, sans-serif;
  }
  header {
    display: flex; align-items: center; gap: 12px;
    min-height: 46px; padding: 8px 12px;
    border-bottom: 1px solid var(--orca-border, #6666);
  }
  header strong { white-space: nowrap; font-size: 12px; }
  #status { flex: 1; font-size: 12px; }
  #status[data-error] { color: var(--orca-destructive, #e75b65); }
  button {
    padding: 6px 12px; border: 1px solid var(--orca-border, #6666);
    border-radius: 6px; color: inherit; background: var(--orca-muted, #8882);
    font: inherit; cursor: pointer; white-space: nowrap;
  }
  button:hover { background: var(--orca-accent, #8884); }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--orca-ring, #5a9cf5); outline-offset: -2px;
  }
  textarea {
    flex: 1; min-height: 0; width: 100%; margin: 0; padding: 16px;
    border: 0; resize: none; color: inherit; background: inherit;
    font: 13px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    tab-size: 4;
  }
`
document.head.append(style)

const toolbar = document.createElement('header')
const title = document.createElement('strong')
title.textContent = 'RAW MARKDOWN'
const status = document.createElement('span')
status.id = 'status'
status.setAttribute('role', 'status')
status.setAttribute('aria-live', 'polite')
status.textContent = '正在加载…'
const copy = document.createElement('button')
copy.type = 'button'
copy.textContent = '复制全部 Markdown'
copy.title = '复制完整 Markdown 源文，包含尚未保存的编辑'
copy.disabled = true
toolbar.append(title, status, copy)

const text = document.createElement('textarea')
text.setAttribute('aria-label', 'Markdown 源文')
text.spellcheck = false
text.autocomplete = 'off'
text.setAttribute('autocapitalize', 'off')
text.wrap = 'off'
text.readOnly = true
document.body.append(toolbar, text)

try {
  const doc = await start()
  text.value = doc.value
  text.readOnly = doc.readOnly
  status.textContent = doc.readOnly ? '只读' : ''
  copy.disabled = false

  const replacement = doc.onReplace((value) => {
    text.value = value
    text.readOnly = doc.readOnly
    status.textContent = doc.readOnly ? '只读' : '已更新文档内容'
    status.removeAttribute('data-error')
  })
  text.addEventListener('input', () => {
    doc.change(text.value)
    status.textContent = ''
    status.removeAttribute('data-error')
  })
  copy.addEventListener('click', () => {
    try {
      // Session value includes pending edits and preserves untouched CRLF source;
      // a textarea's value normalizes line endings to LF.
      copyMarkdown(document, doc.value)
      status.removeAttribute('data-error')
      status.textContent = '已复制完整 Markdown'
    } catch (error) {
      status.setAttribute('data-error', '')
      status.textContent = `复制失败：${error instanceof Error ? error.message : String(error)}`
    }
  })
  window.addEventListener('pagehide', () => {
    replacement.dispose()
    doc.dispose()
  }, { once: true })
} catch (error) {
  status.setAttribute('data-error', '')
  status.textContent = `加载失败：${error instanceof Error ? error.message : String(error)}`
}
