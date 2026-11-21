import React, { useEffect, useRef, useState } from 'react'
import {
  Archive, Building2, CheckCircle2, Download, Globe2, Package, Plus, Save, Trash2, Upload,
} from 'lucide-react'
import { whatsappUrl } from './whatsapp.js'
import './admin.css'

const contentEndpoint = '/api/admin/content'
const signInUrl = '/signin-with-chatgpt?return_to=%2Fadmin'
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const businessFields = [
  { name: 'whatsapp', label: 'WhatsApp number', type: 'tel', maxLength: 30, hint: 'Include the country code, such as +94 for Sri Lanka.' },
  { name: 'hours', label: 'Shop hours', maxLength: 200 },
  { name: 'address', label: 'Shop address', maxLength: 250 },
  { name: 'directionsUrl', label: 'Map directions link', type: 'url', maxLength: 500, hint: 'Optional when a shop address is filled in.' },
]
const productFields = [
  { name: 'name', label: 'Product name', required: true, maxLength: 120 },
  { name: 'category', label: 'Category', required: true },
  { name: 'description', label: 'Description', multiline: true, maxLength: 1000 },
  { name: 'price', label: 'Price', maxLength: 60, hint: 'Enter the price as customers should see it.' },
  { name: 'stock', label: 'Stock status', maxLength: 80 },
  { name: 'image', label: 'Image URL or site path', maxLength: 500, hint: 'Use an https:// link or a site path, such as /images/item.webp.', wide: true },
]
const projectFields = [
  { name: 'name', label: 'Project name', required: true, maxLength: 120 },
  { name: 'url', label: 'Project link', type: 'url', maxLength: 500 },
  { name: 'description', label: 'Description', multiline: true, maxLength: 1000 },
  { name: 'image', label: 'Image URL or site path', maxLength: 500, hint: 'Use an https:// link or a site path, such as /images/project.webp.', wide: true },
]

const recordGroups = {
  products: { singular: 'product', title: 'Products', fields: productFields, Icon: Package },
  projects: { singular: 'project', title: 'Completed work', fields: projectFields, Icon: Globe2 },
}

function isWebLink(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

function isImagePath(value) {
  return (/^\/(images|media)\/[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(value) && !value.split('/').includes('..')) || isWebLink(value)
}

function validationError(field, value) {
  const text = value.trim()
  if (field.required && !text) return `Enter a ${field.label.toLowerCase()}.`
  if (field.maxLength && text.length > field.maxLength) return `Use up to ${field.maxLength} characters.`
  if (text && field.type === 'url' && !isWebLink(text)) return 'Enter a full website link beginning with https://.'
  if (text && field.name === 'image' && !isImagePath(text)) return 'Enter an HTTPS link or a site path.'
  if (text && field.name === 'whatsapp' && !whatsappUrl('', text)) return 'Enter a valid WhatsApp number.'
  return ''
}

function trimFields(record, fields) {
  return { ...record, ...Object.fromEntries(fields.map(({ name }) => [name, (record[name] ?? '').trim()])) }
}

function restoreBackup(value, current) {
  if (!value || typeof value !== 'object' || !value.business || typeof value.business !== 'object') {
    throw new Error('Choose a JSON backup downloaded from this editor.')
  }

  function restoreFields(record, fields) {
    if (!record || typeof record !== 'object' || fields.some(({ name }) =>
      record[name] != null && typeof record[name] !== 'string'
    )) throw new Error('The backup contains an invalid field.')
    return Object.fromEntries(fields.map(({ name }) => [name, record[name] ?? '']))
  }

  function restoreRecords(records, fields) {
    if (!Array.isArray(records)) throw new Error('The backup is missing a list of products or projects.')
    const ids = new Set()
    return records.map((record) => {
      const data = restoreFields(record, fields)
      if (typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id)) {
        throw new Error('The backup has an invalid or duplicate item ID.')
      }
      ids.add(record.id)
      return { id: record.id, ...data }
    })
  }

  const products = restoreRecords(value.products, productFields)
  if (products.some(({ category }) => category && !current.categories.some(({ id }) => id === category))) {
    throw new Error('The backup contains an unknown product category.')
  }

  return {
    business: { ...current.business, ...restoreFields(value.business, businessFields) },
    categories: current.categories,
    products,
    projects: restoreRecords(value.projects, projectFields),
  }
}

function EditorField({ field, id, value = '', onChange, categories, onUpload }) {
  const { name, label, type = 'text', multiline, required, hint, wide, maxLength } = field
  const hintId = hint ? `${id}-hint` : undefined
  const imageInput = useRef(null)
  const common = {
    id,
    value,
    required,
    'aria-describedby': hintId,
    onChange(event) {
      event.target.setCustomValidity('')
      onChange(event.target.value)
    },
  }

  return (
    <div className={multiline || wide ? 'field field-wide' : 'field'}>
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {multiline ? (
        <textarea {...common} rows={3} maxLength={maxLength} />
      ) : name === 'category' ? (
        <select {...common}>
          <option value="">Choose a category</option>
          {categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      ) : (
        <input {...common} type={type} maxLength={maxLength} autoComplete={type === 'tel' ? 'tel' : undefined} />
      )}
      {hint && <small id={hintId} className="admin-field-hint">{hint}</small>}
      {onUpload && (
        <div className="admin-image-actions">
          <button className="button button-secondary" type="button" onClick={() => imageInput.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Upload image
          </button>
          <small className="admin-field-hint">JPG, PNG, or WebP, up to 2 MB.</small>
          <input type="file" hidden ref={imageInput} accept={imageTypes.join(',')} onChange={(event) => {
            const file = event.target.files[0]
            event.target.value = ''
            if (file) onUpload(file)
          }} />
        </div>
      )}
    </div>
  )
}

function PanelHeading({ title, Icon, id, children }) {
  return (
    <div className="admin-panel-heading">
      <span className="admin-icon"><Icon size={20} aria-hidden="true" /></span>
      <div><h2 id={id}>{title}</h2>{children && <p>{children}</p>}</div>
    </div>
  )
}

function RecordPanel({ group, records, categories, onAdd, onUpdate, onRemove, onUpload }) {
  const { singular, title, fields, Icon } = recordGroups[group]
  return (
    <section id={group} className="admin-panel" aria-labelledby={`${group}-heading`}>
      <div className="admin-panel-top">
        <PanelHeading title={title} Icon={Icon} id={`${group}-heading`}>
          {group === 'products' ? 'Manage the items shown in the store.' : 'Share examples of work Bishop Technologies has completed.'}
        </PanelHeading>
        <button className="button button-secondary" type="button" onClick={onAdd}>
          <Plus size={17} aria-hidden="true" /> Add {singular}
        </button>
      </div>
      {records.length ? (
        <div className="admin-records">
          {records.map((record) => (
            <fieldset className="admin-record" key={record.id}>
              <legend>{record.name.trim() || `New ${singular}`}</legend>
              <div className="field-grid">
                {fields.map((field) => (
                  <EditorField key={field.name} field={field} id={`${group}-${record.id}-${field.name}`}
                    value={record[field.name]} categories={categories}
                    onUpload={onUpload && field.name === 'image' ? (file) => onUpload(record.id, file) : undefined}
                    onChange={(value) => onUpdate(record.id, field.name, value)} />
                ))}
              </div>
              <button className="admin-remove" type="button" onClick={() => onRemove(record.id)}
                aria-label={`Remove ${record.name.trim() || `new ${singular}`}`}>
                <Trash2 size={16} aria-hidden="true" /> Remove {singular}
              </button>
            </fieldset>
          ))}
        </div>
      ) : <p className="admin-empty">No {group} have been added.</p>}
    </section>
  )
}

function readSaved(response) {
  if (!response?.content?.business || !Array.isArray(response.content.categories) ||
    !Array.isArray(response.content.products) || !Array.isArray(response.content.projects) || response.revision == null) {
    throw new Error('The editor received an incomplete response. Try refreshing the page.')
  }
  return response
}

function downloadBackup(content) {
  const file = new Blob([JSON.stringify(content, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'bishop-technologies-content.json'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Admin() {
  const [saved, setSaved] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [requiresSignIn, setRequiresSignIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const [newFieldId, setNewFieldId] = useState('')
  const fileInput = useRef(null)
  const dirty = Boolean(saved && draft && JSON.stringify(saved.content) !== JSON.stringify(draft))
  const busy = saving || Boolean(pendingAction)

  async function load(signal) {
    setPendingAction('load')
    setLoadError('')
    setRequiresSignIn(false)
    try {
      const response = await fetch(contentEndpoint, { signal, cache: 'no-store' })
      if (response.status === 401) {
        setRequiresSignIn(true)
        throw new Error('Sign in with the account that manages this website.')
      }
      if (response.status === 403) throw new Error('Only the website owner can open the editor.')
      if (!response.ok) throw new Error('The editor could not load the website content. Try again.')
      const next = readSaved(await response.json())
      setSaved(next)
      setDraft(next.content)
      setFeedback(null)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLoadError(error instanceof TypeError ? 'The editor could not connect. Check your connection and try again.' : error.message)
      }
    } finally {
      if (!signal?.aborted) setPendingAction('')
    }
  }

  useEffect(() => {
    document.title = 'Site editor | Bishop Technologies'
    const request = new AbortController()
    load(request.signal)
    return () => request.abort()
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!newFieldId) return
    document.getElementById(newFieldId)?.focus()
    setNewFieldId('')
  }, [newFieldId])

  function edit(update) {
    setDraft(update)
    setFeedback((current) => current?.kind === 'conflict' ? current : null)
  }

  function addRecord(group) {
    const id = globalThis.crypto.randomUUID()
    const fields = recordGroups[group].fields
    const record = { id, ...Object.fromEntries(fields.map(({ name }) => [name, ''])) }
    edit((current) => ({ ...current, [group]: [...current[group], record] }))
    setNewFieldId(`${group}-${id}-name`)
  }

  function updateRecord(group, id, field, value) {
    edit((current) => ({
      ...current,
      [group]: current[group].map((record) => record.id === id ? { ...record, [field]: value } : record),
    }))
  }

  function removeRecord(group, id) {
    edit((current) => ({ ...current, [group]: current[group].filter((record) => record.id !== id) }))
  }

  function discard() {
    setDraft(saved.content)
    setFeedback({ kind: 'success', message: 'Draft changes discarded.' })
  }

  async function restore(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return

    setPendingAction('restore')
    try {
      const content = restoreBackup(JSON.parse(await file.text()), draft)
      setDraft(content)
      setFeedback({ kind: 'success', message: 'Backup loaded into the draft. Save changes to update the website.' })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message,
      })
    } finally {
      setPendingAction('')
    }
  }

  async function uploadImage(group, id, file) {
    if (!imageTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFeedback({ kind: 'error', message: 'Choose a JPG, PNG, or WebP image up to 2 MB.' })
      return
    }

    setPendingAction('image')
    setFeedback({ kind: 'success', message: 'Uploading image…' })
    try {
      const response = await fetch('/api/admin/image', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || typeof data?.url !== 'string' || !isImagePath(data.url)) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'The image could not be uploaded. Try again.')
      }
      updateRecord(group, id, 'image', data.url)
      setFeedback({ kind: 'success', message: 'Image added to the draft. Save changes to update the website.' })
    } catch (error) {
      setFeedback({ kind: 'error', message: error.message })
    } finally {
      setPendingAction('')
    }
  }

  async function save(event) {
    event.preventDefault()
    if (!dirty || busy) return
    const fieldGroups = [
      { record: draft.business, fields: businessFields, prefix: 'business' },
      ...Object.entries(recordGroups).flatMap(([group, { fields }]) =>
        draft[group].map((record) => ({ record, fields, prefix: `${group}-${record.id}` }))
      ),
    ]
    for (const { record, fields, prefix } of fieldGroups) {
      for (const field of fields) {
        const issue = validationError(field, record[field.name] ?? '')
        if (!issue) continue
        const input = document.getElementById(`${prefix}-${field.name}`)
        input.setCustomValidity(issue)
        input.reportValidity()
        return
      }
    }
    const content = {
      business: trimFields(draft.business, businessFields),
      categories: draft.categories,
      products: draft.products.map((record) => trimFields(record, productFields)),
      projects: draft.projects.map((record) => trimFields(record, projectFields)),
    }
    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch(contentEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, revision: saved.revision }),
      })
      if (response.status === 409) {
        setFeedback({ kind: 'conflict', message: 'The website has a newer version. Download a backup to keep your draft, then reload the saved content.' })
        return
      }
      if (response.status === 401 || response.status === 403) {
        setRequiresSignIn(response.status === 401)
        throw new Error('This session no longer has permission to save. Download your draft as a backup before signing in again.')
      }
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(typeof error?.error === 'string' ? error.error : 'The website could not be updated. Your draft is still here.')
      }
      const next = readSaved(await response.json())
      setDraft(next.content)
      setSaved((previous) => ({ ...previous, ...next }))
      setFeedback({ kind: 'success', message: 'Website updated.' })
    } catch (error) {
      setFeedback({ kind: 'error', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-shell admin-header-inner">
          <a className="brand" href="/" target="_blank" rel="noopener" aria-label="Bishop Technologies home (opens in a new tab)">
            <span className="brand-mark"><img src="/images/bishop-mark.webp" width="42" height="42" alt="" /></span>
            <span className="brand-wordmark">BISHOP <span>TECHNOLOGIES</span></span>
          </a>
          <a className="admin-visit" href="/" target="_blank" rel="noopener">View website</a>
        </div>
      </header>
      <main className="admin-shell admin-main">
        <div className="admin-title">
          <div>
            <h1>Site editor</h1>
            <p>Update your shop details, store products, and completed work.</p>
          </div>
          {saved?.sourceDownload && !requiresSignIn && (
            <a className="button button-primary admin-download" href="/api/admin/download" download>
              <Download size={18} aria-hidden="true" /> Download PC ZIP
            </a>
          )}
        </div>
        {!draft ? loadError ? (
          <section className="admin-panel admin-load">
            <h2>Editor unavailable</h2>
            <p role="alert">{loadError}</p>
            {requiresSignIn
              ? <a className="button button-primary" href={signInUrl} target="_top">Sign in</a>
              : <button className="button button-primary" type="button" onClick={() => load()}>Try again</button>}
          </section>
        ) : <p className="admin-panel admin-load" role="status">Loading website content…</p> : (
          <div className="admin-layout">
            <nav className="admin-nav" aria-label="Editor sections">
              <a href="#business"><Building2 size={18} aria-hidden="true" /> Shop details</a>
              <a href="#products"><Package size={18} aria-hidden="true" /> Products</a>
              <a href="#projects"><Globe2 size={18} aria-hidden="true" /> Completed work</a>
              <a href="#backup"><Archive size={18} aria-hidden="true" /> Backups</a>
            </nav>
            <form className="admin-form" onSubmit={save} noValidate>
              <fieldset className="admin-editor-fields" disabled={busy}>
                <section id="business" className="admin-panel" aria-labelledby="shop-heading">
                  <PanelHeading title="Shop details" Icon={Building2} id="shop-heading">
                    Customers use these details to contact you and find the shop.
                  </PanelHeading>
                  <div className="field-grid">
                    {businessFields.map((field) => (
                      <EditorField key={field.name} field={field} id={`business-${field.name}`}
                        value={draft.business[field.name]}
                        onChange={(value) => edit((current) => ({ ...current, business: { ...current.business, [field.name]: value } }))} />
                    ))}
                  </div>
                </section>

                {Object.keys(recordGroups).map((group) => (
                  <RecordPanel key={group} group={group} records={draft[group]} categories={draft.categories}
                    onAdd={() => addRecord(group)} onUpdate={(id, field, value) => updateRecord(group, id, field, value)}
                    onRemove={(id) => removeRecord(group, id)}
                    onUpload={saved.imageUpload ? (id, file) => uploadImage(group, id, file) : undefined} />
                ))}

                <section id="backup" className="admin-panel" aria-labelledby="backup-heading">
                  <PanelHeading title="Backups" Icon={Archive} id="backup-heading">
                    Restore a backup into the draft, then save to update the website. Backups include links to images.
                  </PanelHeading>
                  <div className="admin-backup-actions">
                    <button className="button button-secondary" type="button" onClick={() => downloadBackup(draft)}>
                      <Download size={17} aria-hidden="true" /> Download content backup
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => fileInput.current?.click()}>
                      <Upload size={17} aria-hidden="true" /> Restore content backup
                    </button>
                    <input type="file" ref={fileInput} accept="application/json,.json" onChange={restore} hidden />
                  </div>
                </section>
              </fieldset>

              <div className="admin-save-bar">
                <div className="admin-save-status">
                  <p className="admin-draft-status" role="status">
                    {dirty ? 'Unsaved changes' : <><CheckCircle2 size={18} aria-hidden="true" /> All changes saved</>}
                  </p>
                  {feedback && <p className={`admin-feedback admin-feedback-${feedback.kind}`}
                    role={feedback.kind === 'success' ? 'status' : 'alert'}>{feedback.message}</p>}
                  {loadError && <p className="admin-feedback admin-feedback-error" role="alert">{loadError}</p>}
                  {feedback?.kind === 'conflict' && (
                    <button className="admin-inline-button" type="button" disabled={busy} onClick={() => load()}>
                      Reload saved content
                    </button>
                  )}
                  {requiresSignIn && <a className="admin-inline-button" href={signInUrl} target="_top">Sign in</a>}
                </div>
                <div className="admin-save-actions">
                  <button className="button button-secondary" type="button" disabled={busy || !dirty} onClick={discard}>
                    Discard changes
                  </button>
                  <button className="button button-primary" type="submit" disabled={busy || !dirty}>
                    <Save size={17} aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
