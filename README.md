# Birthday Card

Static birthday card site with local editing and a view-only shared card link.

## Open Locally

Open `index.html` in a browser.

## Deploy To Cloudflare Pages

This project has no build step. Deploy the project folder as static assets.

### Dashboard Upload

1. Go to Cloudflare Dashboard > Workers & Pages.
2. Choose Create application > Pages > Upload assets.
3. Upload this folder, or a zip containing `index.html`, `styles.css`, and `app.js`.
4. Deploy the site and use the generated `*.pages.dev` URL.

### Wrangler

```sh
npx wrangler pages deploy .
```

## Sharing

Use the public Cloudflare URL to gather wishes on one browser. After the wishes are ready, click `Copy Card Link`. That copied link opens a recipient-only view with just the birthday wall.

For live uploads from many people's devices into the same wall, this needs a shared backend such as Cloudflare D1/R2 or Supabase.
