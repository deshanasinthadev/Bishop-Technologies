import { defaultContent } from '../src/content.js'
import { whatsappUrl } from '../src/whatsapp.js'
import { imageExtensions, maxImageBytes, validImageSignature } from './media.js'

const maxContentBytes = 256 * 1024
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders })
}

class InputError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

async function readBytes(request, limit) {
  const tooLarge = () => new InputError('This file or document is too large.', 413)
  if (Number(request.headers.get('Content-Length')) > limit) throw tooLarge()
  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const parts = []
  let size = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw tooLarge()
    }
    parts.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }
  return bytes
}

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError(`Enter valid ${name}.`)
  return value
}

function text(value, name, maxLength, required = false) {
  if (value == null && !required) return ''
  if (typeof value !== 'string' || value.length > maxLength || (required && !value.trim())) {
    throw new InputError(`Enter a valid ${name} (up to ${maxLength} characters).`)
  }
  return value.trim()
}

function website(value, name, image = false) {
  const field = text(value, name, 500)
  if (!field) return field
  if (image && /^\/(images|media)\/[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(field) && !field.split('/').includes('..')) return field
  try {
    const url = new URL(field)
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href
  } catch {
    // The field error below covers invalid and unsupported URLs.
  }
  throw new InputError(`Enter an HTTPS link for ${name}.`)
}

function entries(value, name) {
  if (!Array.isArray(value) || value.length > 150) {
    throw new InputError(`A maximum of 150 ${name} can be saved.`)
  }
  const ids = new Set()
  return value.map((entry) => {
    const item = object(entry, name)
    const id = text(item.id, 'item ID', 80, true)
    if (ids.has(id)) throw new InputError(`Each entry in ${name} needs a unique ID.`)
    ids.add(id)
    return {
      id,
      name: text(item.name, 'name', 120, true),
      description: text(item.description, 'description', 1000),
      image: website(item.image, 'image', true),
      item,
    }
  })
}

function normalizeContent(value) {
  const content = object(value, 'website content')
  const details = object(content.business, 'business details')
  const whatsapp = text(details.whatsapp, 'WhatsApp number', 30)
  if (whatsapp && !whatsappUrl('', whatsapp)) throw new InputError('Enter a valid WhatsApp number including the country code.')

  const productCategories = new Set(defaultContent.categories.map(({ id }) => id))
  const products = entries(content.products, 'products').map(({ item, ...product }) => {
    if (!productCategories.has(item.category)) throw new InputError(`Choose a category for ${product.name}.`)
    return {
      ...product,
      category: item.category,
      price: text(item.price, 'price', 60),
      stock: text(item.stock, 'stock status', 80),
    }
  })

  return {
    business: {
      ...defaultContent.business,
      whatsapp,
      address: text(details.address, 'shop address', 250),
      hours: text(details.hours, 'opening hours', 200),
      directionsUrl: website(details.directionsUrl, 'shop directions'),
    },
    categories: defaultContent.categories,
    products,
    projects: entries(content.projects, 'completed projects').map(({ item, ...project }) => ({
      ...project,
      url: website(item.url, 'project website'),
    })),
  }
}

function imageType(type, bytes) {
  const extension = imageExtensions[type]
  if (validImageSignature(bytes, extension)) return extension
  throw new InputError('Choose a JPG, PNG, or WebP image.', 415)
}

export async function handleApi(request, { isAdmin, signedIn, store, sourceDownload }) {
  const { pathname, origin } = new URL(request.url)
  const method = request.method
  const media = pathname.match(/^\/media\/([0-9a-f-]{36}\.(jpg|png|webp))$/)
  try {
    if (media && (method === 'GET' || method === 'HEAD')) {
      const asset = await store.getImage(media[1])
      if (!asset) return json({ error: 'Image unavailable.' }, 404)
      return new Response(method === 'HEAD' ? null : asset.body, {
        headers: {
          'Content-Type': asset.type,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    if (pathname === '/api/content' && method === 'GET') {
      const record = await store.load()
      return json({ content: record.content ?? defaultContent })
    }

    if (!pathname.startsWith('/api/')) return null
    if (!pathname.startsWith('/api/admin/')) return json({ error: 'Page unavailable.' }, 404)
    if (!isAdmin) return json({ error: 'Owner access is required.' }, signedIn ? 403 : 401)

    if (method === 'PUT' || method === 'POST') {
      if (request.headers.get('Origin') !== origin) {
        return json({ error: 'Open the editor directly to make changes.' }, 403)
      }
    }

    if (pathname === '/api/admin/content') {
      if (method === 'GET') {
        const record = await store.load()
        return json({
          ...record,
          content: record.content ?? defaultContent,
          sourceDownload: Boolean(sourceDownload),
          imageUpload: true,
        })
      }
      if (method === 'PUT') {
        let body
        try {
          body = JSON.parse(new TextDecoder().decode(await readBytes(request, maxContentBytes)))
        } catch (error) {
          if (error instanceof InputError) throw error
          throw new InputError('The website content could not be read.')
        }
        const { content, revision } = object(body, 'website content')
        if (!Number.isSafeInteger(revision) || revision < 0) throw new InputError('Reload the editor before saving.')
        const saved = await store.save(normalizeContent(content), revision)
        return saved ? json(saved) : json({ error: 'The website was updated elsewhere. Load the latest version before saving.' }, 409)
      }
    }

    if (pathname === '/api/admin/image' && method === 'POST') {
      const type = request.headers.get('Content-Type')
      const bytes = await readBytes(request, maxImageBytes)
      const extension = imageType(type, bytes)
      const name = `${crypto.randomUUID()}.${extension}`
      await store.putImage(name, bytes, type)
      return json({ url: `/media/${name}` }, 201)
    }

    if (pathname === '/api/admin/download' && method === 'GET' && sourceDownload) {
      return new Response(sourceDownload(), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="Bishop-Technologies-PC.zip"',
          'Cache-Control': 'private, no-store',
        },
      })
    }

    return json({ error: 'Page unavailable.' }, 404)
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status)
    console.error('Bishop Technologies could not complete a storage operation:', error?.name)
    return json({ error: 'Website storage is unavailable. Please try again.' }, 503)
  }
}
