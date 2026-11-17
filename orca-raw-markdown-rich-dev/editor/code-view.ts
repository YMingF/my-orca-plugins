import type { NodeViewRenderer } from '@tiptap/core'
import { copyMarkdown } from './copy'

export const codeBlockNodeView: NodeViewRenderer = ({ node, editor, getPos }) => {
  let current = node
  const dom = document.createElement('div')
  dom.className = 'rich-code-block'
  const bar = document.createElement('div')
  bar.className = 'code-toolbar'
  bar.contentEditable = 'false'
  const language = document.createElement('select')
  language.setAttribute('aria-label', '代码语言')
  const languages = ['', 'text', 'javascript', 'typescript', 'json', 'html', 'css', 'python', 'bash', 'sql', 'java', 'yaml', 'xml', 'markdown']
  if (current.attrs.language && !languages.includes(current.attrs.language)) languages.push(current.attrs.language)
  for (const name of languages) {
    const option = document.createElement('option')
    option.value = name
    option.textContent = name || '自动识别'
    language.append(option)
  }
  language.value = current.attrs.language ?? ''
  language.disabled = !editor.isEditable
  language.addEventListener('change', () => {
    const pos = getPos()
    if (pos !== undefined && editor.isEditable) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, language: language.value }))
  })
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.textContent = '复制代码'
  copy.addEventListener('click', () => {
    try { copyMarkdown(document, current.textContent); copy.textContent = '已复制' }
    catch (error) { copy.textContent = `复制失败：${error instanceof Error ? error.message : error}` }
  })
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  pre.append(code)
  bar.append(language, copy)
  dom.append(bar, pre)
  return {
    dom,
    contentDOM: code,
    update(next) {
      if (next.type !== current.type) return false
      current = next
      language.disabled = !editor.isEditable
      if (!Array.from(language.options).some(o => o.value === (next.attrs.language ?? ''))) {
        const option = document.createElement('option')
        option.value = next.attrs.language
        option.textContent = next.attrs.language
        language.append(option)
      }
      language.value = next.attrs.language ?? ''
      return true
    },
    stopEvent: event => bar.contains(event.target as Node),
    ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target)
  }
}
