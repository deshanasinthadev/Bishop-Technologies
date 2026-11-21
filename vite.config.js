import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { defineConfig } from 'vite'

const pages = {
  repair: ['Device Repairs | Bishop Technologies', 'Enquire about laptop, desktop PC, and phone repairs in Sri Lanka.'],
  store: ['Tech Store | Bishop Technologies', 'Browse SSDs, RAM, chargers, and accessories from Bishop Technologies.'],
  'web-software': ['Web & Software | Bishop Technologies', 'Business websites, online booking systems, and custom software for small businesses in Sri Lanka.'],
  admin: ['Site Editor | Bishop Technologies', 'Manage your Bishop Technologies website.'],
}

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [{
    name: 'static-page-entries',
    async closeBundle() {
      const index = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8')
      await Promise.all(Object.entries(pages).map(async ([route, [title, description]]) => {
        const directory = new URL(`./dist/${route}/`, import.meta.url)
        const html = index.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
          .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}">`)
          .replace('</head>', route === 'admin' ? '  <meta name="robots" content="noindex">\n  </head>' : '</head>')
        await mkdir(directory, { recursive: true })
        await writeFile(new URL('index.html', directory), html)
      }))
    },
  }],
})
