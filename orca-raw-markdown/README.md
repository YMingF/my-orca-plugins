# Raw Markdown Copy

An Orca custom editor that displays Markdown source and copies the complete current
document in one click. It uses the official document session API and does not modify
the Orca application.

## Use

Open a `.md`, `.markdown`, `.mdown`, `.mkd`, or `.mkdn` file and select **Raw + Copy**
in the editor view selector. Click **复制全部 Markdown** to copy the current source,
including unsaved edits. Copying does not save or modify the file. Use Orca's normal
Save action to save edits. Read-only files can still be copied.

Copy runs synchronously during the button click using `execCommand('copy')` and a
`copy` event that supplies the exact plain-text source. Orca's isolated plugin session
denies the asynchronous Clipboard API, so `navigator.clipboard.writeText` is not used.

The editor does not render Markdown or provide syntax highlighting. External changes
use Orca's default document session/conflict behavior; the plugin does not concatenate
documents. Unedited source retains its original line endings when copied; editing in
the textarea normalizes line endings to LF. Clipboard failures appear in the toolbar.

## Load locally

```sh
orca plugin dev load /Users/alex/Downloads/test/orca-raw-markdown --json
```

The first load reports the exact approval required. After reviewing it, run the command
Orca returns with its approval fingerprint. This plugin uses an isolated editor frame,
requests no host capabilities, and has no Node worker or external dependencies.
Keep this folder: Orca loads the development plugin from it. Future Orca API changes
may require updating the plugin, but no application patch needs to be reapplied.

## Verify

```sh
orca plugin test /Users/alex/Downloads/test/orca-raw-markdown --json
orca plugin check /Users/alex/Downloads/test/orca-raw-markdown --json
```
