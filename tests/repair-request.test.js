import assert from 'node:assert/strict'
import { test } from 'node:test'
import { repairMessage, repairSelection, repairSummary, validRepairPhone } from '../src/repair-request.js'
import { whatsappUrl } from '../src/whatsapp.js'

test('repair finder accepts only named device and symptom options', () => {
  assert.deepEqual(repairSelection(new URLSearchParams('device=laptop&problem=charge')), { category: 'laptop', problem: 'charge' })
  assert.deepEqual(repairSelection(new URLSearchParams('device=unknown&problem=broken')), { category: '', problem: '' })
})

test('repair summary uses readable labels and omits optional blanks', () => {
  const summary = repairSummary({ category: 'laptop', problem: 'charge', name: ' Test ', model: '', phone: '077 123 4567' })
  assert.deepEqual(summary, [
    ['Device category', 'Laptop'], ['Problem', 'Charging problem'], ['Name', 'Test'], ['Phone number', '077 123 4567'],
  ])
  const message = repairMessage(summary)
  assert.match(message, /Problem: Charging problem/)
  assert.equal(whatsappUrl(message), null)
  assert.equal(new URL(whatsappUrl(message, '+12025550123')).searchParams.get('text'), message)
})

test('repair phone validation accepts local and international formats', () => {
  for (const value of ['077 123 4567', '+94 (77) 123-4567']) assert.equal(validRepairPhone(value), true)
  for (const value of ['abc1234567', '123', '1234567890123456']) assert.equal(validRepairPhone(value), false)
})
