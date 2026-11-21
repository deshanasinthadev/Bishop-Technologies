import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

const home = ['Bishop Technologies | Repairs, Tech & Software', 'Bishop Technologies offers device repairs, tech products, and custom websites and software for small businesses in Sri Lanka.']
const pages = {
  repair: ['Device Repairs | Bishop Technologies', 'Enquire about laptop, desktop PC, and phone repairs in Sri Lanka.'],
  store: ['Tech Store | Bishop Technologies', 'Browse technology products, compare options, and enquire about availability.'],
  'web-software': ['Web & Software | Bishop Technologies', 'Business websites, online booking systems, and custom software for small businesses in Sri Lanka.'],
  admin: ['Site Editor | Bishop Technologies', 'Manage your Bishop Technologies website.'],
}

function productionOrigin(value) {
  if (!value) return ''
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.href !== url.origin + '/') throw new Error('SITE_ORIGIN must be an HTTPS origin without a path.')
  return url.origin
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = productionOrigin(env.SITE_ORIGIN)
  const hosted = mode === 'hosted'
  const indexable = hosted && ['production', undefined].includes(process.env.VERCEL_ENV)
  let output
  return {
    esbuild: { jsx: 'automatic' },
    plugins: [{
      name: 'static-page-entries',
      apply: 'build',
      configResolved(config) { output = resolve(config.root, config.build.outDir) },
      async closeBundle() {
        const index = await readFile(resolve(output, 'index.html'), 'utf8')
        await Promise.all(Object.entries({ '': home, ...pages }).map(async ([route, [title, description]]) => {
          const directory = resolve(output, route)
          const path = route ? '/' + route : '/'
          const privatePage = route === 'admin'
          const metadata = privatePage || (hosted && !indexable)
            ? '<meta name="robots" content="noindex, nofollow">'
            : [
              '<meta property="og:type" content="website">',
              '<meta property="og:site_name" content="Bishop Technologies">',
              '<meta property="og:title" content="' + escapeHtml(title) + '">',
              '<meta property="og:description" content="' + escapeHtml(description) + '">',
              '<meta name="twitter:card" content="summary_large_image">',
              ...(origin && indexable ? [
                '<link rel="canonical" href="' + escapeHtml(origin + path) + '">',
                '<meta property="og:url" content="' + escapeHtml(origin + path) + '">',
                '<meta property="og:image" content="' + escapeHtml(origin + '/images/hero-repair.webp') + '">',
                ...(route === '' ? ['<script type="application/ld+json">' + JSON.stringify({
                  '@context': 'https://schema.org', '@type': 'LocalBusiness',
                  name: 'Bishop Technologies', url: origin + '/', image: origin + '/images/hero-repair.webp',
                  areaServed: 'Sri Lanka',
                }).replaceAll('<', '\\u003c') + '</script>'] : []),
              ] : []),
            ].join('\n  ')
          const html = index.replace(/<title>.*?<\/title>/, () => '<title>' + escapeHtml(title) + '</title>')
            .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => '<meta name="description" content="' + escapeHtml(description) + '">')
            .replace('</head>', () => '  ' + metadata + '\n  </head>')
          await mkdir(directory, { recursive: true })
          await writeFile(resolve(directory, 'index.html'), html)
        }))

        const sitemap = indexable && origin
          ? '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            ['/', '/repair', '/store', '/web-software'].map((route) => '  <url><loc>' + escapeHtml(origin + route) + '</loc></url>').join('\n') +
            '\n</urlset>\n'
          : null
        await writeFile(resolve(output, 'robots.txt'), indexable
          ? 'User-agent: *\nDisallow: /admin\nDisallow: /api/\n' + (sitemap ? 'Sitemap: ' + origin + '/sitemap.xml\n' : '')
          : 'User-agent: *\nDisallow: /\n')
        if (sitemap) await writeFile(resolve(output, 'sitemap.xml'), sitemap)
      },
    }],
  }
})
