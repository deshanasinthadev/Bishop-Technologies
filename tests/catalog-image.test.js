import assert from 'node:assert/strict'
import { test } from 'node:test'
import handler from '../api/catalog-image.js'

function capture() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.code = code; return this },
    end(body) { this.body = body },
    send(body) { this.body = body },
  }
}

test('catalog image endpoint accepts only supported paths and validated image bytes', async (t) => {
  const path = '10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000002.png'
  const fixtures = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
  const previous = fixtures.map((name) => process.env[name])
  t.after(() => fixtures.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]
    else process.env[name] = previous[index]
  }))
  process.env.VITE_SUPABASE_URL = 'https://supabase.example.test'
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture'
  let body = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  let upstreamStatus = 200
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, 'https://supabase.example.test/storage/v1/object/authenticated/bishop-products/' + path)
    assert.deepEqual(options.headers, { apikey: 'sb_publishable_fixture' })
    return new Response(body, { status: upstreamStatus, headers: { 'Content-Type': 'image/png' } })
  })

  const wrongMethod = capture()
  await handler({ method:'POST', query:{ path } }, wrongMethod)
  assert.equal(wrongMethod.code, 405)
  const invalidPath = capture()
  await handler({ method:'GET', query:{ path:'../image.png' } }, invalidPath)
  assert.equal(invalidPath.code, 404)
  assert.equal(fetch.mock.callCount(), 0)

  const allowed = capture()
  await handler({ method:'GET', query:{ path } }, allowed)
  assert.equal(allowed.code, 200)
  assert.equal(allowed.headers['Content-Type'], 'image/png')
  assert.equal(allowed.headers['Cache-Control'], 'no-store')
  assert.deepEqual(allowed.body, body)

  const head = capture()
  await handler({ method:'HEAD', query:{ path } }, head)
  assert.equal(head.code, 200)
  assert.equal(head.body, undefined)

  body = Buffer.from('not a PNG')
  const malformed = capture()
  await handler({ method:'GET', query:{ path } }, malformed)
  assert.equal(malformed.code, 404)

  upstreamStatus = 403
  const privateImage = capture()
  await handler({ method:'GET', query:{ path } }, privateImage)
  assert.equal(privateImage.code, 404)
})
