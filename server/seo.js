const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => entities[character])
}

export function productionOrigin(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.href === url.origin + '/') return url.origin
  } catch {
    // Report configuration errors without including the supplied value.
  }
  throw new Error('SITE_ORIGIN must be an HTTPS origin without a path.')
}
