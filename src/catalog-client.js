export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const catalogConfigured = Boolean(supabaseUrl && publishableKey?.startsWith('sb_publishable_'))

export function catalogError(error) {
  const messages = {
    '23505': 'That SKU or URL slug is already in use.',
    '23503': 'The selected category or staff account no longer exists.',
    '23502': 'Complete all required fields before saving.',
    '23514': 'Check the required fields and enter non-negative prices and quantities.',
    '22P02': 'One of the values has an invalid format.',
    '42501': 'Your account does not have permission for this action.',
    '40001': 'This product was changed by another staff member. Reopen it before saving.',
  }
  return new Error(error.code === '23514' && error.message && !error.message.includes('constraint')
    ? error.message : messages[error.code] || 'The catalog could not complete the request. Try again.')
}

export async function catalogRpc(name, args, signal) {
  if (!catalogConfigured) throw new Error('The online catalog is not configured.')
  const response = await fetch(new URL('/rest/v1/rpc/' + name, supabaseUrl), {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
    signal,
  })
  const data = await response.json()
  if (!response.ok) throw catalogError(data)
  return data
}

export function imageUrl(path) {
  return '/api/catalog-image?path=' + encodeURIComponent(path)
}
