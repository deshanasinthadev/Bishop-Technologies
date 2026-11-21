import { hostedConfig } from './hosted-config.js'

const config = hostedConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
export const supabaseUrl = config?.url
export const publishableKey = config?.key
export const catalogConfigured = Boolean(config)

const validationMessages = new Set([
  'Use at most 100 variants and 12 images.',
  'A published product needs a description, an active category and an active variant.',
  'Each variant may occur once.',
  'Variant belongs to a different product.',
  'An uploaded image is missing.',
  'Images must be unique and belong to this product.',
  'Check the address, hours and international WhatsApp number.',
  'Use at most 30 projects in the gallery.',
  'Each project needs a name. Use public HTTPS links for photos and project websites.',
])

export function catalogError(error) {
  if (error?.code === '23514' && validationMessages.has(error.message)) return new Error(error.message)
  const messages = {
    '23505': 'That SKU or URL slug is already in use.',
    '23503': 'The selected category or staff account no longer exists.',
    '23502': 'Complete all required fields before saving.',
    '23514': 'Check the required fields and enter non-negative prices and quantities.',
    '22P02': 'One of the values has an invalid format.',
    '42501': 'Your account does not have permission for this action.',
    '40001': 'This product was changed by another staff member. Reopen it before saving.',
  }
  return new Error(messages[error?.code] || 'The catalog could not complete the request. Try again.')
}

export async function catalogRpc(name, args, signal) {
  if (!catalogConfigured) throw new Error('The online catalog is not configured.')
  const response = await fetch(new URL('/rest/v1/rpc/' + name, supabaseUrl), {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw catalogError(data)
  if (!data) throw new Error('The catalog returned an invalid response.')
  return data
}

export function imageUrl(path) {
  return '/api/catalog-image?path=' + encodeURIComponent(path)
}
