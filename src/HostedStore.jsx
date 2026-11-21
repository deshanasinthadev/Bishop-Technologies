import { useEffect, useState } from 'react'
import { catalogRpc, imageUrl } from './catalog-client.js'
import { CopyEnquiry } from './Enquiry.jsx'
import { whatsappLink, whatsappUrl } from './whatsapp.js'
import './catalog.css'

const currency = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 })
const pageSize = 24

function ProductEnquiry({ product, variant, business }) {
  const message = ['Hello Bishop Technologies, I would like to enquire about', product.name + (variant ? ' (' + variant.name + ', SKU ' + variant.sku + ')' : '') + '.'].join(' ')
  const prefilled = whatsappUrl(message, business.whatsapp)
  return <div className="catalog-actions">
    <a className="button button-secondary" href={prefilled || whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp Enquiry</a>
    {!prefilled && <CopyEnquiry message={message} />}
  </div>
}

function ProductImage({ image, name }) {
  const [failed, setFailed] = useState(false)
  return image && !failed
    ? <img className="catalog-photo" src={imageUrl(image.path)} alt={image.alt || name} loading="lazy" onError={() => setFailed(true)} />
    : <div className="catalog-photo catalog-photo-empty">No product photo</div>
}

export function HostedProductCard({ product, business }) {
  const prices = product.variants.map(({ price }) => price).filter((price) => price !== null)
  const available = product.variants.find(({ availability }) => availability === 'In Stock')
    || product.variants.find(({ availability }) => availability === 'Available on Request') || product.variants[0]
  return <article className="product-card">
    <ProductImage image={product.images[0]} name={product.name} />
    <div className="product-content">
      {product.brand && <p>{product.brand}</p>}
      <h2>{product.name}</h2>
      {product.specifications && <p className="catalog-summary">{product.specifications}</p>}
      <p>{prices.length ? (product.variants.length > 1 ? 'From ' : '') + currency.format(Math.min(...prices)) : 'Enquire for price'}</p>
      {available && <p>{available.availability}</p>}
      <a className="button button-primary" href={'/store/' + product.slug}>View Details</a>
      <ProductEnquiry product={product} variant={product.variants.length === 1 ? available : null} business={business} />
    </div>
  </article>
}

function ProductDetails({ product, business }) {
  const [variantId, setVariant] = useState(product.variants[0]?.id || '')
  const [activeImage, setImage] = useState(0)
  const variant = product.variants.find(({ id }) => id === variantId)
  const image = product.images[activeImage]
  return <>
    <p><a href="/store">Back to Store</a></p>
    <article className="catalog-detail">
      <div>
        <ProductImage key={image?.path} image={image} name={product.name} />
        {product.images.length > 1 && <div className="catalog-actions" aria-label="Product photos">
          {product.images.map((photo, index) => <button key={photo.path} className="button button-secondary" type="button" aria-pressed={activeImage === index} onClick={() => setImage(index)}>Photo {index + 1}</button>)}
        </div>}
      </div>
      <div>
        <h1>{product.name}</h1>
        {product.brand && <p>{product.brand}</p>}
        <p className="catalog-description">{product.description}</p>
        {product.specifications && <><h2>Specifications</h2><p className="catalog-description">{product.specifications}</p></>}
        {product.warranty && <><h2>Warranty</h2><p>{product.warranty}</p></>}
        {product.variants.length > 1 && <label>Variant<select aria-label="Variant" value={variantId} onChange={(event) => setVariant(event.target.value)}>
          {product.variants.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label>}
        {variant && <p aria-live="polite">{variant.name} · SKU {variant.sku} · {variant.availability} · {variant.price === null ? 'Enquire for price' : currency.format(variant.price)}</p>}
        <ProductEnquiry product={product} variant={variant} business={business} />
      </div>
    </article>
  </>
}

export function HostedStore({ business, slug }) {
  const params = new URLSearchParams(window.location.search)
  const [category, setCategory] = useState(params.get('category') || '')
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('featured')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [page, setPage] = useState(1)
  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState('loading')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    catalogRpc('bishop_catalog', { search_term: term, category_slug: category, brand_name: brand, sort_order: sort,
      page_number: page, product_slug: slug || '', minimum_price: min === '' ? null : Number(min), maximum_price: max === '' ? null : Number(max) }, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setCatalog(data); setStatus('ready') } })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [term, category, brand, sort, page, slug, min, max, retry])

  const product = catalog?.products[0]
  useEffect(() => {
    if (slug && status === 'ready' && product) document.title = product.name + ' | Bishop Technologies'
  }, [slug, status, product])

  const update = (setter) => (event) => { setter(event.target.value); setPage(1) }
  const details = { ...business, ...catalog?.business }
  return <section className="shell store-page catalog">
    {!slug && <>
      <div className="store-intro"><h1>Technology Store</h1><p>Explore products, compare options, and enquire about availability.</p></div>
      <div className="catalog-filters">
        <label>Search products<input type="search" value={search} onChange={update(setSearch)} maxLength={120} /></label>
        <label>Category<select value={category} onChange={update(setCategory)}>
          <option value="">All categories</option>
          {(catalog?.categories || []).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select></label>
        {!!catalog?.brands.length && <label>Brand<select value={brand} onChange={update(setBrand)}>
          <option value="">All brands</option>{catalog.brands.map((name) => <option key={name}>{name}</option>)}
        </select></label>}
        <label>Sort by<select value={sort} onChange={update(setSort)}>
          <option value="featured">Featured</option><option value="name">Name</option>
          <option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option>
        </select></label>
        <label>Min price (LKR)<input type="number" min="0" value={min} onChange={update(setMin)} /></label>
        <label>Max price (LKR)<input type="number" min="0" value={max} onChange={update(setMax)} /></label>
      </div>
    </>}
    {status === 'loading' && <p role="status">Loading products…</p>}
    {status === 'error' && <div role="alert"><p>The catalog is temporarily unavailable.</p><button className="button button-secondary" type="button" onClick={() => setRetry(retry + 1)}>Try again</button></div>}
    {status === 'ready' && (slug ? product
      ? <ProductDetails key={product.id} business={details} product={product} />
      : <><h1>Product unavailable</h1><p><a href="/store">Browse the Store</a></p></>
      : <>
        {!catalog.total && <p role="status">{search || category || brand || min || max ? 'No products match these filters.' : 'No products are listed yet.'}</p>}
        <div className="product-grid">{catalog.products.map((item) => <HostedProductCard key={item.id} product={item} business={details} />)}</div>
        {catalog.total > pageSize && <nav className="catalog-actions" aria-label="Catalog pages">
          <button className="button button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(catalog.total / pageSize)}</span>
          <button className="button button-secondary" disabled={page * pageSize >= catalog.total} onClick={() => setPage(page + 1)}>Next</button>
        </nav>}
      </>)}
  </section>
}
