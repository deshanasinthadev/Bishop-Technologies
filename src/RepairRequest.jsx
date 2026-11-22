import { useEffect, useRef, useState } from 'react'
import { CopyEnquiry } from './Enquiry.jsx'
import { deviceCategories, repairProblems, repairSteps } from './customer-copy.js'
import { repairMessage, repairSelection, repairSummary, validRepairPhone } from './repair-request.js'
import { whatsappLink, whatsappUrl } from './whatsapp.js'

export function RepairRequest({ whatsapp }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => ({
    ...repairSelection(new URLSearchParams(window.location.search)),
    brand: '', model: '', details: '', name: '', phone: '', contact: 'WhatsApp',
  }))
  const [error, setError] = useState('')
  const stepHeading = useRef(null)
  const moveFocus = useRef(false)

  useEffect(() => {
    if (moveFocus.current) stepHeading.current?.focus()
  }, [step])

  function goTo(next) {
    moveFocus.current = true
    setError('')
    setStep(next)
  }

  function update(event) {
    const { name, value } = event.target
    setDraft((current) => ({ ...current, [name]: value }))
    if (error) setError('')
  }

  function advance(event) {
    event.preventDefault()
    if (step === 2 && (!draft.name.trim() || !validRepairPhone(draft.phone.trim()))) {
      setError(draft.name.trim() ? 'Enter a phone number with 7 to 15 digits.' : 'Enter your name.')
      event.currentTarget.elements.namedItem(draft.name.trim() ? 'phone' : 'name').focus()
      return
    }
    goTo(step + 1)
  }

  const summary = repairSummary(draft)
  const message = repairMessage(summary)
  const prefilled = whatsappUrl(message, whatsapp)

  return <div className="repair-flow">
    <ol className="repair-steps" aria-label="Repair request steps">
      {repairSteps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}
    </ol>
    <h3 ref={stepHeading} tabIndex={-1}>Step {step + 1} of {repairSteps.length} · {repairSteps[step]}</h3>
    {step < 3 ? <form className="enquiry-form" onSubmit={advance}>
      <div className="field-grid">
        {step === 0 && <>
          <label className="field field-wide">Device category<select name="category" value={draft.category} onChange={update} required>
            <option value="">Choose a device</option>
            {deviceCategories.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label className="field">Brand (optional)<input name="brand" value={draft.brand} onChange={update} maxLength={80} /></label>
          <label className="field">Model (optional)<input name="model" value={draft.model} onChange={update} maxLength={80} /></label>
        </>}
        {step === 1 && <>
          <label className="field field-wide">What’s wrong?<select name="problem" value={draft.problem} onChange={update} required>
            <option value="">Choose a symptom</option>
            {repairProblems.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label className="field field-wide">Anything else we should know? (optional)
            <textarea name="details" rows={4} maxLength={700} value={draft.details} onChange={update} />
          </label>
          <p className="field-wide">You can attach a photo in WhatsApp. Keep passwords, names and other private information out of the photo.</p>
        </>}
        {step === 2 && <>
          <label className="field">Name<input name="name" autoComplete="name" value={draft.name} onChange={update} required maxLength={80}
            aria-invalid={Boolean(error && !draft.name.trim())} aria-describedby={error && !draft.name.trim() ? 'repair-error' : undefined} /></label>
          <label className="field">Phone number<input name="phone" type="tel" autoComplete="tel" value={draft.phone} onChange={update} required maxLength={24}
            aria-invalid={Boolean(error && draft.name.trim())} aria-describedby={error && draft.name.trim() ? 'repair-error' : undefined} /></label>
          <label className="field field-wide">Preferred contact method<select name="contact" value={draft.contact} onChange={update}>
            <option>WhatsApp</option><option>Phone call</option>
          </select></label>
        </>}
      </div>
      {error && <p id="repair-error" role="alert">{error}</p>}
      <div className="repair-actions">
        {step > 0 && <button type="button" className="button button-secondary" onClick={() => goTo(step - 1)}>Back</button>}
        <button type="submit" className="button button-primary">{step === 2 ? 'Review request' : 'Continue'}</button>
      </div>
    </form> : <>
      <dl className="repair-summary">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="enquiry-privacy">Your details stay on this page until you open or copy the message. Send it in WhatsApp to contact Bishop Technologies. The shop can then discuss assessment and next steps with you.</p>
      {!prefilled && <p className="notice">Copy the request, open WhatsApp, then paste and send it. You can attach a photo in the chat.</p>}
      {prefilled && <p>Review and send the prepared message in WhatsApp. You can attach a photo in the chat.</p>}
      <div className="repair-actions">
        <button type="button" className="button button-secondary" onClick={() => goTo(2)}>Back</button>
        {!prefilled && <CopyEnquiry message={message}>Copy request</CopyEnquiry>}
        <a className="button button-primary" href={prefilled || whatsappLink} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
      </div>
    </>}
  </div>
}
