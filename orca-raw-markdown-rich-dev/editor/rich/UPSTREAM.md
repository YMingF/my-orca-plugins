# Orca rich Markdown core

Portable parsing, schema nodes, source transport and source-preserving reconciliation
are copied from Orca 1.4.259, commit
`73b3f872ed2397bf7a53da343b509eab2b3eed18`.

Source: https://github.com/stablyai/orca/tree/73b3f872ed2397bf7a53da343b509eab2b3eed18

The original directory structure is retained under `upstream/` so relative imports and
source provenance remain reviewable. The details extension's application translation
calls are replaced by its original English labels. The standalone schema retains
original Markdown nodes while replacing host-owned image loading with Tiptap's
image node. File navigation, Agent/review integrations and document-file image access
are outside the approved plugin scope.

Adaptation: source reconciliation follows upstream's character-first, block-second
commit ordering. Its safety proof additionally normalizes the edited target through
the same Markdown parser when the serializer emits a transient noncanonical form
(for example, a trailing space at the end of an ATX heading). Candidate and edited
Markdown must still parse equivalently; this prevents unrelated tables and blank
lines from being canonicalized while typing that space. Regression tests cover
incremental heading edits and undo, plus actual table, mark and raw-HTML changes.

MIT License

Copyright (c) 2026 Lovecast Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
