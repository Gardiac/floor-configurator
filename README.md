# AI Floor Configurator — v4 (hinted + guard)
- Sends a coarse on-device hintQuad to steer the model.
- Server forces a single tool call and asks the model NOT to return the trivial full-image box.
- Client validates the quad; if it's bad, it keeps the refined fallback instead.
- Auto-Fit: rotation + scale set automatically.
- Persistent cooldown for rate limits; 512px image cap.

Deploy on Netlify and set `OPENAI_API_KEY` (and optional `MODEL`, `IMAGE_DETAIL`).