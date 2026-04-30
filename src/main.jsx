import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { siteConfig } from './config';
import { createHostedCheckout, createPayment, getCatalog, getPublicConfig } from './api';
import './styles.css';

const fallbackProducts = [
  { id: 'seed-1', variationId: 'seed-1-var', name: 'Paint Splash Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80' },
  { id: 'seed-2', variationId: 'seed-2-var', name: 'Create Your Reality Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=500&q=80' },
  { id: 'seed-3', variationId: 'seed-3-var', name: 'Hummingbird Hoodie', price: '$54.99', amount: 5499, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=500&q=80' },
  { id: 'seed-4', variationId: 'seed-4-var', name: 'Vibrant Hummingbird Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=500&q=80' },
  { id: 'seed-5', variationId: 'seed-5-var', name: 'Drip Logo Tee', price: '$29.99', amount: 2999, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=500&q=80' },
  { id: 'seed-6', variationId: 'seed-6-var', name: '2747 Drip Hoodie', price: '$54.99', amount: 5499, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=500&q=80' },
];

const fallbackCategories = [
  ['NEW ARRIVALS', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'],
  ['GRAPHIC TEES', 'https://images.unsplash.com/photo-1506629905607-d9e297d2d223?auto=format&fit=crop&w=700&q=80'],
  ['SWEATSHIRTS', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80'],
  ['ACCESSORIES', 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=700&q=80'],
];

function money(amount = 0) {
  return `$${(amount / 100).toFixed(2)}`;
}

function BrandLogo() {
  const b = siteConfig.brand;
  return (
    <div className="logo">
      <div className="logo-left">{b.createdBy}<span>{b.creatorName}</span></div>
      <div className="bird">🪽</div>
      <div className="x">×</div>
      <div className="logo-main">{b.shopNumberA}<em>{b.shopNumberB}</em><small>{b.shopLabel}</small></div>
    </div>
  );
}

function CheckoutModal({ open, cart, onClose, onClear }) {
  const [status, setStatus] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [card, setCard] = useState(null);
  const [buyer, setBuyer] = useState({ givenName: '', familyName: '', emailAddress: '' });

  const total = cart.reduce((sum, item) => sum + item.amount * item.quantity, 0);

  useEffect(() => {
    let mounted = true;
    async function initCard() {
      if (!open || !cart.length || siteConfig.fallbackMode) return;
      setStatus('Loading secure Square checkout…');
      try {
        const cfg = await getPublicConfig();
        const payments = window.Square.payments(cfg.applicationId, cfg.locationId);
        const cardInstance = await payments.card();
        await cardInstance.attach('#card-container');
        if (mounted) {
          setCard(cardInstance);
          setCardReady(true);
          setStatus('');
        }
      } catch (err) {
        setStatus(err.message || 'Unable to load Square payment form.');
      }
    }
    initCard();
    return () => {
      mounted = false;
      if (card) card.destroy?.();
      setCard(null);
      setCardReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cart.length]);

  async function payNow() {
    if (!card || !cart.length) return;
    setStatus('Processing payment…');
    try {
      const result = await card.tokenize();
      if (result.status !== 'OK') throw new Error(result.errors?.[0]?.message || 'Unable to tokenize card.');
      await createPayment({ sourceId: result.token, cart, buyer });
      setStatus('Payment complete. Thank you!');
      onClear();
    } catch (err) {
      setStatus(err.message || 'Payment failed.');
    }
  }

  async function hostedCheckout() {
    setStatus('Creating secure Square checkout link…');
    try {
      const data = await createHostedCheckout({ cart, buyer });
      window.location.href = data.url;
    } catch (err) {
      setStatus(err.message || 'Unable to create checkout link.');
    }
  }

  if (!open) return null;

  return (
    <div className="checkout-backdrop">
      <div className="checkout-modal">
        <button className="checkout-close" onClick={onClose}>×</button>
        <h2>Checkout</h2>
        {cart.length === 0 ? <p>Your cart is empty.</p> : (
          <>
            <div className="checkout-items">
              {cart.map(item => (
                <div className="checkout-row" key={item.variationId}>
                  <span>{item.name} × {item.quantity}</span>
                  <b>{money(item.amount * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="checkout-total"><span>Total</span><b>{money(total)}</b></div>
            <div className="buyer-grid">
              <input placeholder="First name" value={buyer.givenName} onChange={e => setBuyer({...buyer, givenName: e.target.value})} />
              <input placeholder="Last name" value={buyer.familyName} onChange={e => setBuyer({...buyer, familyName: e.target.value})} />
              <input className="full" placeholder="Email" value={buyer.emailAddress} onChange={e => setBuyer({...buyer, emailAddress: e.target.value})} />
            </div>
            {!siteConfig.fallbackMode && <div id="card-container"></div>}
            <button className="btn checkout-btn" onClick={payNow} disabled={!cardReady || !cart.length}>PAY SECURELY</button>
            <button className="checkout-link-btn" onClick={hostedCheckout}>Use Square hosted checkout instead</button>
            {siteConfig.fallbackMode && <p className="checkout-status">Connect Cloudflare Worker to enable checkout.</p>}
            {status && <p className="checkout-status">{status}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [catalogProducts, setCatalogProducts] = useState(null);
  const [catalogCategories, setCatalogCategories] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const c = siteConfig.copy;

  useEffect(() => {
    async function load() {
      try {
        const catalog = await getCatalog();
        if (catalog?.products?.length) setCatalogProducts(catalog.products);
        if (catalog?.categories?.length) setCatalogCategories(catalog.categories.map(cat => [cat.name, cat.image || fallbackCategories[0][1]]));
      } catch (err) {
        console.warn('Using fallback catalog:', err.message);
      }
    }
    load();
  }, []);

  const products = catalogProducts || fallbackProducts;
  const categories = catalogCategories || fallbackCategories;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product) {
    setCart(existing => {
      const found = existing.find(i => i.variationId === product.variationId);
      if (found) return existing.map(i => i.variationId === product.variationId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...existing, { ...product, quantity: 1 }];
    });
  }

  return (
    <div className="site">
      <div className="shipping"><span>★</span> {c.shipping} <b>{c.shippingAmount}</b></div>

      <nav className="nav">
        <BrandLogo />
        <div className="menu">
          <a className="active">HOME</a><a>SHOP</a><a>NEW ARRIVALS</a><a>COLLECTIONS</a><a>ABOUT</a><a>CONTACT</a>
        </div>
        <div className="icons"><span>⌕</span><span>♙</span><button className="cart" data-count={cartCount} onClick={() => setCheckoutOpen(true)}>CART 🛒</button></div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">{c.eyebrow}</div>
          <h1>{c.headline1}<br/><span className="orange">{c.headline2}</span><br/>{c.headline3}<br/><span className="pink">{c.headline4}</span></h1>
          <p>{c.subhead.split('\n').map((line, i) => <React.Fragment key={line}>{line}{i === 0 && <br/>}</React.Fragment>)}</p>
          <button className="btn">SHOP NEW ARRIVALS&nbsp;&nbsp;›</button>
          <div className="paint"></div>
        </div>
        <div className="hero-img"></div>
      </section>

      <section className="features">
        <div className="feature"><div className="ico">☆</div><div><b>PREMIUM QUALITY</b><small>Made to last, built to enjoy</small></div></div>
        <div className="feature"><div className="ico">♡</div><div><b>UNIQUE DESIGNS</b><small>Original art you won't find<br/>anywhere else</small></div></div>
        <div className="feature"><div className="ico">▱</div><div><b>FAST SHIPPING</b><small>Quick delivery to your<br/>doorstep</small></div></div>
        <div className="feature"><div className="ico">♢</div><div><b>SAFE & SECURE</b><small>Secure checkout, always</small></div></div>
      </section>

      <section className="cats">
        {categories.slice(0, 4).map((cat) => <div className="cat" key={cat[0]}><img src={cat[1]} /><div className="cat-content"><h3>{cat[0]}</h3><button>SHOP NOW</button></div></div>)}
      </section>

      <h2 className="section-title">FEATURED PRODUCTS</h2>
      <section className="products">
        {products.slice(0, 12).map((p) => <div className="prod" key={p.variationId || p.id}><div className="badge">NEW</div><button className="prod-img" onClick={() => addToCart(p)}><img src={p.image} alt={p.name} /></button><h4>{p.name}</h4><div className="price">{p.price}</div>{typeof p.stock === 'number' && <small className="stock">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</small>}<button className="add-btn" onClick={() => addToCart(p)} disabled={p.stock === 0}>ADD TO CART</button></div>)}
      </section>
      <div className="center"><button className="btn outline">VIEW ALL PRODUCTS&nbsp;&nbsp;›</button></div>

      <section className="newsletter">
        <div><h2>{c.newsletterTitle}</h2><p>{c.newsletterText.split('\n').map((line, i) => <React.Fragment key={line}>{line}{i === 0 && <br/>}</React.Fragment>)}</p></div>
        <div><div className="signup"><input placeholder="Enter your email address"/><button>SIGN ME UP</button></div><div className="no-spam">✓ No spam. Unsubscribe anytime.</div></div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <div><div className="mini-logo">Created by CRUMP × <b>27<em>47</em></b> TEES</div><p>{c.footerText.split('\n').map((line, i) => <React.Fragment key={line}>{line}<br/></React.Fragment>)}</p></div>
          <div><h4>SHOP</h4><ul><li>All Products</li><li>New Arrivals</li><li>Graphic Tees</li><li>Hoodies</li><li>Accessories</li></ul></div>
          <div><h4>HELP</h4><ul><li>FAQ</li><li>Shipping & Returns</li><li>Size Guide</li><li>Track Your Order</li><li>Contact Us</li></ul></div>
          <div><h4>COMPANY</h4><ul><li>About Us</li><li>Our Story</li><li>Careers</li><li>Privacy Policy</li><li>Terms of Service</li></ul></div>
          <div><h4>CONNECT</h4><div className="social"><span>◎</span><span>♪</span><span>f</span><span>p</span></div><p>{siteConfig.brand.email}</p></div>
        </div>
        <div className="copyright">{c.copyright}</div>
      </footer>

      <CheckoutModal open={checkoutOpen} cart={cart} onClose={() => setCheckoutOpen(false)} onClear={() => setCart([])} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
