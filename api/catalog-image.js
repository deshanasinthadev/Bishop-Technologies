const imageTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const imagePath = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/

function hasSignature(bytes, extension) {
  if (extension === 'jpg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (extension === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    return response.status(405).end()
  }

  const path = typeof request.query.path === 'string' ? request.query.path : ''
  const match = imagePath.exec(path)
  if (!match) return response.status(404).end()

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key?.startsWith('sb_publishable_')) return response.status(503).end()

  try {
    const image = await fetch(new URL('/storage/v1/object/authenticated/bishop-products/' + path, url), {
      headers: { apikey: key },
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    })
    if (!image.ok) return response.status(image.status >= 500 ? 502 : 404).end()
    if (image.headers.get('content-type')?.split(';')[0] !== imageTypes[match[1]]) return response.status(404).end()
    const bytes = Buffer.from(await image.arrayBuffer())
    if (bytes.length > 2097152 || !hasSignature(bytes, match[1])) return response.status(404).end()
    response.setHeader('Content-Type', imageTypes[match[1]])
    return request.method === 'HEAD' ? response.status(200).end() : response.status(200).send(bytes)
  } catch {
    return response.status(502).end()
  }
}
