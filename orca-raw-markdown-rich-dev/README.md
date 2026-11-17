# Raw Markdown Copy 0.2

An Orca custom editor with **Raw / 富文本** modes and a persistent
**复制全部 Markdown** button. Rich Markdown parsing and source-preserving editing
are ported from Orca 1.4.259, commit `73b3f872ed2397bf7a53da343b509eab2b3eed18`.
It does not modify the Orca application.

## Use

Open a `.md`, `.markdown`, `.mdown`, `.mkd`, or `.mkdn` file and choose **Raw + Copy**
in Orca's editor view selector. Inside the plugin:

- **富文本** renders Markdown and allows direct editing. The toolbar includes headings,
  emphasis, lists/tasks, quotes, code, links, tables, details, undo/redo,
  an outline and find/replace. Typing `/` opens the block menu.
  Double-click a link to edit its address. Code blocks have language and copy controls.
- **Raw** edits the actual Markdown. Long lines wrap to the editor width for display,
  without inserting line breaks into the source. Switching to Rich uses the latest Raw edits.
- **复制全部 Markdown** copies the whole current source in either mode, including unsaved
  edits. On Mac, press **Command + Shift + C**. Copying does not save or modify the document.
  Read-only documents can be copied.
- **清空全部** clears the current document in either mode; save to write the change to disk.
  On Mac, press **Command + Shift + X**. Read-only documents cannot be cleared.
  Both shortcuts apply inside this editor, excluding search fields and edit dialogs.
- Use Orca's normal Save action to save. Unedited mode switches preserve exact source;
  rich edits preserve untouched source formatting through the original reconciliation logic.
  Actual Raw-textarea edits normalize line endings to LF.

`rich-demo.md` is a sample document with tasks, tables and a code block.

## Scope and data handling

This port includes Markdown viewing/editing, not Orca's Agent, review-note, workspace
navigation or file-resource integrations. Document links and raw HTML are preserved
as source-owned nodes; unsupported HTML is not executed. The isolated plugin cannot
load document-relative or external image URLs; authored image Markdown is preserved,
and embedded `data:image` content can display. No network, Node worker or additional
host capabilities are requested. Runtime dependencies are bundled locally.
Formula markup stays as ordinary text, and fenced Mermaid source stays as an ordinary
code block; neither formulas nor diagrams are rendered.

External replacements use Orca's document session/conflict behavior and reset rich
undo history. The plugin does not concatenate competing documents. Source-owned HTML
or unsupported syntax can be edited in Raw mode. Errors are shown in the toolbar.

Clipboard writing is synchronous in the click handler, through `execCommand('copy')`
and a `copy` event containing the exact plain-text source. The async Clipboard API
is deliberately not used because Orca denies it in isolated plugin frames.

## Files and local loading

Runtime entry: `editor/index.html` -> `editor/dist/app.js` + `app.css`.
Editable UI source: `editor/app.ts`, `search.ts`, `code-view.ts`, `copy.ts` and `style.css`.
Ported upstream modules and adaptation notes: `editor/rich/UPSTREAM.md`.
Third-party license texts: `THIRD_PARTY_NOTICES.md`.

```sh
orca plugin dev load '/Users/alex/Orca 插件/orca-raw-markdown-rich-dev' --json
```

Keep this directory; Orca loads it as a development plugin. Application updates do not
replace it, although future plugin API changes may require adaptation.

## Build and verify

Build tools, pinned dependency lockfile and rich-editor regression tests live in
the sibling `../orca-rich-markdown-build` directory, outside the runtime plugin:

```sh
cd '/Users/alex/Orca 插件/orca-rich-markdown-build'
npm run typecheck
npm test
npm run build
```

The build targets this plugin directory, `../orca-raw-markdown-rich-dev`.
Its generated `editor/dist/` files are loaded directly by Orca.
No build tools or node_modules are required for the installed editor to run.

```sh
orca plugin test '/Users/alex/Orca 插件/orca-raw-markdown-rich-dev' --json
orca plugin check '/Users/alex/Orca 插件/orca-raw-markdown-rich-dev' --json
```
