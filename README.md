# AI Floor Configurator — v4 (Netlify)

Includes:
- `index.html` (robust preview, debug panel, self-test)
- `netlify/functions/hello.js` (test function)
- `netlify/functions/floor-chat.js` (OpenAI gpt-4o + tools + image input)
- `netlify.toml`, `package.json`

## Deploy
1) Place all files at repo root.
2) Netlify → Site settings → Environment variables → add `OPENAI_API_KEY`.
3) Deploy → Trigger deploy → Clear cache and deploy site.
4) Test `/.netlify/functions/hello` then use the app.
