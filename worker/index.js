const SQUARE_VERSION = '2026-04-16';

const CLIENTS = {
  // The key must match VITE_SITE_CLIENT_SLUG in the front end.
  '2747-tees': {
    displayName: '2747 Tees',
    // Use one Square category as this client's storefront space.
    // Put the Square CATEGORY object ID here after setup.
    categoryId: 'REPLACE_WITH_SQUARE_CATEGORY_ID',
    // Optional: set to true to include all visible products if category is not ready yet.
    allowAllCatalogItemsWhenCategoryMissing: true
  }

  // Example client space:
  // 'bsa-merch': {
  //   displayName: 'BSA Merch',
  //   categoryId: 'REPLACE_WITH_BSA_CATEGORY_ID',
  //   allowAllCatalogItemsWhenCategoryMissing: false
  // }
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
}

function json(data, status = 200, env = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(env),
      'Content-Type': 'application/json'
    }
  });
}

function getSquareBase(env) {
  return env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

async function squareFetch(env, path, options = {}) {
  const res = await fetch(`${getSquareBase(env)}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.errors?.[0]?.detail || data?.errors?.[0]?.code || `Square API error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function getClient(url) {
  const slug = url.searchParams.get('client') || '2747-tees';
  return { slug, config: CLIENTS[slug] || CLIENTS['2747-tees'] };
}

function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((amount || 0) / 100);
}

function extractImageUrl(item, imageMap) {
  const imageIds = item.item_data?.image_ids || [];
  const first = imageIds[0];
  return first && imageMap[first]?.image_data?.url ? imageMap[first].image_data.url : null;
}

async function loadCatalog(env, clientConfig) {
  const catalog = await squareFetch(env, '/v2/catalog/list?types=ITEM,CATEGORY,IMAGE');
  const objects = catalog.objects || [];
  const images = Object.fromEntries(objects.filter(o => o.type === 'IMAGE').map(o => [o.id, o]));
  const categories = objects
    .filter(o => o.type === 'CATEGORY')
    .map(o => ({ id: o.id, name: o.category_data?.name || 'Category' }));

  const categoryId = clientConfig.categoryId;
  const shouldFilter = categoryId && !categoryId.startsWith('REPLACE_');

  const items = objects.filter(o => {
    if (o.type !== 'ITEM') return false;
    if (!shouldFilter) return !!clientConfig.allowAllCatalogItemsWhenCategoryMissing;
    const cats = o.item_data?.categories || [];
    return cats.some(c => c.id === categoryId) || o.item_data?.category_id === categoryId;
  });

  const variationIds = [];
  const products = [];

  for (const item of items) {
    const image = extractImageUrl(item, images) || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80';
    const variations = item.item_data?.variations || [];
    for (const variation of variations) {
      const v = variation.item_variation_data;
      if (!v) continue;
      const priceMoney = v.price_money || { amount: 0, currency: 'USD' };
      variationIds.push(variation.id);
      products.push({
        id: item.id,
        variationId: variation.id,
        name: v.name && v.name !== 'Regular' ? `${item.item_data.name} - ${v.name}` : item.item_data.name,
        description: item.item_data.description || '',
        image,
        amount: priceMoney.amount,
        currency: priceMoney.currency || 'USD',
        price: formatMoney(priceMoney.amount, priceMoney.currency || 'USD'),
        stock: null
      });
    }
  }

  if (variationIds.length) {
    try {
      const inv = await squareFetch(env, '/v2/inventory/batch-retrieve-counts', {
        method: 'POST',
        body: JSON.stringify({
          catalog_object_ids: variationIds,
          location_ids: [env.SQUARE_LOCATION_ID],
          states: ['IN_STOCK']
        })
      });
      const counts = {};
      for (const count of inv.counts || []) {
        counts[count.catalog_object_id] = Number(count.quantity || 0);
      }
      for (const p of products) p.stock = counts[p.variationId] ?? null;
    } catch (e) {
      // Keep products visible even if inventory tracking is not enabled.
    }
  }

  return { categories, products };
}

function buildOrderLineItems(cart) {
  return cart.map(item => ({
    catalog_object_id: item.variationId,
    quantity: String(item.quantity || 1)
  }));
}

async function handlePayment(request, env) {
  const body = await request.json();
  const cart = Array.isArray(body.cart) ? body.cart : [];
  if (!body.sourceId) return json({ error: 'Missing payment source.' }, 400, env);
  if (!cart.length) return json({ error: 'Cart is empty.' }, 400, env);

  const orderResp = await squareFetch(env, '/v2/orders', {
    method: 'POST',
    body: JSON.stringify({
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items: buildOrderLineItems(cart),
        reference_id: `site-${Date.now()}`
      },
      idempotency_key: crypto.randomUUID()
    })
  });

  const order = orderResp.order;
  const amount = order?.total_money;
  if (!amount?.amount) return json({ error: 'Order total could not be calculated.' }, 400, env);

  const payment = await squareFetch(env, '/v2/payments', {
    method: 'POST',
    body: JSON.stringify({
      source_id: body.sourceId,
      idempotency_key: crypto.randomUUID(),
      amount_money: amount,
      order_id: order.id,
      location_id: env.SQUARE_LOCATION_ID,
      buyer_email_address: body.buyer?.emailAddress || undefined,
      autocomplete: true
    })
  });

  return json({ ok: true, orderId: order.id, paymentId: payment.payment?.id }, 200, env);
}

async function handleCheckoutLink(request, env) {
  const body = await request.json();
  const cart = Array.isArray(body.cart) ? body.cart : [];
  if (!cart.length) return json({ error: 'Cart is empty.' }, 400, env);

  const resp = await squareFetch(env, '/v2/online-checkout/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items: buildOrderLineItems(cart)
      },
      checkout_options: {
        redirect_url: env.CHECKOUT_REDIRECT_URL || undefined
      },
      pre_populated_data: {
        buyer_email: body.buyer?.emailAddress || undefined
      }
    })
  });

  return json({ url: resp.payment_link?.url }, 200, env);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) });

    const url = new URL(request.url);
    const { slug, config } = getClient(url);

    try {
      if (url.pathname === '/config') {
        return json({
          applicationId: env.SQUARE_APPLICATION_ID,
          locationId: env.SQUARE_LOCATION_ID,
          environment: env.SQUARE_ENVIRONMENT || 'sandbox',
          client: slug
        }, 200, env);
      }

      if (url.pathname === '/catalog') {
        const data = await loadCatalog(env, config);
        return json({ client: slug, ...data }, 200, env);
      }

      if (url.pathname === '/payment' && request.method === 'POST') {
        return handlePayment(request, env);
      }

      if (url.pathname === '/checkout-link' && request.method === 'POST') {
        return handleCheckoutLink(request, env);
      }

      return json({ error: 'Not found.' }, 404, env);
    } catch (err) {
      return json({ error: err.message || 'Server error.' }, 500, env);
    }
  }
};
