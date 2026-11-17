import { Code } from '@tiptap/extension-code'
import { Image } from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import type { AnyExtension, NodeViewRenderer } from '@tiptap/core'
import { createRichMarkdownExtension } from './upstream/src/renderer/src/components/editor/rich-markdown/schema/rich-markdown-extension'
import { RichMarkdownParagraph } from './upstream/src/renderer/src/components/editor/rich-markdown/schema/rich-markdown-paragraph'
import { RichMarkdownTrailingParagraph } from './upstream/src/renderer/src/components/editor/rich-markdown/schema/rich-markdown-trailing-paragraph'
import { DragSelectionGuard } from './upstream/src/renderer/src/components/editor/rich-markdown/schema/drag-selection-guard'
import { RichMarkdownOrderedList } from './upstream/src/renderer/src/components/editor/rich-markdown/lists/rich-markdown-ordered-list'
import { RichMarkdownTaskItem } from './upstream/src/renderer/src/components/editor/rich-markdown/lists/rich-markdown-task-item'
import { RichMarkdownTaskList } from './upstream/src/renderer/src/components/editor/rich-markdown/lists/rich-markdown-task-list'
import { createOrcaDetailsExtensions, getRichMarkdownPlaceholder } from './upstream/src/renderer/src/components/editor/rich-markdown/details/rich-markdown-details-extension'
import { RichMarkdownTable } from './upstream/src/renderer/src/components/editor/rich-markdown/tables/rich-markdown-table'
import { createMarkdownDocLink } from './upstream/src/renderer/src/components/editor/rich-markdown/doc-links/rich-markdown-doc-link'
import { createRawMarkdownHtmlBlock, createRawMarkdownHtmlInline, createRichMarkdownLiteral } from './upstream/src/renderer/src/components/editor/rich-markdown/raw-source/raw-markdown-html-nodes'
import type { RichMarkdownEditorCodec } from './upstream/src/renderer/src/components/editor/rich-markdown/document/rich-markdown-source-transport'
import { RichMarkdownCodeBlockLowlight } from './upstream/src/renderer/src/components/editor/rich-markdown/code-blocks/rich-markdown-lowlight'
import { RichMarkdownLink } from './upstream/src/renderer/src/components/editor/rich-markdown/links/rich-markdown-link-mark'

const lowlight = createLowlight(common)

/** Orca's portable schema; document-file loading and review highlighting belong to its host. */
export function createRichExtensions(codec: RichMarkdownEditorCodec, codeBlockNodeView?: NodeViewRenderer): AnyExtension[] {
  const codeBlock = codeBlockNodeView
    ? RichMarkdownCodeBlockLowlight.extend({ addNodeView: () => codeBlockNodeView })
    : RichMarkdownCodeBlockLowlight
  return [
    StarterKit.configure({ link: false, code: false, codeBlock: false, orderedList: false, paragraph: false, trailingNode: false }),
    RichMarkdownParagraph,
    RichMarkdownTrailingParagraph,
    Code.extend({ excludes: 'code bold italic strike underline' }),
    codeBlock.configure({ lowlight, defaultLanguage: null }),
    RichMarkdownLink.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    // The sandbox cannot fetch document-relative resources. Keep the authored image node/source.
    Image.configure({ allowBase64: true, inline: true }),
    RichMarkdownOrderedList,
    RichMarkdownTaskList,
    RichMarkdownTaskItem.configure({ nested: true }),
    ...createOrcaDetailsExtensions(),
    RichMarkdownTable.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    createRichMarkdownLiteral(codec.transport),
    createRawMarkdownHtmlInline(codec.transport),
    createRawMarkdownHtmlBlock(codec.transport),
    createMarkdownDocLink(codec.transport),
    DragSelectionGuard,
    createRichMarkdownExtension(codec).configure({ marked: codec.marked, markedOptions: { gfm: true } }),
    Placeholder.configure({ includeChildren: true, placeholder: getRichMarkdownPlaceholder })
  ]
}
