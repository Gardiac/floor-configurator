# AI Floor Configurator — v4 (vision fix)

**Fixes**: 400 Invalid value 'input_image' → uses `image_url` parts per Chat Completions multimodal spec.

- Front-end: same as quota-safe build (2D fallback + POT textures + auto fallback on 429).
- Functions: `floor-chat.js` now sends messages with content parts:
  - `{ type: "text", text: "..." }`
  - `{ type: "image_url", image_url: { url: <dataURL> } }`

## Deploy
1) Replace files at repo root.
2) Netlify → Env vars: `OPENAI_API_KEY` (and optionally `MODEL=gpt-4o-mini`).
3) Deploys → Clear cache and deploy.
