export const siteConfig = {
  clientSlug: import.meta.env.VITE_SITE_CLIENT_SLUG || '2747-tees',
  workerBaseUrl: import.meta.env.VITE_WORKER_BASE_URL || '',
  fallbackMode: !import.meta.env.VITE_WORKER_BASE_URL,

  // Edit these only when you want to change text/logo content.
  brand: {
    createdBy: 'Created by',
    creatorName: 'CRUMP',
    shopNumberA: '27',
    shopNumberB: '47',
    shopLabel: 'TEES',
    email: 'hello@createdbycrump.com'
  },

  copy: {
    shipping: 'FREE SHIPPING ON ORDERS OVER',
    shippingAmount: '$75',
    eyebrow: 'BOLD DESIGNS. REAL EXPRESSION.',
    headline1: 'Wear Your',
    headline2: 'Energy.',
    headline3: 'Live Your',
    headline4: 'Vision.',
    subhead: 'Colorful, comfortable, and\ncreated to stand out.',
    newsletterTitle: 'JOIN THE CREW',
    newsletterText: 'Be the first to know about new drops, exclusive\ndeals, and special surprises.',
    footerText: 'Colorful designs. Real expression.\nMade for those who create their\nown path.',
    copyright: '© 2024 Created by Crump x 2747 Tees. All rights reserved.'
  }
};
