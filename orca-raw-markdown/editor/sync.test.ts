import { assert, mockEditorHost, test } from 'orca/testing'
import { start } from './sync'

test('keeps exact source available for copying including CRLF and trailing whitespace', async () => {
  const source = '# 标题\r\n\r\n**加粗**  \r\n[链接](https://example.com)\r\n```ts\r\nconst x = 1\r\n```\r\n'
  const host = mockEditorHost({ text: source })
  const doc = await start()
  try {
    assert.equal(doc.value, source)
    assert.equal(host.text, source)
  } finally {
    doc.dispose()
    host.dispose()
  }
})

test('exposes the latest draft for copying before it is sent to Orca', async () => {
  const host = mockEditorHost({ text: 'original' })
  const doc = await start()
  try {
    const draft = '# 尚未保存\n\n- [ ] 最新内容\n'
    doc.change(draft)
    assert.equal(host.text, 'original')
    assert.equal(doc.value, draft)
    await host.flush()
    assert.equal(host.text, draft)
  } finally {
    doc.dispose()
    host.dispose()
  }
})

test('accepts external replacement without concatenating Markdown documents', async () => {
  const host = mockEditorHost({ text: 'original' })
  const doc = await start()
  try {
    const replaced = new Promise<void>((resolve) => doc.onReplace(() => resolve()))
    host.replace('# 外部更新\n')
    await replaced
    assert.equal(doc.value, '# 外部更新\n')
  } finally {
    doc.dispose()
    host.dispose()
  }
})

test('exposes an empty document without adding placeholder content', async () => {
  const host = mockEditorHost({ text: '' })
  const doc = await start()
  try {
    assert.equal(doc.value, '')
  } finally {
    doc.dispose()
    host.dispose()
  }
})
