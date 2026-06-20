# Birthday Card

Birthday card site where a handler creates a dedicated wall, shares a wish link with friends, and shares a view-only birthday wall with the recipient.

## Open Locally

Open `index.html` in a browser.

## Deploy To Cloudflare Pages

This project has no build step. Deploy the project folder to Cloudflare Pages with Git integration or Wrangler so the `functions` folder is included.

## How It Works

1. Open the site and create a wall for the birthday person.
2. Copy the wish link and send it to friends/family.
3. Copy the birthday view link and send it to the birthday person when ready.
4. Keep the handler link private; it can update the birthday name, reset wishes, and copy all links again.

## Cloudflare Storage

To keep each wall after refresh and across different devices, create a Cloudflare KV namespace and bind it to the Pages project.

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

Use the generated wish link to gather wishes from everyone. When the wall is ready, share the birthday view link so the recipient only sees the finished wall.
