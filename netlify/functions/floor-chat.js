import OpenAI from "openai";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors(), body: "" };
  if (event.httpMethod !== "POST")  return { statusCode: 405, headers: cors(), body: "Only POST" };

  try {
    const { messages = [], roomImageDataURL = null, textureUrl = "" } = JSON.parse(event.body || "{}");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Missing OPENAI_API_KEY env var" }) };
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.MODEL || "gpt-4o-mini"; // cheaper default

    const tools = [{
      type: "function",
      function: {
        name: "apply_floor_config",
        description: "Apply a detected floor polygon and tiling settings to the client's UI.",
        parameters: {
          type: "object",
          properties: {
            floorQuad: {
              description: "Four points normalized [0..1], clockwise from top-left",
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

    const userParts = [];
    if (roomImageDataURL) userParts.push({ type: "input_image", image_url: roomImageDataURL });
    const last = (messages[messages.length - 1]?.content) || "Detect the floor polygon and suggested tiling params.";
    userParts.push({ type: "input_text", text: last });
    if (textureUrl) userParts.push({ type: "input_text", text: `Texture URL hint: ${textureUrl}` });

    const chat = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content:
`You are an AI floor configurator. Respond with ONE tool call (apply_floor_config) including:
- floorQuad: 4 points normalized [0..1], clockwise from top-left (floor only).
- orientation, rotationDegrees, scale, randomness, optional textureUrl.` },
        { role: "user", content: userParts }
      ],
      tools, tool_choice: "auto", temperature: 0.2
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
    return { statusCode: status, headers: cors(), body: JSON.stringify({ error: message, status }) };
  }
};

function cors(){ return {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};}
