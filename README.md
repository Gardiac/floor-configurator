# AI Floor Configurator — v4

Ready to deploy on **Netlify (Free)**.

## Deploy
1) Put these files at the repo root:
   - `index.html`
   - `netlify.toml`
   - `package.json`
   - `netlify/functions/floor-chat.mjs`
2) In Netlify → **Site settings → Environment variables** add `OPENAI_API_KEY`.
3) **Deploys → Trigger deploy → Clear cache and deploy site**.
4) Open your `.netlify.app` URL → upload a room photo + plank texture → click **Detect & Replace (AI)**.

## Notes
- Keep your key in env vars; never in the browser.
- If texture URLs fail (CORS), upload the texture as a local file.
