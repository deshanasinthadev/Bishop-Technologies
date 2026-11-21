export const maxImageBytes = 2 * 1024 * 1024
export const imageExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function validImageSignature(bytes, extension) {
  const startsWith = (signature, index = 0) => signature.every((byte, offset) => bytes[index + offset] === byte)
  if (extension === 'jpg') return startsWith([255, 216, 255])
  if (extension === 'png') return startsWith([137, 80, 78, 71, 13, 10, 26, 10])
  if (extension === 'webp') return startsWith([82, 73, 70, 70]) && startsWith([87, 69, 66, 80], 8)
  return false
}

export async function readImage(response) {
  if (!response.body) return null
  if (Number(response.headers.get('content-length')) > maxImageBytes) {
    await response.body.cancel()
    return null
  }

  const reader = response.body.getReader()
  const parts = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return Buffer.concat(parts, size)
      size += value.byteLength
      if (size > maxImageBytes) {
        await reader.cancel()
        return null
      }
      parts.push(value)
    }
  } finally {
    reader.releaseLock()
  }
}
