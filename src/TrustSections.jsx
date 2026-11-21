import { faq, repairProcess } from './customer-copy.js'

function googleLink(value) {
  try {
    const url = new URL(value)
    const hosts = ['www.google.com', 'google.com', 'maps.google.com', 'maps.app.goo.gl', 'g.page', 'search.google.com', 'share.google']
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : ''
  } catch {
    return ''
  }
}

const readReviews = googleLink(import.meta.env.VITE_GOOGLE_REVIEWS_URL)
const writeReview = googleLink(import.meta.env.VITE_GOOGLE_WRITE_REVIEW_URL)

export function CustomerReviews() {
  if (!readReviews && !writeReview) return null
  return <section className="work-section shell" aria-labelledby="reviews-heading">
    <div className="section-heading">
      <div><h2 id="reviews-heading">Customer Reviews</h2><p>Source: Google Maps</p></div>
      <div className="home-actions">
        {readReviews && <a className="button button-secondary" href={readReviews} target="_blank" rel="noopener noreferrer">Read All Reviews on Google</a>}
        {writeReview && <a className="button button-secondary" href={writeReview} target="_blank" rel="noopener noreferrer">Write a Review</a>}
      </div>
    </div>
  </section>
}

export function About() {
  return <section className="work-section shell" id="about" aria-labelledby="about-heading">
    <div className="section-heading">
      <div><h2 id="about-heading">About Bishop Technologies</h2>
        <p>Device repairs, technology products, and websites and software for businesses in Sri Lanka.</p>
      </div>
    </div>
  </section>
}

export function RepairProcess() {
  return <section className="work-section shell" aria-labelledby="process-heading">
    <h2 id="process-heading">How repairs work</h2>
    <ol className="repair-process">{repairProcess.map((label) => <li key={label}>{label}</li>)}</ol>
    <p>Ask about assessment, estimated cost and timing before agreeing to a repair. For questions about device handling or repair warranty, contact the shop.</p>
  </section>
}

export function CustomerFaq() {
  return <section className="work-section shell" aria-labelledby="faq-heading">
    <h2 id="faq-heading">Frequently asked questions</h2>
    <div className="customer-faq">
      {faq.map(({ question, answer, link, action }) => <details key={question}>
        <summary>{question}</summary>
        <p>{answer} {link && <a href={link}>{action}</a>}</p>
      </details>)}
    </div>
  </section>
}
