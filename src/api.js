import { siteConfig } from './config';

function apiUrl(path) {
  const base = siteConfig.workerBaseUrl.replace(/\/$/, '');
  return `${base}${path}`;
}

export async function getPublicConfig() {
  if (siteConfig.fallbackMode) return null;
  const res = await fetch(apiUrl(`/config?client=${encodeURIComponent(siteConfig.clientSlug)}`));
  if (!res.ok) throw new Error('Unable to load checkout configuration.');
  return res.json();
}

export async function getCatalog() {
  if (siteConfig.fallbackMode) return null;
  const res = await fetch(apiUrl(`/catalog?client=${encodeURIComponent(siteConfig.clientSlug)}`));
  if (!res.ok) throw new Error('Unable to load Square catalog.');
  return res.json();
}

export async function createPayment({ sourceId, cart, buyer }) {
  if (siteConfig.fallbackMode) throw new Error('Worker URL is not configured.');
  const res = await fetch(apiUrl('/payment'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: siteConfig.clientSlug,
      sourceId,
      cart,
      buyer
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Payment failed.');
  return data;
}

export async function createHostedCheckout({ cart, buyer }) {
  if (siteConfig.fallbackMode) throw new Error('Worker URL is not configured.');
  const res = await fetch(apiUrl('/checkout-link'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: siteConfig.clientSlug,
      cart,
      buyer
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Unable to create hosted checkout.');
  return data;
}
