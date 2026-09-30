# Skycast proxy

```bash
cd worker
npx wrangler login
npx wrangler secret put OPENWEATHER_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```
`wrangler deploy` prints the Worker address (https://skycast-proxy.<your-subdomain>.workers.dev). Put it in `../js/config.js`.
To allow another website or a local port, edit `ALLOWED_ORIGINS` in `wrangler.toml` and deploy again.
