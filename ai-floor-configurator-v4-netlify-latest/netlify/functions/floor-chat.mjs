import OpenAI from "openai";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Only POST" };
  }
  try {
    const { messages = [], roomImageDataURL = null, textureUrl = "" } = JSON.parse(event.body || "{}");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const tools = [{
      type: "function",
      name: "apply_floor_config",
      parameters: {
        type: "object",
        properties: {
          floorQuad: {
            description: "Four corners normalized [0..1], clockwise from top-left",
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              properties: { x: { type: "number" }, y: { type: "number" } },
              required: ["x", "y"]
            }
          },
          orientation: { type: "string", enum: ["horizontal", "vertical"] },
          rotationDegrees: { type: "number" },
          scale: { type: "number" },
          randomness: { type: "number" },
          textureUrl: { type: "string" },
          exportImage: { type: "boolean" },
          notes: { type: "string" }
        },
        additionalProperties: false
      }
    }];

    const system = {
      role: "system",
      content:
`You are an AI floor configurator. Detect the floor in the user's photo and respond with ONE tool call (apply_floor_config).
Return: floorQuad (4 points, normalized [0..1], clockwise from top-left), plus orientation/rotation/scale/randomness and optional textureUrl.
Prefer a conservative quad that excludes rugs and furniture. If unclear, pick your best guess and include a short 'notes'.`
    };

    const content = [];
    if (roomImageDataURL) {
      content.push({ type: "input_image", image_url: roomImageDataURL, resize: "fit" });
    }
    const last = (messages[messages.length - 1] && messages[messages.length - 1].content) || "Detect and replace the floor.";
    content.push({ type: "text", text: `User: ${last}` });
    if (textureUrl) content.push({ type: "text", text: `Texture URL hint: ${textureUrl}` });

    const r = await client.responses.create({
      model: process.env.MODEL || "gpt-4o",
      input: [ system, { role: "user", content } ],
      tools
    });

    const actions = [];
    if (Array.isArray(r.output)) {
      for (const item of r.output) {
        if (item.type === "tool_call" && item.name === "apply_floor_config") {
          actions.push({ name: item.name, arguments: item.arguments || {} });
        }
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ text: r.output_text || "", actions })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: String(e && e.message || e) })
    };
  }
};

function corsHeaders(){
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}
