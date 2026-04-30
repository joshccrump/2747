# 2747 Tees + Square + GitHub Pages Starter

This package gives you:

- React/Vite storefront for GitHub Pages
- Cloudflare Worker backend
- Square as the control panel for products, categories, inventory, and payments
- Square Web Payments SDK checkout on your site
- Square hosted checkout fallback
- Client/store spaces powered by Square categories

The visual storefront is based on the saved **Ground Zero** design. The front page layout is intentionally preserved.

---

## How the system works

```txt
Square Item Library
  -> Square Category for each client/store space
  -> Cloudflare Worker securely reads Square catalog + inventory
  -> GitHub Pages React site displays products
  -> Customer adds item to cart
  -> Square Web Payments SDK creates a secure card token
  -> Cloudflare Worker charges through Square Payments API
```

Do not put your Square access token in the front-end React app. It belongs only in Cloudflare Worker secrets.

---

## Folder map

```txt
/
├─ src/
│  ├─ main.jsx          # React storefront + cart + checkout modal
│  ├─ styles.css        # Ground Zero visual styling + checkout modal
│  ├─ config.js         # Safe front-end text/logo/client settings
│  └─ api.js            # Calls the Cloudflare Worker
├─ worker/
│  ├─ index.js          # Cloudflare Worker Square backend
│  ├─ wrangler.toml     # Worker config
│  └─ .dev.vars.example # Local Worker secret examples
├─ .github/workflows/
│  └─ deploy-pages.yml  # GitHub Pages deployment workflow
├─ index.html
├─ vite.config.js
├─ package.json
└─ .env.example
```

---

## Step 1 — Create your Square app

1. Go to the Square Developer Dashboard.
2. Create a new app.
3. Start in **Sandbox** first.
4. Copy these values:
   - Application ID
   - Access Token
   - Location ID

You will use:

```txt
SQUARE_APPLICATION_ID
SQUARE_ACCESS_TOKEN
SQUARE_LOCATION_ID
SQUARE_ENVIRONMENT
```

For sandbox, use:

```txt
SQUARE_ENVIRONMENT=sandbox
```

For live production later, use:

```txt
SQUARE_ENVIRONMENT=production
```

---

## Step 2 — Create Square categories for client spaces

In Square Dashboard:

1. Go to **Items & Orders**.
2. Go to **Items**.
3. Create categories like:
   - `2747 Tees`
   - `BSA Merch`
   - `Church Store`
   - `Client A`
4. Assign items to the correct category.
5. Add images, prices, variations, and inventory in Square.

This site treats those categories like separate storefront spaces.

---

## Step 3 — Find the Square category ID

The Worker needs the Square category object ID.

Simplest way:

1. Deploy the Worker temporarily with `allowAllCatalogItemsWhenCategoryMissing: true`.
2. Open this Worker URL:

```txt
https://YOUR-WORKER.workers.dev/catalog?client=2747-tees
```

3. The response includes category IDs.
4. Copy the category ID for `2747 Tees`.
5. Open:

```txt
worker/index.js
```

6. Replace:

```js
categoryId: 'REPLACE_WITH_SQUARE_CATEGORY_ID'
```

with your real category ID.

Example:

```js
categoryId: 'ABCD1234CATEGORYID'
```

To add another client/store space:

```js
'bsa-merch': {
  displayName: 'BSA Merch',
  categoryId: 'BSA_CATEGORY_ID_HERE',
  allowAllCatalogItemsWhenCategoryMissing: false
}
```

Then set the front-end client slug to:

```txt
VITE_SITE_CLIENT_SLUG=bsa-merch
```

---

## Step 4 — Set up the Cloudflare Worker

Install Wrangler:

```bash
npm install -g wrangler
```

Log into Cloudflare:

```bash
wrangler login
```

Go into the Worker folder:

```bash
cd worker
```

Create the Worker secrets:

```bash
wrangler secret put SQUARE_ACCESS_TOKEN
wrangler secret put SQUARE_APPLICATION_ID
wrangler secret put SQUARE_LOCATION_ID
```

When prompted, paste each value from Square.

Edit:

```txt
worker/wrangler.toml
```

For sandbox testing:

```toml
[vars]
SQUARE_ENVIRONMENT = "sandbox"
ALLOWED_ORIGIN = "*"
CHECKOUT_REDIRECT_URL = "https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/success"
```

For production later:

```toml
SQUARE_ENVIRONMENT = "production"
```

Deploy the Worker:

```bash
wrangler deploy
```

Copy the deployed Worker URL. It will look like:

```txt
https://square-site-backend.YOURNAME.workers.dev
```

Test it:

```txt
https://square-site-backend.YOURNAME.workers.dev/config?client=2747-tees
```

Then test catalog:

```txt
https://square-site-backend.YOURNAME.workers.dev/catalog?client=2747-tees
```

---

## Step 5 — Set up GitHub repo

Create a new GitHub repository.

On your computer:

```bash
git init
git add .
git commit -m "Initial Square storefront"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## Step 6 — Add GitHub Pages settings

In GitHub:

1. Open your repository.
2. Go to **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**, set source to **GitHub Actions**.

The included workflow will build and publish the site.

---

## Step 7 — Add GitHub Actions variables/secrets

In GitHub:

1. Go to **Settings**.
2. Go to **Secrets and variables**.
3. Go to **Actions**.

Add this **Repository secret**:

```txt
VITE_WORKER_BASE_URL=https://square-site-backend.YOURNAME.workers.dev
```

Add this **Repository variable**:

```txt
VITE_SITE_CLIENT_SLUG=2747-tees
```

Push any commit to trigger deployment:

```bash
git commit --allow-empty -m "Trigger Pages deploy"
git push
```

---

## Step 8 — Update front-end logo/text later

Open:

```txt
src/config.js
```

Update safe front-end text here:

```js
brand: {
  createdBy: 'Created by',
  creatorName: 'CRUMP',
  shopNumberA: '27',
  shopNumberB: '47',
  shopLabel: 'TEES',
  email: 'hello@createdbycrump.com'
}
```

Update hero/footer/newsletter copy here:

```js
copy: {
  shipping: 'FREE SHIPPING ON ORDERS OVER',
  shippingAmount: '$75',
  eyebrow: 'BOLD DESIGNS. REAL EXPRESSION.',
  headline1: 'Wear Your',
  headline2: 'Energy.',
  headline3: 'Live Your',
  headline4: 'Vision.'
}
```

Do not edit `src/styles.css` if you want the front end to stay Ground Zero.

---

## Step 9 — Add products later

Use Square as the control panel:

1. Add item in Square.
2. Add item image.
3. Add price and variations.
4. Assign item to the right category.
5. Turn on inventory tracking if needed.
6. Refresh the site.

No code change needed for normal product updates.

---

## Step 10 — Inventory updates

Update inventory directly in Square.

The Worker reads inventory counts with Square Inventory API. If an item has inventory tracking enabled, the storefront can show stock.

Orders paid through Square using catalog variation IDs are tied to Square orders/payments.

---

## Step 11 — Move from sandbox to live

When sandbox works:

1. In Square Developer Dashboard, switch to Production.
2. Copy production:
   - Application ID
   - Access Token
   - Location ID
3. In Cloudflare Worker:

```bash
cd worker
wrangler secret put SQUARE_ACCESS_TOKEN
wrangler secret put SQUARE_APPLICATION_ID
wrangler secret put SQUARE_LOCATION_ID
```

4. Change `worker/wrangler.toml`:

```toml
SQUARE_ENVIRONMENT = "production"
```

5. In `index.html`, replace the sandbox SDK URL:

```html
https://sandbox.web.squarecdn.com/v1/square.js
```

with production:

```html
https://web.squarecdn.com/v1/square.js
```

6. Redeploy Worker and GitHub Pages.

```bash
cd worker
wrangler deploy
cd ..
git add .
git commit -m "Switch Square checkout to production"
git push
```

---

## Local testing

Install dependencies:

```bash
npm install
```

Create local front-end env:

```bash
cp .env.example .env
```

Set:

```txt
VITE_WORKER_BASE_URL=http://localhost:8787
VITE_SITE_CLIENT_SLUG=2747-tees
```

Create local Worker secrets:

```bash
cd worker
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`, then run:

```bash
npx wrangler dev
```

In another terminal:

```bash
npm run dev
```

Open:

```txt
http://localhost:5173
```

---

## Important notes

- Front-end secrets are never safe. Only public values go in `.env`.
- Square access token must stay in Cloudflare Worker secrets.
- Use sandbox before production.
- For multiple client spaces, use Square categories first.
- Use Square locations later only when you need separate reporting, bank deposits, inventory, or receipts by client.

