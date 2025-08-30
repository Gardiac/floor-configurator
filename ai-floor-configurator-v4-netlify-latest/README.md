# AI Floor Configurator — v4 (Netlify)

This is ready to deploy on **Netlify (Free)** — AI vision lives in a serverless function.

## Deploy
1) Create a GitHub repo and upload this whole folder.  
2) On https://app.netlify.com → **New site from Git** → pick your repo.  
3) In **Site settings → Environment variables**, add:  
   - `OPENAI_API_KEY` = your key  
   - (optional) `MODEL` = `gpt-4o`  
4) Deploy. The frontend already points to `/.netlify/functions/floor-chat`.

## Use
- Open the site → upload room photo + plank texture (or paste a texture URL) → click **Detect & Replace (AI)**.  
- Drag the 4 corners if needed. Adjust scale/rotation/orientation/variation/light, then **Download PNG**.

## Local quick test (no server)
Open `index.html` directly in Chrome to test UI + basic auto-detect. AI button needs the Netlify function.
