import OpenAI from "openai";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors(), body: "" };
  if (event.httpMethod !== "POST")  return { statusCode: 405, headers: cors(), body: "Only POST" };

  try {
    const { messages = [], roomImageDataURL = null, textureUrl = "", hintQuad = null } = JSON.parse(event.body || "{}");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Missing OPENAI_API_KEY env var" }) };
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.MODEL || "gpt-4o-mini"; // default cheap vision
    const imageDetail = process.env.IMAGE_DETAIL || "high";

    const tools = [{
      type: "function",
      function: {
        name: "apply_floor_config",
        description: "Apply a detected floor polygon and tiling settings to the client's UI.",
        parameters: {
          type: "object",
          properties: {
            floorQuad: {
              description: "Four points normalized [0..1] in IMAGE coordinates, clockwise from top-left",
              type: "array", minItems: 4, maxItems: 4,
              items: { type: "object", properties: { x:{type:"number"}, y:{type:"number"} }, required:["x","y"] }
            },
            orientation: { type: "string", enum: ["horizontal","vertical"] },
            rotationDegrees: { type: "number" },
            scale: { type: "number" },
            randomness: { type: "number" },
            textureUrl: { type: "string" },
            exportImage: { type: "boolean" },
            notes: { type: "string" }
          },
          additionalProperties: false
        }
      }
    }];

    const parts = [];
    const lastText = (messages[messages.length - 1]?.content) || "Detect the floor polygon and suggest tiling params.";
    parts.push({ type: "text", text: lastText });
    if (roomImageDataURL) parts.push({ type: "image_url", image_url: { url: roomImageDataURL, detail: imageDetail } });
    if (textureUrl) parts.push({ type: "text", text: `Texture URL hint: ${textureUrl}` });

    const systemPrompt = `You are an AI floor configurator.
Return exactly ONE tool call (apply_floor_config). You MUST detect only the visible FLOOR region.

Rules:
- floorQuad: 4 points normalized [0..1] in IMAGE coordinates, clockwise from TOP-LEFT.
- The top edge should align with the baseboard/wall junction (do not include walls).
- Do NOT return the trivial full-image box [ (0,0),(1,0),(1,1),(0,1) ].
- Prefer y_top in the 0.25..0.75 range unless the camera is extremely low.
- If hintQuad is provided, refine it precisely to the true floor; keep corners on floor boundaries.
- Include orientation ('horizontal' if boards run left-right in the image, 'vertical' otherwise), and an initial rotationDegrees/scale guess.
Only respond with the tool call.`;

    const msgList = [
      { role: "system", content: systemPrompt },
      { role: "user", content: parts }
    ];
    if (hintQuad) {
      msgList.push({ role: "user", content: [{ type: "text", text: "Hint quad (normalized canvas space, same image as above): " + JSON.stringify(hintQuad) }] });
    }

    const chat = await client.chat.completions.create({
      model,
      messages: msgList,
      tools,
      tool_choice: { type: "function", function: { name: "apply_floor_config" } },
      temperature: 0.2
    });

    const m = chat.choices?.[0]?.message;
    const actions = [];
    for (const t of (m?.tool_calls || [])) {
      if (t.type === "function" && t.function?.name === "apply_floor_config") {
        let args = {}; try { args = JSON.parse(t.function.arguments || "{}"); } catch(_){}
        actions.push({ name: t.function.name, arguments: args });
      }
    }

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ text: m?.content || "", actions }) };

  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown server error";

    // parse hours/mins/secs like "in 6h0m43.2s"
    let retry = 0;
    try {
      const H = /in\s*(\d+)h/i.exec(message); if (H) retry += parseInt(H[1],10)*3600;
      const M = /in\s*(\d+)m/i.exec(message); if (M) retry += parseInt(M[1],10)*60;
      const S = /in\s*(\d+(?:\.\d+)?)s/i.exec(message); if (S) retry += Math.ceil(parseFloat(S[1]));
      if (!retry && status===429) retry = 300;
    } catch (_) {}

    return { statusCode: status, headers: cors(), body: JSON.stringify({ error: message, status, retryAfterSeconds: retry }) };
  }
};

function cors(){ return {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};}
