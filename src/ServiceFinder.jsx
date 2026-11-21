import { useState } from 'react'
import { deviceCategories, repairProblems } from './customer-copy.js'

const otherServices = [
  { id: 'software', label: 'Software problem', service: 'Software troubleshooting', href: '/web-software', action: 'See software support' },
  { id: 'digital', label: 'Website or digital service', service: 'Websites and software for your business', href: '/web-software', action: 'Explore digital services' },
  { id: 'product', label: 'Product enquiry', service: 'Technology Store', href: '/store', action: 'Shop products' },
]

const choices = [...deviceCategories.filter(({ id }) => id !== 'other'), ...otherServices]

export function ServiceFinder() {
  const [category, setCategory] = useState('')
  const [problem, setProblem] = useState('')
  const selection = choices.find(({ id }) => id === category)
  const params = new URLSearchParams({ device: category })
  if (problem) params.set('problem', problem)

  return <section className="shell work-section" id="service-finder" aria-labelledby="finder-heading">
    <div className="finder-panel">
      <div><h2 id="finder-heading">What can we help you with?</h2><p>Choose what you need help with and we’ll point you to the right page.</p></div>
      <div className="field-grid">
        <label className="field">What do you need help with?<select value={category} onChange={(event) => { setCategory(event.target.value); setProblem('') }}>
          <option value="">Choose a category</option>
          {choices.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}
        </select></label>
        {selection && !selection.href && <label className="field">What’s happening?<select value={problem} onChange={(event) => setProblem(event.target.value)}>
          <option value="">Choose a symptom (optional)</option>
          {repairProblems.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select></label>}
      </div>
      <div aria-live="polite">
        {selection && <div className="finder-result">
          <p>Suggested service: <strong>{selection.service}</strong>{!selection.href && '. A technician can assess the symptoms.'}</p>
          <a className="button button-primary" href={selection.href || '/repair?' + params.toString() + '#enquiry'}>{selection.action || 'Start a repair request'}</a>
        </div>}
      </div>
    </div>
  </section>
}
