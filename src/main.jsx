import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { siteConfig } from './config';
import { createHostedCheckout, createPayment, getCatalog, getPublicConfig } from './api';
import './styles.css';

const BASE_PATH = '/2747';
const ROUTES = {
  home: '/',
  shop: '/shop',
  newArrivals: '/new-arrivals',
  collections: '/collections',
  about: '/about',
  contact: '/contact',
  cart: '/cart',
  success: '/success',
  cancel: '/cancel'
};

const heroImages = [
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=90'
];

const fallbackProducts = [
  { id: 'seed-1', variationId: 'seed-1-var', name: 'Paint Splash Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80', category: 'Graphic Tees' },
  { id: 'seed-2', variationId: 'seed-2-var', name: 'Create Your Reality Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=500&q=80', category: 'New Arrivals' },
  { id: 'seed-3', variationId: 'seed-3-var', name: 'Hummingbird Hoodie', price: '$54.99', amount: 5499, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=500&q=80', category: 'Sweatshirts' },
  { id: 'seed-4', variationId: 'seed-4-var', name: 'Vibrant Hummingbird Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=500&q=80', category: 'Graphic Tees' },
  { id: 'seed-5', variationId: 'seed-5-var', name: 'Drip Logo Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=500&q=80', category: 'New Arrivals' },
  { id: 'seed-6', variationId: 'seed-6-var', name: '2747 Drip Hoodie', price: '$54.99', amount: 5499, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=500&q=80', category: 'Sweatshirts' },
];

const fallbackCategories = [
  ['NEW ARRIVALS', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'],
  ['GRAPHIC TEES', 'https://images.unsplash.com/photo-1506629905607-d9e297d2d223?auto=format&fit=crop&w=700&q=80'],
  ['SWEATSHIRTS', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80'],
  ['ACCESSORIES', 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=700&q=80'],
];

const pageMap = new Map(Object.values(ROUTES).map((r) => [r, r]));

console.assert(heroImages.length > 1, 'Hero carousel should have more than one image.');
console.assert(fallbackProducts.length >= 6, 'Fallback catalog should include featured products.');
console.assert(fallbackCategories.length === 4, 'Homepage should keep four category cards.');

function routeFromPath(pathname) {
  const clean = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || '/' : pathname || '/';
  return pageMap.get(clean) || ROUTES.home;
}

function goTo(route) {
  const url = `${BASE_PATH}${route}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const money = (amount = 0) => `$${(amount / 100).toFixed(2)}`;

function BrandLogo() {
  const b = siteConfig.brand;
  return <div className="logo"><div className="logo-left">{b.createdBy}<span>{b.creatorName}</span></div><div className="bird">🪽</div><div className="x">×</div><div className="logo-main">{b.shopNumberA}<em>{b.shopNumberB}</em><small>{b.shopLabel}</small></div></div>;
}

function ProductGrid({ products, addToCart }) {
  return <section className="products">{products.map((p) => <div className="prod" key={p.variationId || p.id}><div className="badge">NEW</div><button className="prod-img" onClick={() => addToCart(p)}><img src={p.image} alt={p.name} /></button><h4>{p.name}</h4><div className="price">{p.price}</div>{typeof p.stock === 'number' && <small className="stock">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</small>}<button className="add-btn" onClick={() => addToCart(p)} disabled={p.stock === 0}>ADD TO CART</button></div>)}</section>;
}

function HeroCarousel({ currentHero }) {
  return <div className="hero-img">{heroImages.map((img, index) => <div key={img} className={`hero-slide ${index === currentHero ? 'active' : ''}`} style={{ backgroundImage: `url(${img})` }} />)}</div>;
}

function App() {
  const [catalogProducts, setCatalogProducts] = useState(null);
  const [catalogCategories, setCatalogCategories] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [route, setRoute] = useState(routeFromPath(window.location.pathname));
  const [currentHero, setCurrentHero] = useState(0);
  const c = siteConfig.copy;

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentHero((prev) => (prev + 1) % heroImages.length), 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { (async () => {
    try {
      const catalog = await getCatalog();
      if (catalog?.products?.length) setCatalogProducts(catalog.products);
      if (catalog?.categories?.length) setCatalogCategories(catalog.categories.map(cat => [cat.name.toUpperCase(), cat.image || fallbackCategories[0][1]]));
    } catch (err) { console.warn('Using fallback catalog:', err.message); }
  })(); }, []);

  const products = catalogProducts || fallbackProducts;
  const categories = catalogCategories || fallbackCategories;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const total = cart.reduce((s, i) => s + i.amount * i.quantity, 0);
  const newArrivalProducts = useMemo(() => products.filter((p) => /new/i.test(p.category || p.name)), [products]);

  function addToCart(product) { setCart(existing => { const found = existing.find(i => i.variationId === product.variationId); if (found) return existing.map(i => i.variationId === product.variationId ? { ...i, quantity: i.quantity + 1 } : i); return [...existing, { ...product, quantity: 1 }]; }); }

  return <div className="site">
    <div className="shipping"><span>★</span> {c.shipping} <b>{c.shippingAmount}</b></div>
    <nav className="nav"><BrandLogo /><div className="menu">
      <a className={route === ROUTES.home ? 'active' : ''} onClick={() => goTo(ROUTES.home)}>HOME</a><a className={route === ROUTES.shop ? 'active' : ''} onClick={() => goTo(ROUTES.shop)}>SHOP</a><a className={route === ROUTES.newArrivals ? 'active' : ''} onClick={() => goTo(ROUTES.newArrivals)}>NEW ARRIVALS</a><a className={route === ROUTES.collections ? 'active' : ''} onClick={() => goTo(ROUTES.collections)}>COLLECTIONS</a><a className={route === ROUTES.about ? 'active' : ''} onClick={() => goTo(ROUTES.about)}>ABOUT</a><a className={route === ROUTES.contact ? 'active' : ''} onClick={() => goTo(ROUTES.contact)}>CONTACT</a>
    </div><div className="icons"><span>⌕</span><span>♙</span><button className="cart" data-count={cartCount} onClick={() => goTo(ROUTES.cart)}>CART 🛒</button></div></nav>

    {route === ROUTES.home && <>
      <section className="hero"><div className="hero-copy"><div className="eyebrow">{c.eyebrow}</div><h1>{c.headline1}<br/><span className="orange">{c.headline2}</span><br/>{c.headline3}<br/><span className="pink">{c.headline4}</span></h1><p>{c.subhead.split('\n').map((line, i) => <React.Fragment key={line}>{line}{i === 0 && <br/>}</React.Fragment>)}</p><button className="btn" onClick={() => goTo(ROUTES.newArrivals)}>SHOP NEW ARRIVALS&nbsp;&nbsp;›</button><div className="paint"></div></div><HeroCarousel currentHero={currentHero} /></section>
      <section className="features"><div className="feature"><div className="ico">☆</div><div><b>PREMIUM QUALITY</b><small>Made to last, built to enjoy</small></div></div><div className="feature"><div className="ico">♡</div><div><b>UNIQUE DESIGNS</b><small>Original art you won't find<br/>anywhere else</small></div></div><div className="feature"><div className="ico">▱</div><div><b>FAST SHIPPING</b><small>Quick delivery to your<br/>doorstep</small></div></div><div className="feature"><div className="ico">♢</div><div><b>SAFE & SECURE</b><small>Secure checkout, always</small></div></div></section>
      <section className="cats">{categories.slice(0, 4).map((cat) => <div className="cat" key={cat[0]}><img src={cat[1]} alt={cat[0]} /><div className="cat-content"><h3>{cat[0]}</h3><button onClick={() => goTo(ROUTES.collections)}>SHOP NOW</button></div></div>)}</section>
      <h2 className="section-title">FEATURED PRODUCTS</h2><ProductGrid products={products.slice(0, 12)} addToCart={addToCart} /><div className="center"><button className="btn outline" onClick={() => goTo(ROUTES.shop)}>VIEW ALL PRODUCTS&nbsp;&nbsp;›</button></div>
    </>}

    {route === ROUTES.shop && <><h2 className="section-title">SHOP ALL PRODUCTS</h2><ProductGrid products={products} addToCart={addToCart} /></>}
    {route === ROUTES.newArrivals && <><h2 className="section-title">NEW ARRIVALS</h2><ProductGrid products={(newArrivalProducts.length ? newArrivalProducts : products).slice(0, 12)} addToCart={addToCart} /></>}
    {route === ROUTES.collections && <section className="cats">{categories.map((cat) => <div className="cat" key={cat[0]}><img src={cat[1]} alt={cat[0]} /><div className="cat-content"><h3>{cat[0]}</h3><button onClick={() => goTo(ROUTES.shop)}>SHOP NOW</button></div></div>)}</section>}
    {route === ROUTES.about && <section className="newsletter"><div><h2>ABOUT US</h2><p>{c.footerText.replace(/\n/g, ' ')}</p></div></section>}
    {route === ROUTES.contact && <section className="newsletter"><div><h2>CONTACT</h2><p>Email us at {siteConfig.brand.email}</p></div></section>}
    {route === ROUTES.cart && <div className="checkout-modal" style={{margin:'30px auto'}}>{cart.length ? <><h2>Cart</h2>{cart.map((item) => <div className="checkout-row" key={item.variationId}><span>{item.name} × {item.quantity}</span><b>{money(item.amount * item.quantity)}</b></div>)}<div className="checkout-total"><span>Total</span><b>{money(total)}</b></div><button className="btn checkout-btn" onClick={() => setCheckoutOpen(true)}>CHECKOUT</button></> : <><h2>Cart</h2><p>Your cart is empty.</p><button className="btn" onClick={() => goTo(ROUTES.shop)}>CONTINUE SHOPPING</button></>}</div>}
    {route === ROUTES.success && <section className="newsletter"><div><h2>SUCCESS</h2><p>Your payment was successful.</p><button className="btn" onClick={() => goTo(ROUTES.home)}>RETURN HOME</button></div></section>}
    {route === ROUTES.cancel && <section className="newsletter"><div><h2>CANCELLED</h2><p>Your checkout was cancelled.</p><button className="btn" onClick={() => goTo(ROUTES.cart)}>RETURN TO CART</button></div></section>}

    <section className="newsletter"><div><h2>{c.newsletterTitle}</h2><p>{c.newsletterText.split('\n').map((line, i) => <React.Fragment key={line}>{line}{i === 0 && <br/>}</React.Fragment>)}</p></div><div><div className="signup"><input placeholder="Enter your email address"/><button>SIGN ME UP</button></div><div className="no-spam">✓ No spam. Unsubscribe anytime.</div></div></section>
    <footer className="footer"><div className="footer-grid"><div><div className="mini-logo">Created by CRUMP × <b>27<em>47</em></b> TEES</div><p>{c.footerText.split('\n').map((line) => <React.Fragment key={line}>{line}<br/></React.Fragment>)}</p></div><div><h4>SHOP</h4><ul><li onClick={() => goTo(ROUTES.shop)}>All Products</li><li onClick={() => goTo(ROUTES.newArrivals)}>New Arrivals</li><li onClick={() => goTo(ROUTES.collections)}>Graphic Tees</li><li onClick={() => goTo(ROUTES.collections)}>Hoodies</li><li onClick={() => goTo(ROUTES.collections)}>Accessories</li></ul></div><div><h4>HELP</h4><ul><li onClick={() => goTo(ROUTES.contact)}>FAQ</li><li onClick={() => goTo(ROUTES.contact)}>Shipping & Returns</li><li onClick={() => goTo(ROUTES.contact)}>Size Guide</li><li onClick={() => goTo(ROUTES.contact)}>Track Your Order</li><li onClick={() => goTo(ROUTES.contact)}>Contact Us</li></ul></div><div><h4>COMPANY</h4><ul><li onClick={() => goTo(ROUTES.about)}>About Us</li><li onClick={() => goTo(ROUTES.about)}>Our Story</li><li onClick={() => goTo(ROUTES.about)}>Careers</li><li onClick={() => goTo(ROUTES.about)}>Privacy Policy</li><li onClick={() => goTo(ROUTES.about)}>Terms of Service</li></ul></div><div><h4>CONNECT</h4><div className="social"><span>◎</span><span>♪</span><span>f</span><span>p</span></div><p>{siteConfig.brand.email}</p></div></div><div className="copyright">{c.copyright}</div></footer>

    <CheckoutModal open={checkoutOpen} cart={cart} onClose={() => setCheckoutOpen(false)} onClear={() => setCart([])} onSuccessRoute={() => goTo(ROUTES.success)} onCancelRoute={() => goTo(ROUTES.cancel)} />
  </div>;
}

function CheckoutModal({ open, cart, onClose, onClear, onSuccessRoute, onCancelRoute }) {
  const [status, setStatus] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [card, setCard] = useState(null);
  const [buyer, setBuyer] = useState({ givenName: '', familyName: '', emailAddress: '' });
  const total = cart.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  useEffect(() => { let mounted = true; async function initCard() { if (!open || !cart.length || siteConfig.fallbackMode) return; setStatus('Loading secure Square checkout…'); try { const cfg = await getPublicConfig(); const payments = window.Square.payments(cfg.applicationId, cfg.locationId); const cardInstance = await payments.card(); await cardInstance.attach('#card-container'); if (mounted) { setCard(cardInstance); setCardReady(true); setStatus(''); } } catch (err) { setStatus(err.message || 'Unable to load Square payment form.'); } } initCard(); return () => { mounted = false; if (card) card.destroy?.(); setCard(null); setCardReady(false); }; }, [open, cart.length]);
  async function payNow() { if (!card || !cart.length) return; setStatus('Processing payment…'); try { const result = await card.tokenize(); if (result.status !== 'OK') throw new Error(result.errors?.[0]?.message || 'Unable to tokenize card.'); await createPayment({ sourceId: result.token, cart, buyer }); setStatus('Payment complete. Thank you!'); onClear(); onSuccessRoute(); } catch (err) { setStatus(err.message || 'Payment failed.'); } }
  async function hostedCheckout() { setStatus('Creating secure Square checkout link…'); try { const data = await createHostedCheckout({ cart, buyer }); window.location.href = data.url; } catch (err) { setStatus(err.message || 'Unable to create checkout link.'); onCancelRoute(); } }
  if (!open) return null;
  return <div className="checkout-backdrop"><div className="checkout-modal"><button className="checkout-close" onClick={onClose}>×</button><h2>Checkout</h2>{cart.length === 0 ? <p>Your cart is empty.</p> : <><div className="checkout-items">{cart.map(item => <div className="checkout-row" key={item.variationId}><span>{item.name} × {item.quantity}</span><b>{money(item.amount * item.quantity)}</b></div>)}</div><div className="checkout-total"><span>Total</span><b>{money(total)}</b></div><div className="buyer-grid"><input placeholder="First name" value={buyer.givenName} onChange={e => setBuyer({...buyer, givenName: e.target.value})} /><input placeholder="Last name" value={buyer.familyName} onChange={e => setBuyer({...buyer, familyName: e.target.value})} /><input className="full" placeholder="Email" value={buyer.emailAddress} onChange={e => setBuyer({...buyer, emailAddress: e.target.value})} /></div>{!siteConfig.fallbackMode && <div id="card-container"></div>}<button className="btn checkout-btn" onClick={payNow} disabled={!cardReady || !cart.length}>PAY SECURELY</button><button className="checkout-link-btn" onClick={hostedCheckout}>Use Square hosted checkout instead</button>{siteConfig.fallbackMode && <p className="checkout-status">Connect Cloudflare Worker to enable checkout.</p>}{status && <p className="checkout-status">{status}</p>}</>}</div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
