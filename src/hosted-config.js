export function hostedConfig(value, key) {
  if (!value || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '')) return null
  try {
    const url = new URL(value)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) return null
    if (url.href !== url.origin + '/') return null
    return { url: url.origin, key }
  } catch {
    return null
  }
}
