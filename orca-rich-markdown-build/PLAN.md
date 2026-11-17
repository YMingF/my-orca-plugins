# Markdown editor migration

Target and live plugin: `/Users/alex/Orca 插件/orca-raw-markdown-rich-dev`.
The former separate runtime copy was removed after switching Orca to this directory.
Upstream baseline: Orca 1.4.259, commit 73b3f872ed2397bf7a53da343b509eab2b3eed18.

Scope authorized: Markdown rich viewing and editing, Raw/Rich switching, retain full-source
copy. No Agent/review/workspace/file-navigation/local-or-remote-image integrations.

Ownership:
- Main agent: dependency setup, UI, Raw/Rich synchronization, copy, packaging, live loading.
- Port worker: original Markdown codec, source preservation, pure custom nodes/extensions;
  files under editor/rich only. No UI or manifest changes.
- Check worker after implementation: regression review and fixes, bounded to this plugin.

Acceptance:
- Preserve upstream Markdown parsing/serialization rules; use actual upstream code where portable.
- Rich editing covers headings, emphasis, lists/tasks, quotes, code, tables, links, math,
  details and preserved raw HTML/literals. Render diagrams as supported by upstream code blocks.
- No-edit switching must preserve exact original Markdown. Edits preserve untouched source when possible.
- Source copy includes pending rich edits and uses the supported synchronous clipboard path.
- Read-only, external replacements, conflicts, saving and undo/redo receive explicit verification.
- No fake host APIs, silent data loss, application patching, commit or publication.

Sequence: port core + build UI; run build/types/behavior tests; independent review;
render in Orca; update live plugin only after checks; confirm copy with real user gesture.

Completed:
- 36 portable upstream modules, standalone rich controller and source reconciliation migrated.
- Raw/Rich UI, formatting, table controls, math dialogs, Mermaid preview, slash menu,
  outline, search/replace and synchronous full-source copy built into a 6.5 MiB plugin.
- 12 real jsdom/Tiptap regression tests and 4 official document-session tests pass.
- Strict TypeScript and Orca static editor check pass with zero issues/warnings.
- Browser UI checks pass: incremental edit preserves untouched source, undo exact,
  search replacement, Raw -> Rich edits, formula insert/edit, slash menu, table insert,
  read-only copying and Mermaid rendering. Actual macOS clipboard equality checked for
  full source and for combined Raw + Rich pending edits.
- Actual Orca live editor rendering succeeds without errors; native automatic input remains
  unavailable due to existing macOS Accessibility permission. No claim of native save E2E.
- Live directory promoted to 0.2.0 and remains the only registered development plugin.
  Backup: ../orca-raw-markdown-backup-0.1.0-20261116-1635.
- Preview registration removed; test browser space closed and local test server stopped.
