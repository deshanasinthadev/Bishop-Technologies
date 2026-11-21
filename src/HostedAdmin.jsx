import { useEffect, useState } from 'react'
import { isPasswordSetup, staffRpc, supabase } from './staff-client.js'
import './admin.css'
import './catalog.css'

const bucket = 'bishop-products'
const lkr = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' })
const imageTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const productDefaults = { name: '', slug: '', brand: '', category_id: '', description: '', specifications: '', warranty: '', featured: false, status: 'draft', variants: [], images: [] }
const categoryDefaults = { name: '', slug: '', description: '', display_order: 0, is_active: true }
const makeSlug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '')
const makeVariant = () => ({ id: crypto.randomUUID(), name: '', sku: '', price: '', quantity: 0, threshold: 2, active: true, on_request: false })

function Button({ children, ...props }) {
  return <button type="button" className="button button-secondary" {...props}>{children}</button>
}

function Field({ name, label, value, change, multiline = false, ...props }) {
  const Component = multiline ? 'textarea' : 'input'
  return <label>{label}<Component name={name} value={value ?? ''} onChange={(event) => change(name, event.target.value)} {...props} /></label>
}

function Toggle({ label, checked, onChange }) {
  return <label className="catalog-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>
}

function SignIn({ setRecovery }) {
  const [reset, setReset] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setFeedback('')
    setBusy(true)
    const fields = new FormData(event.currentTarget)
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(fields.get('email'), { redirectTo: window.location.origin + '/admin' })
        if (error) throw error
        setFeedback('If the account can receive a reset link, check its inbox.')
      } else {
        setRecovery(false)
        const { error } = await supabase.auth.signInWithPassword({ email: fields.get('email'), password: fields.get('password') })
        if (error) throw error
      }
    } catch {
      setFeedback(reset ? 'The reset request could not be processed. Try again later.' : 'Sign-in failed. Check your credentials and try again.')
    } finally { setBusy(false) }
  }
  return <section className="catalog-panel catalog-login">
    <h1>{reset ? 'Reset your password' : 'Staff sign in'}</h1>
    <form className="catalog-form" onSubmit={submit}>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      {!reset && <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>}
      <Button type="submit" disabled={busy}>{reset ? 'Send reset link' : 'Sign in'}</Button>
      <Button onClick={() => { setReset(!reset); setFeedback('') }}>{reset ? 'Back to sign in' : 'Forgot password?'}</Button>
    </form>
    {feedback && <p role="status">{feedback}</p>}
  </section>
}

function Reconfirm({ mode, complete, signOut }) {
  const [message, setMessage] = useState('')
  const [factor, setFactor] = useState(null)
  const [busy, setBusy] = useState(false)

  async function enroll() {
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error
      setFactor(data)
    } catch { setMessage('Could not start authenticator setup.') }
    finally { setBusy(false) }
  }

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.updateUser({ password: fields.get('password') })
        if (error) throw error
        await signOut()
        return
      }
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError
      const factorId = factor?.id || data.totp.find(({ status }) => status === 'verified')?.id
      if (!factorId) throw new Error()
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: fields.get('code') })
      if (error) throw error
      await complete()
    } catch { setMessage(mode === 'password' ? 'Password update failed. Check the requirements and try again.' : 'Could not verify the authenticator code.') }
    finally { setBusy(false) }
  }

  return <section className="catalog-panel catalog-login">
    <h1>{mode === 'password' ? 'Set a new password' : mode === 'enroll' ? 'Set up an authenticator' : 'Verify your sign-in'}</h1>
    {mode === 'enroll' && !factor ? <Button disabled={busy} onClick={enroll}>Generate setup key</Button> :
      <form className="catalog-form" onSubmit={submit}>
        {mode === 'password' ? <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label> : <>
          {factor && <p>Enter this setup key in your authenticator app <code>{factor.totp.secret}</code></p>}
          <label>Authenticator code<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required /></label>
        </>}
        <Button type="submit" disabled={busy}>Confirm</Button>
      </form>}
    {message && <p role="alert">{message}</p>}
    <Button onClick={signOut}>Sign out</Button>
  </section>
}

function AdminImage({ path, alt }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let cancelled = false
    let objectUrl
    supabase.storage.from(bucket).download(path).then(({ data }) => {
      if (!cancelled && data) { objectUrl = URL.createObjectURL(data); setUrl(objectUrl) }
    })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path])
  return url ? <img src={url} alt={alt || 'Product image'} loading="lazy" /> : <span>Image preview</span>
}

function ProductEditor({ initial, categories, userId, save, close }) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState([])
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || uploaded.length > 0
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const changeVariant = (index, key, value) => setDraft((current) => ({
    ...current, variants: current.variants.map((item, position) => position === index ? { ...item, [key]: value } : item),
  }))

  useEffect(() => {
    if (!dirty) return
    function warn(event) { event.preventDefault(); event.returnValue = true }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function clean(paths) {
    if (!paths.length) return
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) throw new Error('The product data is safe, but some detached images could not be cleaned up.')
  }

  async function upload(event) {
    const files = [...event.target.files].slice(0, 12 - draft.images.length)
    event.target.value = ''
    setBusy(true)
    setError('')
    try {
      for (const file of files) {
        const extension = imageTypes[file.type]
        if (!extension || file.size > 2097152) throw new Error('Choose JPEG, PNG, or WebP files up to 2 MB each.')
        const bitmap = await createImageBitmap(file).catch(() => null)
        if (!bitmap) throw new Error('The file is not a readable image.')
        bitmap.close()
        const path = userId + '/' + crypto.randomUUID() + '.' + extension
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
        if (uploadError) throw new Error('The image could not be uploaded.')
        setUploaded((current) => [...current, path])
        setDraft((current) => ({ ...current, images: [...current.images, { path, alt: '' }] }))
      }
    } catch (issue) { setError(issue.message) }
    finally { setBusy(false) }
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const status = event.nativeEvent.submitter?.value || draft.status
    const payload = { ...draft, slug: draft.slug || makeSlug(draft.name), status,
      variants: draft.variants.map((item) => ({ ...item, price: item.price === '' ? null : item.price })) }
    try {
      await staffRpc('bishop_save_product', { payload })
    } catch (issue) { setError(issue.message); setBusy(false); return }
    const kept = new Set(draft.images.map(({ path }) => path))
    let warning = ''
    try { await clean([...new Set([...initial.images.map(({ path }) => path), ...uploaded])].filter((path) => !kept.has(path))) }
    catch (issue) { warning = issue.message }
    await save(warning)
  }

  async function cancel() {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    setBusy(true)
    let warning = ''
    try { await clean(uploaded) } catch (issue) { warning = issue.message }
    close(warning)
  }

  return <section className="catalog-panel">
    <h2>{initial.id ? 'Edit product' : 'New product'}</h2>
    <form className="catalog-form" onSubmit={submit}>
      <fieldset disabled={busy} className="catalog-form">
        <legend>Product details</legend>
        <div className="catalog-admin-grid">
          <Field name="name" label="Product name" value={draft.name} change={change} required maxLength={160} />
          <Field name="slug" label="URL slug" value={draft.slug} change={change} readOnly={!!initial.id} placeholder="Generated from name if blank" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} />
          <label>Category<select value={draft.category_id} onChange={(event) => change('category_id', event.target.value)} required>
            <option value="">Select a category</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_active ? '' : ' (inactive)'}</option>)}
          </select></label>
          <Field name="brand" label="Brand" value={draft.brand} change={change} maxLength={120} />
        </div>
        <Field name="description" label="Description" value={draft.description} change={change} multiline maxLength={6000} />
        <Field name="specifications" label="Specifications" value={draft.specifications} change={change} multiline maxLength={6000} />
        <Field name="warranty" label="Confirmed warranty details" value={draft.warranty} change={change} maxLength={500} />
        <Toggle label="Feature this product" checked={draft.featured} onChange={(value) => change('featured', value)} />
        <h3>Variants and stock</h3>
        {draft.variants.map((item, index) => <fieldset key={item.id} className="catalog-admin-grid">
          <legend>{item.name || 'Variant ' + (index + 1)}</legend>
          <Field name="name" label="Variant name" value={item.name} change={(key, value) => changeVariant(index, key, value)} required maxLength={120} />
          <Field name="sku" label="SKU" value={item.sku} change={(key, value) => changeVariant(index, key, value)} required maxLength={80} />
          <Field name="price" label="Price in LKR (optional)" value={item.price} change={(key, value) => changeVariant(index, key, value)} type="number" min="0" step=".01" />
          <Field name="quantity" label="Stock quantity" value={item.quantity} change={(key, value) => changeVariant(index, key, value)} type="number" min="0" required />
          <Field name="threshold" label="Low-stock threshold" value={item.threshold} change={(key, value) => changeVariant(index, key, value)} type="number" min="0" required />
          <Toggle label="Active variant" checked={item.active} onChange={(value) => changeVariant(index, 'active', value)} />
          <Toggle label="Available on request at zero stock" checked={item.on_request} onChange={(value) => changeVariant(index, 'on_request', value)} />
          <Button onClick={() => { if (window.confirm('Remove this variant when the product is saved?')) change('variants', draft.variants.filter((variant) => variant.id !== item.id)) }}>Remove variant</Button>
        </fieldset>)}
        <Button disabled={draft.variants.length >= 100} onClick={() => change('variants', [...draft.variants, makeVariant()])}>Add variant</Button>
        <h3>Product photos</h3>
        <label>Upload JPEG, PNG or WebP (up to 2 MB each)<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={draft.images.length >= 12} onChange={upload} /></label>
        {draft.images.map((item, index) => <div key={item.path} className="catalog-admin-image">
          <AdminImage {...item} />
          <Field name="alt" label="Image description" value={item.alt} change={(_, value) => change('images', draft.images.map((photo) => photo.path === item.path ? { ...photo, alt: value } : photo))} maxLength={200} />
          <div className="catalog-actions">
            {index > 0 ? <Button onClick={() => change('images', [item, ...draft.images.filter((photo) => photo !== item)])}>Make primary</Button> : <span>Primary image</span>}
            {index > 1 && <Button onClick={() => {
              const reordered = [...draft.images]
              ;[reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]
              change('images', reordered)
            }}>Move up</Button>}
            <Button onClick={() => change('images', draft.images.filter((photo) => photo !== item))}>Remove</Button>
          </div>
        </div>)}
        <div className="catalog-actions">
          <Button type="submit" value="draft">Save Draft</Button>
          <Button type="submit" value="published">{draft.status === 'published' ? 'Update Published Product' : 'Publish Product'}</Button>
          <Button onClick={cancel}>Cancel</Button>
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>
}

function CategoryEditor({ initial, save, cancel }) {
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  async function submit(event) {
    event.preventDefault()
    if (initial.id && initial.is_active && !draft.is_active && !window.confirm('Hide this category and its products from the public store?')) return
    setBusy(true)
    setMessage('')
    try {
      await staffRpc('bishop_save_category', { payload: { ...draft, slug: draft.slug || makeSlug(draft.name) } })
      await save()
    } catch (issue) { setMessage(issue.message); setBusy(false) }
  }
  return <form className="catalog-form" onSubmit={submit}>
    <h2>{initial.id ? 'Edit category' : 'New category'}</h2>
    <Field name="name" label="Name" change={change} value={draft.name} maxLength={120} required />
    <Field name="slug" label="URL slug" change={change} value={draft.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={!!initial.id} maxLength={100} />
    <Field name="description" label="Description" change={change} value={draft.description} maxLength={1000} multiline />
    <Field name="display_order" label="Display order" change={change} value={draft.display_order} type="number" required />
    <Toggle label="Visible in the store" checked={draft.is_active} onChange={(value) => change('is_active', value)} />
    <div className="catalog-actions"><Button type="submit" disabled={busy}>Save category</Button><Button disabled={busy} onClick={cancel}>Cancel</Button></div>
    {message && <p role="alert">{message}</p>}
  </form>
}

function OwnerSettings({ data, refresh }) {
  const [business, setBusiness] = useState(data.business)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (key, value) => setBusiness((current) => ({ ...current, [key]: value }))
  async function run(operation, success) {
    setBusy(true)
    setMessage('')
    try { await operation(); await refresh(); setMessage(success) }
    catch (issue) { setMessage(issue.message) }
    finally { setBusy(false) }
  }
  const projects = business.projects || []
  return <section className="catalog-panel">
    <h2>Business contact settings</h2>
    <form className="catalog-form" onSubmit={(event) => { event.preventDefault(); run(() => staffRpc('bishop_save_business', { payload: business }), 'Business settings saved.') }}>
      <Field name="address" label="Confirmed shop address" value={business.address} change={change} maxLength={250} />
      <Field name="hours" label="Opening hours" value={business.hours} change={change} maxLength={200} />
      <Field name="whatsapp" label="WhatsApp number for prefilled enquiries" value={business.whatsapp} change={change} type="tel" pattern="[+]?[1-9][0-9]{7,14}" />
      <h3>Repair gallery and completed work</h3>
      {projects.map((item) => <fieldset className="catalog-form" key={item.id}>
        <legend>{item.name || 'New project'}</legend>
        {[["name", "Project name"], ["description", "Description"], ["image", "Public HTTPS photo URL"], ["url", "Public HTTPS project URL"]].map(([key, label]) =>
          <Field key={key} name={key} label={label} value={item[key]} required={key === 'name'} type={key === 'image' || key === 'url' ? 'url' : 'text'}
            change={(_, value) => change('projects', projects.map((project) => project.id === item.id ? { ...project, [key]: value } : project))} />)}
        <Button onClick={() => { if (window.confirm('Remove this project when settings are saved?')) change('projects', projects.filter(({ id }) => id !== item.id)) }}>Remove project</Button>
      </fieldset>)}
      <Button disabled={projects.length >= 30} onClick={() => change('projects', [...projects, { id: crypto.randomUUID(), name: '', description: '', image: '', url: '' }])}>Add completed work</Button>
      <Button type="submit" disabled={busy}>Save settings</Button>
    </form>
    <h2>Staff access</h2>
    <p>Invite editors in Supabase Auth first, then enter their user ID here.</p>
    <form className="catalog-form" onSubmit={(event) => {
      event.preventDefault()
      const target = new FormData(event.currentTarget).get('userId').trim()
      run(() => staffRpc('bishop_manage_editor', { target, enabled: true }), 'Editor access enabled.')
    }}>
      <label>Editor user ID<input name="userId" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" /></label>
      <Button type="submit" disabled={busy}>Enable editor access</Button>
    </form>
    <ul>{data.staff.map((member) => <li key={member.user_id}>
      {member.email || member.user_id} · {member.role} · {member.is_active ? 'Active' : 'Disabled'}{' '}
      {member.role === 'editor' && <Button disabled={busy} onClick={() => {
        if (!member.is_active || window.confirm('Disable this editor’s access?')) run(() => staffRpc('bishop_manage_editor', { target: member.user_id, enabled: !member.is_active }), 'Editor access updated.')
      }}>{member.is_active ? 'Disable' : 'Enable'}</Button>}
    </li>)}</ul>
    {message && <p role="status">{message}</p>}
  </section>
}

const tabs = ['Overview', 'Products', 'Categories', 'Inventory', 'Activity', 'Settings']
const statuses = ['draft', 'published', 'archived']

function Dashboard({ data, session, refresh, signOut, enroll }) {
  const [tab, setTab] = useState('Overview')
  const [editor, setEditor] = useState(null)
  const [categoryEditor, setCategoryEditor] = useState(null)
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const matches = data.products.filter((item) => (!status || item.status === status) &&
    (!category || item.category_id === category) && (!brand || item.brand === brand) &&
    (item.name + ' ' + item.brand + ' ' + item.variants.map(({ sku }) => sku).join(' ')).toLowerCase().includes(search.trim().toLowerCase()))
  if (sort === 'name') matches.sort((a,b) => a.name.localeCompare(b.name))
  const variants = data.products.filter(({ status }) => status !== 'archived').flatMap((product) =>
    product.variants.filter(({ active }) => active).map((variant) => ({ ...variant, product })))
  const low = variants.filter(({ quantity, threshold }) => quantity > 0 && quantity <= threshold)
  const out = data.products.filter((product) => product.status !== 'archived' && product.variants.some(({ active }) => active)
    && product.variants.filter(({ active }) => active).every(({ availability }) => availability === 'Out of Stock'))
  const brands = [...new Set(data.products.map(({ brand }) => brand).filter(Boolean))].sort()

  async function saved(warning) {
    setEditor(null)
    setCategoryEditor(null)
    try { await refresh(); setMessage(warning || 'Changes saved.') }
    catch (issue) { setMessage('Changes saved, but the dashboard could not refresh. ' + issue.message) }
  }
  async function changeStatus(product, next) {
    if (!window.confirm((next === 'archived' ? 'Archive ' : 'Unpublish ') + product.name + '?')) return
    setWorking(true)
    try { await staffRpc('bishop_save_product', { payload: { ...product, status: next } }); await saved() }
    catch (issue) { setMessage(issue.message) }
    finally { setWorking(false) }
  }
  function addProduct() {
    setTab('Products')
    setEditor({ ...productDefaults, category_id: data.categories.find(({ is_active }) => is_active)?.id || '' })
  }
  function editProduct(item) { setTab('Products'); setEditor(item) }

  return <>
    <header className="catalog-admin-header"><div><h1>Catalog dashboard</h1><p>{session.user.email} · {data.role}</p></div>
      <div className="catalog-actions"><a className="button button-secondary" href="/store" target="_blank" rel="noopener noreferrer">View Store</a>
        {!editor && <><Button onClick={enroll}>Authenticator setup</Button><Button onClick={signOut}>Sign out</Button></>}</div>
    </header>
    {!editor && <nav className="catalog-actions" aria-label="Dashboard sections">
      {tabs.filter((item) => data.role === 'owner' || !['Activity', 'Settings'].includes(item)).map((item) =>
        <button key={item} type="button" className={'button button-' + (item === tab ? 'primary' : 'secondary')} aria-pressed={item === tab} onClick={() => { if (categoryEditor && !window.confirm('Leave the category editor? Unsaved changes will be lost.')) return; setTab(item); setCategoryEditor(null); setMessage('') }}>{item}</button>)}
    </nav>}
    {message && <p role="status">{message}</p>}
    {editor ? <ProductEditor initial={editor} categories={data.categories} userId={session.user.id} save={saved} close={(warning) => { setEditor(null); setMessage(warning) }} /> : <>
      {tab === 'Overview' && <section className="catalog-panel">
        <div className="catalog-actions"><h2>Overview</h2><Button onClick={addProduct}>Add Product</Button></div>
        <dl className="catalog-metrics">{[
          ['Total products', data.products.length], ...statuses.map((value) => [value + ' products', data.products.filter((item) => item.status === value).length]),
          ['Out-of-stock products', out.length], ['Low-stock variants', low.length],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <h3>Recently updated</h3>
        {data.products.length ? <ul>{data.products.slice(0, 5).map((item) => <li key={item.id}><Button onClick={() => editProduct(item)}>{item.name}</Button></li>)}</ul> : <p>No products yet. Add a category before creating a product.</p>}
        <h3>Low stock</h3>
        {low.length ? <ul>{low.slice(0, 10).map((item) => <li key={item.id}>{item.product.name} · {item.sku} · {item.quantity} remaining</li>)}</ul> : <p>No low-stock alerts.</p>}
      </section>}
      {tab === 'Products' && <section className="catalog-panel">
        <div className="catalog-actions"><h2>Products</h2><Button onClick={addProduct}>Add Product</Button></div>
        <div className="catalog-filters">
          <label>Search<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
          <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Category<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }}>
            <option value="">All categories</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Brand<select value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1) }}>
            <option value="">All brands</option>{brands.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Sort<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
            <option value="recent">Recently updated</option><option value="name">Name</option></select></label>
        </div>
        {!matches.length ? <p>No matching products.</p> : <ul className="catalog-records">
          {matches.slice((page - 1) * 12, page * 12).map((item) => <li key={item.id}>
            <div className="catalog-list-product">
              {item.images[0] && <AdminImage {...item.images[0]} />}
              <div><strong>{item.name}</strong><p>{[item.brand, item.status, item.variants.length + ' variants'].filter(Boolean).join(' · ')}</p>
                {item.variants[0] && <p>{item.variants[0].sku} · {item.variants[0].price === null ? 'Enquire for price' : lkr.format(item.variants[0].price)} · {item.variants[0].availability}</p>}
              </div>
            </div>
            <div className="catalog-actions"><Button onClick={() => editProduct(item)}>Edit</Button>
              {item.status === 'published' && <Button disabled={working} onClick={() => changeStatus(item, 'draft')}>Unpublish</Button>}
              {item.status !== 'archived' && <Button disabled={working} onClick={() => changeStatus(item, 'archived')}>Archive</Button>}</div>
          </li>)}
        </ul>}
        {matches.length > 12 && <div className="catalog-actions">
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page} of {Math.ceil(matches.length / 12)}</span>
          <Button disabled={page * 12 >= matches.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>}
      </section>}
      {tab === 'Categories' && <section className="catalog-panel">
        {categoryEditor ? <CategoryEditor initial={categoryEditor} save={saved} cancel={() => setCategoryEditor(null)} /> : <>
          <div className="catalog-actions"><h2>Categories</h2><Button onClick={() => setCategoryEditor(categoryDefaults)}>Add Category</Button></div>
          {!data.categories.length && <p>No categories yet.</p>}
          <ul className="catalog-records">{data.categories.map((item) => <li key={item.id}><div>
            <strong>{item.name}</strong><p>{item.is_active ? 'Active' : 'Inactive'} · {data.products.filter((p) => p.category_id === item.id).length} products</p>
          </div><Button onClick={() => setCategoryEditor(item)}>Edit</Button></li>)}</ul>
        </>}
      </section>}
      {tab === 'Inventory' && <section className="catalog-panel">
        <h2>Variant inventory</h2>
        {!variants.length && <p>No active variants yet.</p>}
        <ul className="catalog-records">{variants.map((item) => <li key={item.id}><div>
          <strong>{item.product.name} · {item.name}</strong>
          <p>{item.sku} · {item.quantity} in stock ? Low-stock threshold {item.threshold}</p>
          {item.stock_updated_at && <p>Stock updated {new Date(item.stock_updated_at).toLocaleString('en-LK')}</p>}
        </div><Button onClick={() => editProduct(item.product)}>Update stock</Button></li>)}</ul>
      </section>}
      {tab === 'Activity' && data.role === 'owner' && <section className="catalog-panel"><h2>Recent activity</h2>
        {!data.activity.length && <p>No audit events yet.</p>}
        <ul className="catalog-records">{data.activity.map((item) => <li key={item.id}><div>
          <strong>{item.entity_type.replaceAll('_',' ')} · {item.action}</strong>
          <p>{data.staff.find(({ user_id }) => user_id === item.actor)?.email || item.actor || 'Database setup'} · {new Date(item.created_at).toLocaleString()}</p>
        </div></li>)}</ul>
      </section>}
      {tab === 'Settings' && data.role === 'owner' && <OwnerSettings data={data} refresh={refresh} />}
    </>}
  </>
}

export function HostedAdmin() {
  const [session, setSession] = useState(undefined)
  const [recovery, setRecovery] = useState(isPasswordSetup)
  const [mode, setMode] = useState('')
  const [data, setData] = useState(null)
  const [failure, setFailure] = useState('')

  useEffect(() => {
    if (!supabase) return
    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') {
        setFailure('')
        setData(null)
        setRecovery(false)
        setMode('')
      }
      setSession(next)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  async function refresh() {
    setData(await staffRpc('bishop_admin_catalog'))
  }
  async function authorize() {
    const { data: assurance, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) throw new Error('The session could not be verified.')
    if (assurance.currentLevel !== 'aal2' && assurance.nextLevel === 'aal2') {
      setMode('challenge')
      return
    }
    await refresh()
    setMode('')
  }

  const userId = session?.user.id
  useEffect(() => {
    if (!userId || recovery) return
    setData(null)
    setFailure('')
    authorize().catch((issue) => setFailure(issue.message))
  }, [userId, recovery])

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setFailure('Sign-out failed. Close this tab to end the local session.')
  }

  return <main className="shell catalog catalog-admin">
    <a href="/">Bishop Technologies</a>
    {!supabase ? <section className="catalog-panel"><h1>Catalog dashboard</h1><p>Supabase setup is required before staff can sign in.</p></section>
      : failure ? <section className="catalog-panel"><h1>Dashboard unavailable</h1><p role="alert">{failure}</p><Button onClick={signOut}>Sign out</Button></section>
      : session === undefined ? <p role="status">Checking session…</p>
      : !session ? <SignIn setRecovery={setRecovery} />
      : recovery || mode ? <Reconfirm mode={recovery ? 'password' : mode} complete={authorize} signOut={signOut} />
      : data ? <Dashboard data={data} session={session} refresh={refresh} signOut={signOut} enroll={() => setMode('enroll')} />
      : <p role="status">Checking staff access…</p>}
  </main>
}
