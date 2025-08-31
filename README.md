# AI Floor Configurator — v4 (quota-safe)

- Front-end: WebGL overlay with 2D fallback, NPOT texture fix, AI fallback to basic detector on 429/401.
- Functions: `floor-chat.js` bubbles real HTTP status, defaults to `gpt-4o-mini` to lower cost.

## Deploy
1) Put files at repo root (see tree).  
2) Netlify → Site settings → Environment variables:
   - `OPENAI_API_KEY` = your key
   - (optional) `MODEL` = `gpt-4o` or `gpt-4o-mini`
3) Deploys → Clear cache and deploy.

## Test
- Visit `/.netlify/functions/hello` → JSON ok.
- Self-test → demo shows. Upload texture → tiles. Upload room → AI detect (or auto-detect fallback if quota).
