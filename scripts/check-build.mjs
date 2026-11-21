import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [, , directory = 'dist', mode = 'local'] = process.argv
const origin = 'https://bishop.example.test'
const noindex = /<meta name="robots" content="noindex, nofollow">/

for (const route of ['/', '/repair', '/store', '/web-software', '/admin']) {
  const html = await readFile(resolve(directory, route.slice(1), 'index.html'), 'utf8')
  assert.match(html, /<title>[^<]+<\/title>/, route)
  const script = html.match(/<script type="module"[^>]+src="\/([^"]+)"/)
  assert.ok(script, 'Missing entry script for ' + route)
  await access(resolve(directory, script[1]))

  if (route === '/admin' || mode === 'preview') assert.match(html, noindex, route)
  if (mode === 'production' && route !== '/admin') {
    assert.ok(html.includes('<link rel="canonical" href="' + origin + route + '">'), route)
    assert.doesNotMatch(html, noindex, route)
  }
}

const robots = await readFile(resolve(directory, 'robots.txt'), 'utf8')
if (mode === 'production') {
  assert.ok(robots.includes('Disallow: /admin'))
  const sitemap = await readFile(resolve(directory, 'sitemap.xml'), 'utf8')
  assert.ok(sitemap.includes('<loc>' + origin + '/store</loc>'))
  assert.ok(!sitemap.includes('/admin'))
} else {
  assert.equal(robots, 'User-agent: *\nDisallow: /\n')
  await assert.rejects(access(resolve(directory, 'sitemap.xml')), { code: 'ENOENT' })
}

console.log('Verified route assets and indexing rules for ' + mode + '.')
