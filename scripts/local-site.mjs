import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { handleApi } from '../server/api.js'

const host = '127.0.0.1'
const port = 8787
const siteUrl = `http://${host}:${port}`
const allowedHosts = new Set([`${host}:${port}`, `localhost:${port}`])
const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const indexFile = resolve(dist, 'index.html')
const dataDirectory = resolve(root, 'data')
const contentFile = resolve(dataDirectory, 'content.json')
const imageDirectory = resolve(dataDirectory, 'images')
const bodyLimit = 6 * 1024 * 1024
const appRoutes = new Set(['/', '/admin', '/repair', '/store', '/web-software'])

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function imageFile(name) {
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\.(?:jpe?g|png|webp)$/i.test(name)) return null
  return resolve(imageDirectory, name)
}

let pendingSave = Promise.resolve()

const store = {
  async load() {
    try {
      return JSON.parse(await readFile(contentFile, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') return { content: null, revision: 0 }
      throw error
    }
  },

  save(content, revision) {
    const result = pendingSave.then(async () => {
      const current = await store.load()
      if (current.revision !== revision) return null

      const next = { content, revision: revision + 1 }
      const tempFile = resolve(dataDirectory, `content-${randomUUID()}.tmp`)
      await mkdir(dataDirectory, { recursive: true })
      try {
        await writeFile(tempFile, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx' })
        await rename(tempFile, contentFile)
      } finally {
        await rm(tempFile, { force: true })
      }
      return next
    })
    pendingSave = result.catch(() => undefined)
    return result
  },

  async putImage(name, bytes, type) {
    const file = imageFile(name)
    if (!file || mimeTypes[extname(file).toLowerCase()] !== type) throw new Error('Invalid image filename or type')
    await mkdir(imageDirectory, { recursive: true })
    await writeFile(file, Buffer.from(bytes), { flag: 'wx' })
  },

  async getImage(name) {
    const file = imageFile(name)
    if (!file) return null
    try {
      return { body: await readFile(file), type: mimeTypes[extname(file).toLowerCase()] }
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  },
}

function sendText(outgoing, status, message, headers = {}) {
  outgoing.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers })
  outgoing.end(message)
}

async function readBody(incoming) {
  if (Number(incoming.headers['content-length']) > bodyLimit) return null

  const chunks = []
  let length = 0
  for await (const chunk of incoming.iterator({ destroyOnReturn: false })) {
    length += chunk.length
    if (length > bodyLimit) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, length)
}

async function serveStatic(pathname, outgoing, head) {
  let pathnameDecoded
  try {
    pathnameDecoded = decodeURIComponent(pathname)
  } catch {
    return sendText(outgoing, 400, 'Invalid path.')
  }
  if (pathnameDecoded.includes('\\') || pathnameDecoded.includes('\0')) {
    return sendText(outgoing, 400, 'Invalid path.')
  }

  const route = pathnameDecoded.replace(/\/+$/, '') || '/'
  const file = appRoutes.has(route) ? resolve(dist, route.slice(1), 'index.html') : resolve(dist, pathnameDecoded.slice(1))
  if (!file.startsWith(dist + sep)) return sendText(outgoing, 404, 'Page not found.')

  try {
    const body = await readFile(file)
    outgoing.writeHead(200, {
      'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.byteLength,
      'Cache-Control': 'no-cache',
    })
    outgoing.end(head ? undefined : body)
  } catch (error) {
    if (['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) return sendText(outgoing, 404, 'Page not found.')
    throw error
  }
}

async function serve(incoming, outgoing) {
  outgoing.setHeader('X-Content-Type-Options', 'nosniff')
  const { host: requestedHost, origin } = incoming.headers
  if (!allowedHosts.has(requestedHost)) return sendText(outgoing, 403, 'This site is available on this PC.')

  const localOrigin = `http://${requestedHost}`
  const url = new URL(incoming.url, localOrigin)
  if (url.origin !== localOrigin || !incoming.url.startsWith('/')) return sendText(outgoing, 400, 'Invalid URL.')

  const { method } = incoming
  const head = method === 'HEAD'
  const readOnly = head || method === 'GET'
  let body
  if (!readOnly) {
    if (origin && origin !== localOrigin) return sendText(outgoing, 403, 'Open the local dashboard to make changes.')
    if (!url.pathname.startsWith('/api/')) return sendText(outgoing, 405, 'Method not allowed.')
    body = await readBody(incoming)
    if (body === null) return sendText(outgoing, 413, 'The request is too large.', { Connection: 'close' })
  }

  const request = new Request(url, { method, headers: incoming.headers, body })
  const response = await handleApi(request, { isAdmin: true, signedIn: true, store, sourceDownload: null })
  if (response) {
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    if (response.body && !head) await pipeline(Readable.fromWeb(response.body), outgoing)
    else outgoing.end()
    return
  }

  if (!readOnly) return sendText(outgoing, 405, 'Method not allowed.')
  await serveStatic(url.pathname, outgoing, head)
}

function openDashboard() {
  const adminUrl = `${siteUrl}/admin`
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  const argumentsForBrowser = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', adminUrl] : [adminUrl]
  const child = spawn(command, argumentsForBrowser, { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', () => console.log(`Open ${adminUrl} in your browser.`))
  child.unref()
}

try {
  await access(indexFile)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  console.error('The built website is missing. Run npm ci and npm run build, then start it again.')
  process.exit(1)
}

const server = createServer((incoming, outgoing) => {
  serve(incoming, outgoing).catch((error) => {
    console.error(error)
    if (outgoing.headersSent) outgoing.destroy()
    else sendText(outgoing, 500, 'The website could not complete this request.')
  })
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is in use. Close the other local server or open ${siteUrl}/admin if it is already running.`)
  else console.error(error)
  process.exitCode = 1
})

server.listen(port, host, () => {
  console.log(`Website   ${siteUrl}/`)
  console.log(`Admin     ${siteUrl}/admin`)
  console.log('Press Ctrl+C to stop the website.')
  if (process.argv.includes('--open')) openDashboard()
})
