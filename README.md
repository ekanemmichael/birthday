# Birthday Card

Birthday card site with shared Cloudflare storage, photo uploads, notes, and a view-only shared card link.

## Open Locally

Open `index.html` in a browser.

## Deploy To Cloudflare Pages

This project has no build step. Deploy the project folder to Cloudflare Pages with Git integration or Wrangler so the `functions` folder is included.

## Cloudflare Storage

To keep wishes after refresh and across different devices, create a Cloudflare KV namespace and bind it to the Pages project.

1. In Cloudflare, create a KV namespace.
2. Open your Pages project settings.
3. Go to Functions > KV namespace bindings.
4. Add a binding with the variable name `BIRTHDAY_KV`.
5. Select the KV namespace you created and redeploy the site.

### GitHub Integration

1. Push this repo to GitHub.
2. In Cloudflare, create a Pages project from the GitHub repo.
3. Leave the build command empty.
4. Leave the build output directory empty or set it to `/`.
5. Add the `BIRTHDAY_KV` binding and redeploy.

### Wrangler

```sh
npx wrangler pages deploy .
```

## Sharing

Use the public Cloudflare URL to gather wishes from everyone. After the wishes are ready, click `Copy Card Link`. That copied link opens a recipient-only view with just the birthday wall.
