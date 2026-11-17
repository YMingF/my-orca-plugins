import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../orca-raw-markdown-rich-dev', import.meta.url)))
const initial = await readFile(resolve(root, 'sample.md'), 'utf8')
const bootstrap = `
window.__testState = { value: ${JSON.stringify(initial)}, readOnly: false, changes: [], errors: [] };
window.addEventListener('error', e => window.__testState.errors.push(String(e.error || e.message)));
window.addEventListener('unhandledrejection', e => window.__testState.errors.push(String(e.reason)));
const replacements = [];
const events = new Map();
window.orca = {
  on(name, handler) { const list = events.get(name) || []; list.push(handler); events.set(name,list); return {dispose(){}}; },
  document: { async session() {
    return {
      get value() {return window.__testState.value},
      get readOnly() {return window.__testState.readOnly},
      change(value) { if (!window.__testState.readOnly) {window.__testState.value = value; window.__testState.changes.push(value)} },
      onReplace(fn) {replacements.push(fn); return {dispose(){}}},
      async flush() {}, dispose() {}
    }
  } }
};
window.__replaceDocument = (value, readOnly=false) => {window.__testState.value=value;window.__testState.readOnly=readOnly;replacements.forEach(fn=>fn(value))};
window.__flushDocument = async () => {for(const fn of events.get('editor.flush') || []) await fn()};
document.documentElement.classList.add('dark');
`
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.writeHead(302, { location: '/editor/index.html' }); res.end(); return }
    if (req.url === '/bootstrap.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(bootstrap); return
    }
    const url = new URL(req.url, 'http://localhost')
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/editor/index.html' : url.pathname))
    if (!path.startsWith(root + '/')) {res.writeHead(403);res.end();return}
    let data = await readFile(path)
    if (extname(path) === '.html') data = Buffer.from(data.toString().replace('<body>', '<body><script src="/bootstrap.js"></script>'))
    res.writeHead(200, {
      'content-type': mime[extname(path)] || 'application/octet-stream',
      'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'"
    })
    res.end(data)
  } catch (error) {res.writeHead(404); res.end('Not found')}
})
server.listen(0, '127.0.0.1', () => console.log(`TEST_HOST http://127.0.0.1:${server.address().port}/`))
