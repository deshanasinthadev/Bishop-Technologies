export function whatsappUrl(message = '', contact = '') {
  const compact = String(contact ?? '').trim().replace(/[\s().-]/g, '')
  const international = compact.replace(/^(?:\+|00)/, '')
  const number = /^0[1-9]\d{8}$/.test(international)
    ? `94${international.slice(1)}`
    : international

  if (!/^[1-9]\d{6,14}$/.test(number)) return null

  const url = new URL(`https://wa.me/${number}`)
  if (message) url.searchParams.set('text', message)
  return url.href
}
