import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hostedConfig } from '../src/hosted-config.js'
import { escapeHtml, productionOrigin } from '../server/seo.js'

test('hosted configuration accepts publishable credentials and origin-only URLs', () => {
  const key = 'sb_publishable_fixture'
  assert.deepEqual(hostedConfig('https://catalog.example.test/', key), { url: 'https://catalog.example.test', key })
  assert.deepEqual(hostedConfig('http://127.0.0.1:54321', key), { url: 'http://127.0.0.1:54321', key })
  for (const url of ['http://catalog.example.test', 'https://catalog.example.test/path', 'https://staff:secret@catalog.example.test', 'invalid']) {
    assert.equal(hostedConfig(url, key), null)
  }
  assert.equal(hostedConfig('https://catalog.example.test', 'sb_secret_fixture'), null)
})

test('canonical origins and escaped metadata are safe for HTML attributes', () => {
  assert.equal(productionOrigin('https://bishop.example.test/'), 'https://bishop.example.test')
  assert.equal(productionOrigin(''), '')
  assert.throws(() => productionOrigin('http://bishop.example.test'), /HTTPS origin/)
  assert.throws(() => productionOrigin('https://bishop.example.test/#fragment'), /HTTPS origin/)
  assert.equal(escapeHtml(`<a title="O'Brien & Co">`), '&lt;a title=&quot;O&#39;Brien &amp; Co&quot;&gt;')
})
