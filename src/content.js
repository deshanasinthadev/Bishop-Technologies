export const business = {
  name: 'Bishop Technologies',
  country: 'Sri Lanka',
  // Enter an international number, including country code.
  whatsapp: '',
  address: '',
  directionsUrl: 'https://share.google/hzkr9iv7tOhYueV00',
  hours: '',
}

// The photos show each category. Replace them with your own photos as needed.
export const categories = [
  {
    id: 'ssds', name: 'SSDs', icon: 'hard-drive',
    description: 'Storage upgrades for laptops and desktop PCs.',
    image: '/images/store-ssd.webp',
  },
  {
    id: 'ram', name: 'RAM', icon: 'memory',
    description: 'Memory upgrades for everyday work and multitasking.',
    image: '/images/store-ram.webp',
  },
  {
    id: 'chargers', name: 'Chargers', icon: 'plug',
    description: 'Replacement chargers for laptops and phones.',
    image: '/images/store-chargers.webp',
  },
  {
    id: 'accessories', name: 'Accessories', icon: 'mouse',
    description: 'Useful extras for your desk and devices.',
    image: '/images/store-accessories.webp',
  },
]

// Each product needs id, category (a category id above), and name.
// Optional fields: description, image (URL or public file path), price (display text), stock (display text).
export const products = []

// Each completed project needs id and name. Optional fields: description, image, url.
export const projects = []

export const defaultContent = { business, categories, products, projects }
