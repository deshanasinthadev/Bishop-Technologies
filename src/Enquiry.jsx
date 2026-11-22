import { useId, useState } from 'react'
import { whatsappLink, whatsappUrl } from './whatsapp.js'

const nameField = { name: 'name', label: 'Name', autoComplete: 'name', placeholder: 'Your name' }
const phoneField = { name: 'phone', type: 'tel', autoComplete: 'tel', placeholder: 'Your phone number' }

const fields = [
  nameField,
  { name: 'organisation', label: 'Business name', autoComplete: 'organization', placeholder: 'Your business name' },
  { ...phoneField, label: 'Contact number', wide: true },
  { name: 'description', label: 'What do you need?', placeholder: 'Tell us a little about your project', multiline: true },
]

async function copyMessage(message) {
  try {
    await navigator.clipboard.writeText(message)
    return true
  } catch {
    return false
  }
}

function CopyFeedback({ status, message }) {
  const id = useId()

  return (
    <>
      <span className="enquiry-feedback" role="status">
        {status === 'copied' && 'Enquiry copied.'}
        {status === 'manual' && 'Automatic copy is unavailable. You can select and copy the text below.'}
      </span>
      {status === 'manual' && (
        <div className="field field-wide">
          <label htmlFor={id}>Enquiry text</label>
          <textarea id={id} rows={5} readOnly value={message} onFocus={(event) => event.target.select()} />
        </div>
      )}
    </>
  )
}

export function CopyEnquiry({ message, className = 'button button-secondary', children = 'Copy enquiry' }) {
  const [status, setStatus] = useState('')

  async function handleCopy() {
    setStatus('copying')
    setStatus(await copyMessage(message) ? 'copied' : 'manual')
  }

  return (
    <div className="copy-enquiry">
      <button className={className} type="button" disabled={status === 'copying'} onClick={handleCopy}>{status === 'copying' ? 'Copying…' : children}</button>
      <CopyFeedback status={status} message={message} />
    </div>
  )
}

export function EnquiryForm({ whatsapp }) {
  const id = useId()
  const [result, setResult] = useState(null)
  const canSend = Boolean(whatsappUrl('', whatsapp))

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const lines = []

    for (const field of fields) {
      const value = values.get(field.name).trim()
      const input = form.elements.namedItem(field.name)

      if (!value) {
        input.setCustomValidity('Please fill in this field.')
        input.reportValidity()
        return
      }

      if (field.type === 'tel') {
        const digits = value.replace(/\D/g, '')
        if (!/^\+?[0-9\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
          input.setCustomValidity('Enter a phone number with 7 to 15 digits.')
          input.reportValidity()
          return
        }
      }

      lines.push(`${field.label}: ${value}`)
    }

    const message = ['Hi Bishop Technologies, I would like to request a quote for a project.', '', ...lines].join('\n')
    if (canSend) {
      window.open(whatsappUrl(message, whatsapp), '_blank', 'noopener,noreferrer')
      return
    }

    const status = await copyMessage(message) ? 'copied' : 'manual'
    setResult({ status, message })
  }

  function clearFeedback(event) {
    event.target.setCustomValidity('')
    setResult(null)
  }

  return (
    <form className="enquiry-form" onSubmit={handleSubmit} onInput={clearFeedback}>
      <div className="field-grid">
        {fields.map(({ name, label, wide, multiline, ...attributes }) => (
          <div key={name} className={wide || multiline ? 'field field-wide' : 'field'}>
            <label htmlFor={`${id}-${name}`}>{label}</label>
            {multiline ? (
              <textarea id={`${id}-${name}`} name={name} rows={4} maxLength={2000} required {...attributes} />
            ) : (
              <input id={`${id}-${name}`} name={name} maxLength={120} required {...attributes} />
            )}
          </div>
        ))}
      </div>
      <p className="enquiry-privacy">The website keeps these details in this form. They go to Bishop Technologies only when you send the WhatsApp message.</p>
      {!canSend && (
        <p className="notice">Copy your enquiry below, then paste it into your WhatsApp chat.</p>
      )}
      <button className="button button-primary" type="submit">
        {canSend ? 'Open WhatsApp' : 'Copy enquiry'}
      </button>
      {!canSend && <a className="button button-secondary enquiry-chat" href={whatsappLink} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>}
      <CopyFeedback status={result?.status} message={result?.message} />
    </form>
  )
}
