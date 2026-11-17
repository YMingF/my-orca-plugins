export function copyMarkdown(document: Document, markdown: string): void {
  const focused = document.activeElement
  const selection = focused instanceof HTMLTextAreaElement
    ? { start: focused.selectionStart, end: focused.selectionEnd, direction: focused.selectionDirection }
    : null
  const source = document.createElement('textarea')
  source.value = markdown
  source.readOnly = true
  source.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0'
  source.setAttribute('aria-hidden', 'true')
  source.tabIndex = -1
  let written = false
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return
    // Textarea selection normalizes CRLF; write the exact session source instead.
    event.clipboardData.setData('text/plain', markdown)
    event.preventDefault()
    written = true
  }
  document.body.append(source)
  document.addEventListener('copy', onCopy)
  try {
    source.focus({ preventScroll: true })
    source.select()
    // Orca denies the async Clipboard API; synchronous copy on a gesture is supported.
    if (!document.execCommand('copy') || !written) {
      throw new Error('复制命令被拒绝，请直接点击复制按钮重试')
    }
  } finally {
    document.removeEventListener('copy', onCopy)
    source.remove()
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true })
    if (focused instanceof HTMLTextAreaElement && selection) {
      focused.setSelectionRange(selection.start, selection.end, selection.direction)
    }
  }
}
