import { Editor, type NodeViewRenderer } from '@tiptap/core'
import { EditorState } from '@tiptap/pm/state'
import { createRichExtensions } from './extensions'
import { createRichMarkdownEditorCodec } from './upstream/src/renderer/src/components/editor/rich-markdown/document/rich-markdown-source-transport'
import { encodeRawMarkdownHtmlForRichEditor } from './upstream/src/renderer/src/components/editor/rich-markdown/raw-source/raw-markdown-html'
import { normalizeEmptyListItems } from './upstream/src/renderer/src/components/editor/rich-markdown/schema/rich-markdown-normalize'
import { reconcileRichMarkdownBlockSource } from './upstream/src/renderer/src/components/editor/rich-markdown/document/rich-markdown-block-source'
import { reconcileSerializedMarkdown, restoreMarkdownSourceEol } from './upstream/src/renderer/src/components/editor/rich-markdown/document/rich-markdown-source-reconcile'

export type RichEditorOptions = {
  element: HTMLElement
  content: string
  editable: boolean
  onChange: (markdown: string) => void
  codeBlockNodeView?: NodeViewRenderer
}

export function createRichEditor(options: RichEditorOptions) {
  const codec = createRichMarkdownEditorCodec()
  const proofCodec = createRichMarkdownEditorCodec()
  const proof = new Editor({
    element: null,
    extensions: createRichExtensions(proofCodec),
    content: '',
    editable: false
  })
  let applying = true
  let source = options.content
  let canonical = ''

  const roundTrip = (markdown: string): string | null => {
    try {
      proof.commands.setContent(encodeRawMarkdownHtmlForRichEditor(markdown, proofCodec), { contentType: 'markdown', emitUpdate: false })
      normalizeEmptyListItems(proof)
      return proof.getMarkdown()
    } catch {
      return null
    }
  }

  const editor = new Editor({
    element: options.element,
    extensions: createRichExtensions(codec, options.codeBlockNodeView),
    content: encodeRawMarkdownHtmlForRichEditor(source, codec),
    contentType: 'markdown',
    editable: options.editable,
    editorProps: {
      attributes: { class: 'rich-markdown-editor', spellcheck: 'true' }
    },
    onUpdate() {
      if (!applying) options.onChange(getMarkdown())
    }
  })
  normalizeEmptyListItems(editor)
  canonical = editor.getMarkdown()
  applying = false

  function getMarkdown(): string {
    const edited = editor.getMarkdown()
    if (edited === canonical) return source
    let reconciled = reconcileSerializedMarkdown({ originalSource: source, baseCanonical: canonical, edited, roundTrip })
    if (reconciled === restoreMarkdownSourceEol(edited, source)) {
      reconciled = reconcileRichMarkdownBlockSource(editor, source, edited, roundTrip) ?? reconciled
    }
    source = reconciled
    canonical = edited
    return source
  }

  function setMarkdown(markdown: string, { resetHistory = false }: { resetHistory?: boolean } = {}): void {
    const unchanged = markdown === getMarkdown()
    if (unchanged && !resetHistory) return
    applying = true
    try {
      if (!unchanged) {
        editor.commands.setContent(encodeRawMarkdownHtmlForRichEditor(markdown, codec), { contentType: 'markdown', emitUpdate: false })
        normalizeEmptyListItems(editor)
      }
      if (resetHistory) {
        // A replacement from outside the editor starts a new document history.
        // Keeping the old history could resurrect the pre-replacement document.
        editor.view.updateState(EditorState.create({
          schema: editor.schema,
          doc: editor.state.doc,
          plugins: editor.state.plugins
        }))
      }
      source = markdown
      canonical = editor.getMarkdown()
    } finally {
      applying = false
    }
  }

  return {
    editor,
    getMarkdown,
    setMarkdown,
    dispose() { editor.destroy(); proof.destroy() }
  }
}

export { createRichExtensions }
