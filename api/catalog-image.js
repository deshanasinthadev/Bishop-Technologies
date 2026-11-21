import { hostedConfig } from '../src/hosted-config.js'
import { readImage, validImageSignature } from '../server/media.js'

const imageTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const imagePath = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/

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

  const config = hostedConfig(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  if (!config) return response.status(503).end()
  const { url, key } = config

  try {
    const image = await fetch(new URL('/storage/v1/object/authenticated/bishop-products/' + path, url), {
      headers: { apikey: key },
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    })
    if (!image.ok) return response.status(image.status >= 500 ? 502 : 404).end()
    if (image.headers.get('content-type')?.split(';')[0] !== imageTypes[match[1]]) return response.status(404).end()
    const bytes = await readImage(image)
    if (!bytes || !validImageSignature(bytes, match[1])) return response.status(404).end()
    response.setHeader('Content-Type', imageTypes[match[1]])
    return request.method === 'HEAD' ? response.status(200).end() : response.status(200).send(bytes)
  } catch {
    return response.status(502).end()
  }
}
