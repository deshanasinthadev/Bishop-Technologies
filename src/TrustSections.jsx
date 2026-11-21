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
    <div className="business-info-grid">
      <div>
        <h3>How to request a repair</h3>
        <ol>
          <li>Tell us the device model and what’s wrong.</li>
          <li>Send the enquiry through WhatsApp.</li>
          <li>Ask about assessment, next steps, and expected timing.</li>
        </ol>
        <a className="button button-secondary" href="/repair#enquiry">Request a Repair</a>
      </div>
      <div>
        <h3>Frequently asked questions</h3>
        <details><summary>Can I ask about device compatibility?</summary><p>Yes. Include your device brand and model and the part or accessory you’re interested in.</p></details>
        <details><summary>How do I confirm price and availability?</summary><p>Use the product’s WhatsApp enquiry button to ask about your preferred variant.</p></details>
        <details><summary>Can I request a website or software quote?</summary><p>Yes. <a href="/web-software#enquiry">Tell us about your project</a> and what you want it to do.</p></details>
      </div>
    </div>
  </section>
}
