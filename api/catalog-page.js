import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { escapeHtml as escape, productionOrigin } from '../server/seo.js'
import { hostedConfig } from '../src/hosted-config.js'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
async function fetchProduct(slug) {
  const config = hostedConfig(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  if (!config) throw new Error('Catalog configuration missing')
  const { url, key } = config
  const response = await fetch(new URL('/rest/v1/rpc/bishop_catalog', url), {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_slug: slug }),
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error('Catalog unavailable')
  return (await response.json()).products[0]
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD')
    return response.status(405).end()
  }

  const slug = typeof request.query.slug === 'string' ? request.query.slug : ''
  if (!slugPattern.test(slug) || slug.length > 100) return response.status(404).end()
  try {
    const template = await readFile(resolve('dist/store/index.html'), 'utf8')
    const product = await fetchProduct(slug)
    const title = product ? product.name + ' | Bishop Technologies' : 'Product unavailable | Bishop Technologies'
    const description = product ? product.description.replace(/\s+/g, ' ').trim().slice(0, 155) : 'This product is unavailable.'
    const indexable = process.env.VERCEL_ENV === 'production' && !!product
    const meta = [
      '<meta name="description" content="' + escape(description) + '">',
      '<meta property="og:title" content="' + escape(title) + '">',
      '<meta property="og:description" content="' + escape(description) + '">',
    ]
    if (indexable && process.env.SITE_ORIGIN) {
      const canonical = productionOrigin(process.env.SITE_ORIGIN) + '/store/' + slug
      meta.push('<link rel="canonical" href="' + escape(canonical) + '">')
      meta.push('<meta property="og:url" content="' + escape(canonical) + '">')
    }
    if (!indexable) response.setHeader('X-Robots-Tag', 'noindex')
    const fallback = product
      ? '<h1>' + escape(product.name) + '</h1><p>' + escape(product.description) + '</p>'
      : '<h1>Product unavailable</h1><p><a href="/store">Browse the Store</a></p>'
    const html = template.replace(/<title>.*?<\/title>/, () => '<title>' + escape(title) + '</title>')
      .replace(/<(?:meta (?:name="description"|property="og:(?:url|title|description)")|link rel="canonical")[^>]*>\s*/g, '')
      .replace('</head>', () => meta.join('\n') + '\n</head>')
      .replace('<div id="root"></div>', () => '<div id="root"><main class="shell store-page">' + fallback + '</main></div>')
    response.status(product ? 200 : 404)
    return request.method === 'HEAD' ? response.end() : response.send(html)
  } catch {
    response.setHeader('X-Robots-Tag', 'noindex')
    return response.status(503).end(request.method === 'HEAD' ? undefined : 'Product details are temporarily unavailable.')
  }
}
