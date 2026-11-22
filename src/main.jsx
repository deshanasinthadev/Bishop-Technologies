import { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CalendarDays, ChevronRight, CodeXml, Globe2, HardDrive, Laptop, MapPin,
  MemoryStick, MessageCircle, Monitor, Mouse, Plug, Smartphone, Wrench,
} from 'lucide-react'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import { defaultContent } from './content.js'
import { CopyEnquiry, EnquiryForm } from './Enquiry.jsx'
import { whatsappLink, whatsappUrl } from './whatsapp.js'
import { About, CustomerReviews, CustomerFaq, RepairProcess } from './TrustSections.jsx'
import { PageErrorBoundary } from './PageErrorBoundary.jsx'
import { RepairRequest } from './RepairRequest.jsx'
import { ServiceFinder } from './ServiceFinder.jsx'
import { deviceCategories, homeJourneys } from './customer-copy.js'
import './styles.css'

const links = [
  { path: '/repair', label: 'Repair' },
  { path: '/store', label: 'Store' },
  { path: '/web-software', label: 'Web & Software' },
]

const repairServices = [
  { icon: Laptop, title: 'Laptop repairs', description: 'Get help with screen, keyboard, battery, charging, or performance problems.' },
  { icon: Monitor, title: 'Desktop PC repairs', description: 'Find out what’s causing crashes, slowdowns, or a PC that won’t turn on.' },
  { icon: Smartphone, title: 'Phone repairs', description: 'Ask about screen damage, battery trouble, or charging issues.' },
  { icon: Wrench, title: 'Hardware diagnostics', description: 'Describe faults with charging, startup, or storage so we can discuss what to check.' },
  { icon: HardDrive, title: 'Motherboard and component repairs', description: 'Ask for an assessment if you suspect a board or component fault.' },
]

const softwareServices = [
  { icon: Globe2, title: 'Business websites', description: 'Help customers learn about your business, see what you offer, and get in touch.' },
  { icon: CalendarDays, title: 'Online booking systems', description: 'Let customers book appointments online and keep your bookings in one place.' },
  { icon: CodeXml, title: 'Custom software', description: 'Manage jobs, customers, and other everyday work with software built around your business.' },
  { icon: Monitor, title: 'Software installation and troubleshooting', description: 'Get help setting up software or resolving problems with an existing installation.' },
  { icon: Laptop, title: 'Remote IT support', description: 'Describe the issue to find out whether it can be handled remotely.' },
]

const categoryIcons = { 'hard-drive': HardDrive, memory: MemoryStick, plug: Plug, mouse: Mouse }
const heroImages = { repair: '/images/hero-repair.webp', software: '/images/hero-software.webp' }
const paths = ['/', ...links.map((link) => link.path)]
const hosted = import.meta.env.MODE === 'hosted'
const HostedStore = lazy(() => import('./HostedStore.jsx').then(({ HostedStore }) => ({ default: HostedStore })))
const HostedProductCard = lazy(() => import('./HostedStore.jsx').then(({ HostedProductCard }) => ({ default: HostedProductCard })))
const StaffEditor = hosted
  ? lazy(() => import('./HostedAdmin.jsx').then(({ HostedAdmin }) => ({ default: HostedAdmin })))
  : lazy(() => import('./Admin.jsx').then(({ Admin }) => ({ default: Admin })))

function Logo() {
  return (
    <a className="brand" href="/" aria-label="Bishop Technologies home">
      <span className="brand-mark"><img src="/images/bishop-mark.webp" width="42" height="42" alt="" /></span>
      <span className="brand-wordmark">BISHOP <span>TECHNOLOGIES</span></span>
    </a>
  )
}

function Header({ path, business }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav aria-label="Main navigation" className="main-nav">
          <a href="/" aria-current={path === '/' ? 'page' : undefined}>Home</a>
          {links.map(({ path: href, label }) => (
            <a key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</a>
          ))}
          <a href="/#about">About Us</a>
          <a href="/#contact">Contact</a>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </nav>
        <div className="header-location"><MapPin size={15} aria-hidden="true" />{business.country}</div>
      </div>
    </header>
  )
}

function Footer({ business }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <Logo />
        <nav aria-label="Footer navigation">
          {links.map(({ path, label }) => <a key={path} href={path}>{label}</a>)}
          <a href="/#contact">Contact</a>
        </nav>
        <span className="copyright">© {new Date().getFullYear()} {business.name}</span>
      </div>
    </footer>
  )
}

function Artwork({ src, label, Icon, className = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return <img className={className} src={src} alt={label ?? ''} loading={loading} onError={() => setFailed(true)} />
  }

  return (
    <div className={`artwork-placeholder ${className}`}>
      {Icon && <Icon size={30} strokeWidth={1.5} aria-hidden="true" />}
      <span>Image placeholder</span>
    </div>
  )
}

function HeroPanel({ kind, title, description, Icon }) {
  return (
    <article className={`hero-panel hero-${kind}`}>
      <Artwork src={heroImages[kind]} Icon={Icon} className="hero-image" loading="eager" />
      <div className="hero-shade" />
      <div className="hero-panel-content">
        <span className="hero-icon"><Icon size={22} aria-hidden="true" /></span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </article>
  )
}

function CategoryTile({ category }) {
  const Icon = categoryIcons[category.icon] || HardDrive
  return (
    <a className="category-tile" href={`/store?category=${category.id}`}>
      <div className="category-visual">
        {category.image ? <Artwork src={category.image} label={`${category.name} category illustration`} Icon={Icon} />
          : <div className="artwork-placeholder"><Icon size={30} aria-hidden="true" /></div>}
      </div>
      <div className="category-caption">
        <h3>{category.name}</h3>
        <ChevronRight size={19} aria-hidden="true" />
      </div>
    </a>
  )
}

function Contact({ business }) {
  const directions = business.directionsUrl || (business.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`
    : defaultContent.business.directionsUrl)
  return (
    <section className="contact-section" id="contact" aria-labelledby="contact-heading">
      <div className="shell contact-inner">
        <div>
          <h2 id="contact-heading">Get in touch</h2>
          <p>Ask about a repair, a product, or your next project.</p>
        </div>
        <div className="contact-options">
          <div className="contact-option">
            <MessageCircle size={22} aria-hidden="true" />
            <div>
              <h3>WhatsApp</h3>
              <a className="button button-secondary" href={whatsappLink} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            </div>
          </div>
          <div className="contact-option">
            <MapPin size={22} aria-hidden="true" />
            <div>
              <h3>Shop directions</h3>
              {business.address && <p>{business.address}</p>}
              {business.hours && <p>{business.hours}</p>}
              <a className="button button-secondary" href={directions} target="_blank" rel="noopener noreferrer">Get Directions</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CompletedWork({ projects, repairs = false }) {
  const entries = projects.filter((project) => Boolean(project.device_category) === repairs)
  if (!entries.length) return null
  const headingId = repairs ? 'repair-gallery-heading' : 'work-heading'
  return (
    <section className="work-section shell" aria-labelledby={headingId}>
      <h2 id={headingId}>{repairs ? 'Repair gallery' : 'Completed work'}</h2>
      <div className="project-grid">
        {entries.map((project) => (
          <article className="project-card" key={project.id}>
            <Artwork src={project.image} label={project.name} Icon={CodeXml} />
            <div>
              <h3>{project.name}</h3>
              {repairs && <p>{deviceCategories.find(({ id }) => id === project.device_category)?.label} · {project.problem}</p>}
              {project.description && <p>{project.description}</p>}
              {repairs && project.repair_date && <p><time dateTime={project.repair_date}>{project.repair_date}</time></p>}
              {repairs && <a href="/repair">See repair services</a>}
              {project.url && <a href={project.url}>View project</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Home({ business, categories, projects, featured }) {
  return (
    <>
      <section className="home-hero shell" aria-labelledby="home-heading">
        <div className="home-intro">
          <h1 id="home-heading">Your technology, <span>our expertise.</span></h1>
          <p>Computer and phone repairs, technology products, and websites and software for businesses in Sri Lanka.</p>
          <div className="home-actions">
            {homeJourneys.map(({ label, href }, index) =>
              <a className={'button button-' + (index === 0 ? 'primary' : 'secondary')} key={href} href={href}>{label}</a>)}
          </div>
        </div>
        <div className="hero-grid">
          <HeroPanel kind="repair" Icon={Wrench} title="Device Repairs"
            description="Get help with a laptop, desktop computer, or phone." />
          <HeroPanel kind="software" Icon={CodeXml} title="Web & Software"
            description="Websites, online booking, and software for your business." />
        </div>
      </section>
      <ServiceFinder />
      <section className="store-preview shell" aria-labelledby="store-preview-heading">
        <div className="section-heading">
          <div>
            <h2 id="store-preview-heading">Tech essentials</h2>
            <p>Upgrades, replacements, and everyday accessories.</p>
          </div>
          <a className="button button-secondary" href="/store">Browse the Store</a>
        </div>
        <div className="category-grid">
          {categories.map((category) => <CategoryTile category={category} key={category.id} />)}
        </div>
        {categories.some(({ image }) => image) && <p className="image-note">Illustrative category photos</p>}
      </section>
      {featured.length > 0 && <section className="work-section shell catalog" aria-labelledby="featured-heading">
        <h2 id="featured-heading">Featured Products</h2>
        <Suspense fallback={<p role="status">Loading featured products…</p>}><div className="product-grid">
          {featured.map((product) => <HostedProductCard key={product.id} product={product} business={business} />)}
        </div></Suspense>
      </section>}
      <About />
      <RepairProcess />
      <CompletedWork projects={projects} repairs />
      <CompletedWork projects={projects} />
      <CustomerReviews />
      <CustomerFaq />
      <Contact business={business} />
    </>
  )
}

function ServicePage({ kind, whatsapp }) {
  const repair = kind === 'repair'
  const Icon = repair ? Wrench : CodeXml
  const title = repair ? 'Device Repair Services' : 'Websites & Software for Your Business'
  const description = repair
    ? 'Get help with a laptop, desktop PC, or phone that isn’t working as it should.'
    : 'Get a website, booking system, custom tool, or IT support for your business.'
  const services = repair ? repairServices : softwareServices
  return (
    <>
      <section className="shell subpage-top">
        <div className={`subpage-hero hero-${kind}`}>
          <Artwork src={heroImages[kind]} Icon={Icon} className="hero-image" loading="eager" />
          <div className="hero-shade" />
          <div className="subpage-hero-content">
            <span className="hero-icon"><Icon size={22} aria-hidden="true" /></span>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="home-actions">
              <a className="button button-primary" href="#enquiry">{repair ? 'Request a Repair' : 'Request a Quote'}</a>
              <a className="button button-secondary" href={whatsappLink} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
      <div className="shell service-layout">
        <section className="service-list" aria-labelledby="services-heading">
          <h2 id="services-heading">{repair ? 'What we repair' : 'Software and digital services'}</h2>
          {services.map(({ icon: ServiceIcon, title: name, description: detail }) => (
            <article className="service-item" key={name}>
              <span className="service-icon"><ServiceIcon size={22} aria-hidden="true" /></span>
              <div><h3>{name}</h3><p>{detail}</p><a href="#enquiry">{repair ? 'Request a Repair' : 'Request a Quote'}</a></div>
            </article>
          ))}
        </section>
        <section className="form-card" id="enquiry" aria-labelledby="enquiry-heading">
          <h2 id="enquiry-heading" tabIndex={-1}>{repair ? 'Request a Repair' : 'Request a Quote'}</h2>
          <p>{repair ? 'Tell us about your device and what needs fixing.' : 'Tell us a little about your business and what you need.'}</p>
          {repair ? <RepairRequest whatsapp={whatsapp} /> : <EnquiryForm whatsapp={whatsapp} />}
        </section>
      </div>
      {repair && <RepairProcess />}
    </>
  )
}

function ProductCard({ item, category, preview, whatsapp }) {
  const Icon = categoryIcons[category.icon]
  const message = `Hi Bishop Technologies, I would like to ask about ${item.name}. Can you share the options and availability?`
  const chat = whatsappUrl(message, whatsapp)
  return (
    <article className="product-card">
      <div className="category-visual">
        <Artwork key={item.image ?? 'placeholder'} src={item.image}
          label={preview ? `${item.name} category illustration` : item.name} Icon={Icon} />
      </div>
      <div className="product-content">
        <h2>{item.name}</h2>
        {item.description && <p>{item.description}</p>}
        {(item.price || item.stock) && (
          <div className="product-details">
            {item.price && <strong>{item.price}</strong>}
            {item.stock && <span>{item.stock}</span>}
          </div>
        )}
        {chat
          ? <a className="button button-secondary" href={chat} target="_blank" rel="noreferrer">Ask on WhatsApp</a>
          : <><a className="button button-secondary" href={whatsappLink} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a><CopyEnquiry message={message} /></>}
      </div>
    </article>
  )
}

function Store({ business, categories, products }) {
  const query = new URLSearchParams(window.location.search)
  const active = categories.find((category) => category.id === query.get('category'))?.id
  const displayed = categories.filter((category) => !active || active === category.id)
  const items = displayed.flatMap((category) => {
    const listed = products.filter((product) => product.category === category.id)
    return listed.length
      ? listed.map((item) => ({ item, category, key: item.id }))
      : [{ item: category, category, preview: true, key: category.id }]
  })
  return (
    <section className="shell store-page" aria-labelledby="store-heading">
      <div className="store-intro">
        <h1 id="store-heading">Tech Store</h1>
        <p>Browse SSDs, RAM, chargers, and accessories. Ask us what works with your device.</p>
      </div>
      <nav className="store-filters" aria-label="Product categories">
        <a href="/store" aria-current={!active ? 'page' : undefined}>All products</a>
        {categories.map((category) => (
          <a key={category.id} href={`/store?category=${category.id}`} aria-current={active === category.id ? 'page' : undefined}>
            {category.name}
          </a>
        ))}
      </nav>
      {!whatsappUrl('', business.whatsapp) && <p className="notice store-notice">Copy a product enquiry to paste into your WhatsApp chat.</p>}
      <div className="product-grid">
        {items.map(({ item, category, preview, key }) => (
          <ProductCard key={key} item={item} category={category} preview={preview} whatsapp={business.whatsapp} />
        ))}
      </div>
      {items.some((entry) => entry.preview) && <p className="image-note">Illustrative category photos. Individual product listings will be added as details become available.</p>}
    </section>
  )
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const productSlug = hosted ? /^\/store\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path)?.[1] : undefined
  const route = productSlug ? '/store' : paths.includes(path) ? path : '/'
  const [content, setContent] = useState(() => hosted ? { ...defaultContent, categories: [] } : defaultContent)
  const [featured, setFeatured] = useState([])
  const { business, categories, products, projects } = content

  useEffect(() => {
    const controller = new AbortController()
    if (hosted) {
      import('./catalog-client.js').then(({ catalogRpc }) => catalogRpc('bishop_site_info', {}, controller.signal)).then((info) => {
        if (controller.signal.aborted) return
        setContent({ ...defaultContent, business: { ...defaultContent.business, ...info.business }, projects: info.projects,
          categories: info.categories.map((item) => ({ ...defaultContent.categories.find(({ id }) => id === item.slug), ...item, id: item.slug })) })
        setFeatured(info.featured)
      }).catch(() => {})
      return () => controller.abort()
    }
    fetch('/api/content', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.content) setContent(data.content) })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (window.location.hash === '#enquiry') {
      const section = document.getElementById('enquiry')
      section?.scrollIntoView()
      section?.querySelector('h2')?.focus({ preventScroll: true })
    }
    if (window.location.hash === '#contact' || window.location.hash === '#about') {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
    }
  }, [route])

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header path={route} business={business} />
      <main id="main-content" tabIndex={-1}>
        <PageErrorBoundary title="This page is temporarily unavailable">
          {route === '/' && <Home business={business} categories={categories} projects={projects} featured={featured} />}
          {route === '/repair' && <ServicePage kind="repair" whatsapp={business.whatsapp} />}
          {route === '/store' && (hosted
            ? <Suspense fallback={<p className="shell" role="status">Loading store…</p>}><HostedStore business={business} slug={productSlug} /></Suspense>
            : <Store business={business} categories={categories} products={products} />)}
          {route === '/web-software' && <ServicePage kind="software" whatsapp={business.whatsapp} />}
        </PageErrorBoundary>
      </main>
      {route !== '/repair' && route !== '/web-software' && <a className="floating-chat" aria-label="Chat on WhatsApp" href={whatsappLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={23} aria-hidden="true" /></a>}
      <Footer business={business} />
    </>
  )
}

const root = createRoot(document.getElementById('root'))
const adminPath = hosted ? /^\/admin(?:\/|$)/ : /^\/admin\/?$/
if (adminPath.test(window.location.pathname)) {
  root.render(<PageErrorBoundary title="The editor is temporarily unavailable">
    <Suspense fallback={<p className="shell" role="status">Loading editor…</p>}>
      <StaffEditor />
    </Suspense>
  </PageErrorBoundary>)
} else {
  root.render(<App />)
}
