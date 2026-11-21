import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CalendarDays, ChevronRight, CodeXml, Globe2, HardDrive, Laptop, MapPin,
  MemoryStick, MessageCircle, Monitor, Mouse, Plug, Smartphone, Wrench,
} from 'lucide-react'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import { defaultContent } from './content.js'
import { CopyEnquiry, EnquiryForm } from './Enquiry.jsx'
import { whatsappUrl } from './whatsapp.js'
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
]

const softwareServices = [
  { icon: Globe2, title: 'Business websites', description: 'Help customers learn about your business, see what you offer, and get in touch.' },
  { icon: CalendarDays, title: 'Online booking systems', description: 'Let customers book appointments online and keep your bookings in one place.' },
  { icon: CodeXml, title: 'Custom software', description: 'Manage jobs, customers, and other everyday work with software built around your business.' },
]

const categoryIcons = { 'hard-drive': HardDrive, memory: MemoryStick, plug: Plug, mouse: Mouse }
const heroImages = { repair: '/images/hero-repair.webp', software: '/images/hero-software.webp' }
const paths = ['/', ...links.map((link) => link.path)]

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
          {links.map(({ path: href, label }) => (
            <a key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</a>
          ))}
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

function HeroPanel({ kind, title, description, label, href, Icon }) {
  return (
    <article className={`hero-panel hero-${kind}`}>
      <Artwork src={heroImages[kind]} Icon={Icon} className="hero-image" loading="eager" />
      <div className="hero-shade" />
      <div className="hero-panel-content">
        <span className="hero-icon"><Icon size={22} aria-hidden="true" /></span>
        <h2>{title}</h2>
        <p>{description}</p>
        <a className="button button-primary" href={href}>{label}</a>
      </div>
    </article>
  )
}

function CategoryTile({ category }) {
  const Icon = categoryIcons[category.icon]
  return (
    <a className="category-tile" href={`/store?category=${category.id}`}>
      <div className="category-visual">
        <Artwork src={category.image} label={`${category.name} category illustration`} Icon={Icon} />
      </div>
      <div className="category-caption">
        <h3>{category.name}</h3>
        <ChevronRight size={19} aria-hidden="true" />
      </div>
    </a>
  )
}

function Contact({ business }) {
  const chat = whatsappUrl('', business.whatsapp)
  const directions = business.directionsUrl || (business.address &&
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`)
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
              {chat
                ? <a href={chat} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
                : <p>Online chat is currently unavailable.</p>}
            </div>
          </div>
          <div className="contact-option">
            <MapPin size={22} aria-hidden="true" />
            <div>
              <h3>Shop directions</h3>
              {business.address && <p>{business.address}</p>}
              {business.hours && <p>{business.hours}</p>}
              {directions
                ? <a href={directions} target="_blank" rel="noreferrer">Get directions</a>
                : <p>Shop location to be added.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CompletedWork({ projects }) {
  if (!projects.length) return null
  return (
    <section className="work-section shell" aria-labelledby="work-heading">
      <h2 id="work-heading">Completed work</h2>
      <div className="project-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <Artwork src={project.image} Icon={CodeXml} />
            <div>
              <h3>{project.name}</h3>
              {project.description && <p>{project.description}</p>}
              {project.url && <a href={project.url}>View project</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Home({ business, categories, projects }) {
  return (
    <>
      <section className="home-hero shell" aria-labelledby="home-heading">
        <div className="home-intro">
          <h1 id="home-heading">Tech that works <span>for you.</span></h1>
          <p>Device repairs, tech essentials, and digital tools for businesses in Sri Lanka.</p>
        </div>
        <div className="hero-grid">
          <HeroPanel kind="repair" Icon={Wrench} title="Device Repairs"
            description="Get your laptop, desktop PC, or phone working again."
            label="Book a Repair" href="/repair#enquiry" />
          <HeroPanel kind="software" Icon={CodeXml} title="Web & Software"
            description="Websites, online booking, and software for your business."
            label="Discuss a Project" href="/web-software#enquiry" />
        </div>
      </section>
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
        <p className="image-note">Illustrative category photos</p>
      </section>
      <CompletedWork projects={projects} />
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
    : 'Get a website, booking system, or custom tool that makes running your business easier.'
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
          </div>
        </div>
      </section>
      <div className="shell service-layout">
        <section className="service-list" aria-labelledby="services-heading">
          <h2 id="services-heading">{repair ? 'What we repair' : 'What we build'}</h2>
          {services.map(({ icon: ServiceIcon, title: name, description: detail }) => (
            <article className="service-item" key={name}>
              <span className="service-icon"><ServiceIcon size={22} aria-hidden="true" /></span>
              <div><h3>{name}</h3><p>{detail}</p></div>
            </article>
          ))}
        </section>
        <section className="form-card" id="enquiry" aria-labelledby="enquiry-heading">
          <h2 id="enquiry-heading" tabIndex={-1}>{repair ? 'Book a Repair' : 'Request a Quote'}</h2>
          <p>{repair ? 'Tell us about your device and what needs fixing.' : 'Tell us a little about your business and what you need.'}</p>
          <EnquiryForm kind={repair ? 'repair' : 'quote'} whatsapp={whatsapp} />
        </section>
      </div>
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
          : <CopyEnquiry message={message} />}
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
      {!whatsappUrl('', business.whatsapp) && <p className="notice store-notice">Online sending is unavailable right now. You can copy a product enquiry below.</p>}
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
  const route = paths.includes(path) ? path : '/'
  const [content, setContent] = useState(defaultContent)
  const { business, categories, products, projects } = content

  useEffect(() => {
    const controller = new AbortController()
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
    if (window.location.hash === '#contact') document.getElementById('contact')?.scrollIntoView()
  }, [route])

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header path={route} business={business} />
      <main id="main-content" tabIndex={-1}>
        {route === '/' && <Home business={business} categories={categories} projects={projects} />}
        {route === '/repair' && <ServicePage kind="repair" whatsapp={business.whatsapp} />}
        {route === '/store' && <Store business={business} categories={categories} products={products} />}
        {route === '/web-software' && <ServicePage kind="software" whatsapp={business.whatsapp} />}
      </main>
      <Footer business={business} />
    </>
  )
}

const root = createRoot(document.getElementById('root'))
if (/^\/admin\/?$/.test(window.location.pathname)) {
  import('./Admin.jsx').then(({ Admin }) => root.render(<Admin />))
} else {
  root.render(<App />)
}
