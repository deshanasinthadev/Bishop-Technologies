// Keep journey labels and FAQ copy together for review and future translations.
export const deviceCategories = [
  { id: 'laptop', label: 'Laptop', service: 'Laptop repairs' },
  { id: 'desktop', label: 'Desktop computer', service: 'Desktop PC repairs' },
  { id: 'mobile', label: 'Mobile phone', service: 'Phone repairs' },
  { id: 'other', label: 'Other device', service: 'Device repairs' },
]

export const repairProblems = [
  ['power', 'Device not turning on'], ['slow', 'Running slowly'], ['display', 'Display problem'],
  ['charge', 'Charging problem'], ['storage', 'Storage problem'], ['software', 'Software error'], ['other', 'Other problem'],
]

export const repairProcess = ['Contact us', 'Device assessment', 'Discuss the repair', 'Repair', 'Collection']

export const repairSteps = ['Device', 'Problem', 'Contact', 'Review']

export const homeJourneys = [
  { label: 'Get a Repair', href: '/repair' },
  { label: 'Shop Products', href: '/store' },
  { label: 'Explore Digital Services', href: '/web-software' },
]

export const faq = [
  { question: 'How do I request a repair?', answer: 'Describe your device and what happened. Review your request, then send it through WhatsApp.', link: '/repair#enquiry', action: 'Start a repair request' },
  { question: 'Can I contact you before visiting?', answer: 'Yes. You can ask about opening hours and whether to bring your device or accessories.', link: '#contact', action: 'See contact options' },
  { question: 'How do I enquire about a product?', answer: 'Open the product, choose the version you want, and use its WhatsApp enquiry link.', link: '/store', action: 'Browse the Store' },
  { question: 'How do I check compatibility?', answer: 'Share your device brand and exact model and the product you’re considering. Ask us to confirm which version fits.' },
  { question: 'How are repair estimates handled?', answer: 'Share the symptoms first. Ask what assessment is needed and discuss the estimate before agreeing to a repair.' },
  { question: 'Can I ask for a website or software quote?', answer: 'Yes. Tell us what you want the website or software to do.', link: '/web-software#enquiry', action: 'Tell us about your project' },
  { question: 'Where is the shop?', answer: 'Open the shop’s Google Maps listing for directions.', link: '#contact', action: 'Find the shop' },
  { question: 'How can I ask about warranty or returns?', answer: 'Ask which terms apply to your product or repair, and what you need to keep as proof of purchase.', link: '#contact', action: 'Ask about the terms' },
]
