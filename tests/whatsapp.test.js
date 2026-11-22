import assert from 'node:assert/strict'
import { test } from 'node:test'
import { whatsappLink, whatsappUrl } from '../src/whatsapp.js'

test('general WhatsApp contact uses the confirmed business link', () => {
  assert.equal(whatsappLink, 'https://wa.me/message/FPYLPFMRB7D5L1')
  assert.equal(whatsappUrl('Test message', ''), null)
})

test('number-based WhatsApp links preserve the enquiry text', () => {
  const message = 'Test enquiry about a product & variant'
  const url = new URL(whatsappUrl(message, '+94 71 234 5678'))
  assert.equal(url.origin, 'https://wa.me')
  assert.equal(url.pathname, '/94712345678')
  assert.equal(url.searchParams.get('text'), message)
})
