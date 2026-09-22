import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('build: admin diferido y excluido de precaché PWA', () => {
  const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'))
  const sw = readFileSync('dist/sw.js', 'utf8')
  const html = readFileSync('dist/index.html', 'utf8')
  const initial = new Set()
  function visit(key) {
    if (initial.has(key)) return
    initial.add(key)
    for (const dependency of manifest[key].imports || []) visit(dependency)
  }
  visit('index.html')
  for (const key of initial) assert.ok(!manifest[key].file.startsWith('assets/admin/'))
  const admin = Object.entries(manifest).filter(([key]) => key.startsWith('src/pages/admin/'))
  assert.equal(admin.length, 4)
  for (const [, entry] of admin) {
    assert.equal(entry.isDynamicEntry, true)
    assert.ok(entry.file.startsWith('assets/admin/'))
    assert.ok(!sw.includes(entry.file))
    assert.ok(!html.includes(entry.file))
  }
  assert.ok(!sw.includes('assets/admin/'))
  assert.ok(!readFileSync('src/App.jsx', 'utf8').includes('window.location.reload'))
})
