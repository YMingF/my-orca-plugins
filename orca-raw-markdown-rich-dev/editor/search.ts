import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const searchKey = new PluginKey<DecorationSet>('rawRichSearch')
type Match = { from: number; to: number }

export function installSearch(editor: Editor) {
  editor.registerPlugin(new Plugin({
    key: searchKey,
    state: {
      init: () => DecorationSet.empty,
      apply: (tr, old) => tr.getMeta(searchKey) ?? old.map(tr.mapping, tr.doc)
    },
    props: { decorations: state => searchKey.getState(state) }
  }))
  let matches: Match[] = []
  let active = -1
  let query = ''
  let caseSensitive = false
  let wholeWord = false

  function update(next = query, matchCase = caseSensitive, word = wholeWord): number {
    query = next
    caseSensitive = matchCase
    wholeWord = word
    matches = []
    if (query) {
      const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'gu' : 'giu')
      editor.state.doc.descendants((node, pos) => {
        if (!node.isTextblock) return
        // Atom placeholders own their original source and must never be replaced as text.
        const positions: number[] = []
        let text = ''
        node.descendants((child, offset) => {
          if (child.isText) {
            for (let i = 0; i < (child.text?.length ?? 0); i++) positions.push(pos + 1 + offset + i)
            text += child.text
          } else if (child.isLeaf) {
            positions.push(-1)
            text += '\u0000'
          }
        })
        for (const match of text.matchAll(pattern)) {
          const at = match.index
          const end = at + match[0].length
          if (wholeWord && (/[\p{L}\p{N}_]/u.test(text[at - 1] ?? '') || /[\p{L}\p{N}_]/u.test(text[end] ?? ''))) continue
          if (positions.slice(at, end).some(p => p < 0)) continue
          if (positions[at] !== undefined && positions[end - 1] !== undefined) matches.push({ from: positions[at], to: positions[end - 1] + 1 })
        }
        return false
      })
    }
    active = matches.length ? Math.min(Math.max(active, 0), matches.length - 1) : -1
    paint()
    return matches.length
  }

  function paint() {
    const marks = matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === active ? 'search-match active' : 'search-match' }))
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, DecorationSet.create(editor.state.doc, marks)))
  }

  return {
    update,
    move(direction: number) {
      update()
      if (!matches.length) return
      active = (active + direction + matches.length) % matches.length
      const match = matches[active]
      editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, match.from, match.to)).scrollIntoView())
      paint()
    },
    replace(value: string, all: boolean) {
      update()
      if (!editor.isEditable || !matches.length) return
      let tr = editor.state.tr
      for (const m of (all ? matches : [matches[active]]).slice().reverse()) tr = tr.insertText(value, m.from, m.to)
      editor.view.dispatch(tr)
      update()
    },
    clear() { update('') }
  }
}
