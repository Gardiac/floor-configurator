import OpenAI from "openai";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS(), body: "" };
  if (event.httpMethod !== "POST")  return { statusCode: 405, headers: CORS(), body: "Only POST" };
  try{
    const { messages=[], roomImageDataURL=null, textureUrl="", hintQuad=null } = JSON.parse(event.body||"{}");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.MODEL || "gpt-4o-mini";
    const system = `You are an AI floor configurator. Return ONE tool call (apply_floor_config). Detect ONLY the visible floor.
- floorQuad: 4 points normalized [0..1] in IMAGE space, clockwise from TOP-LEFT.
- Top edge near baseboard; do NOT include walls.
- Do NOT return the full image box (0,0)-(1,1).
- If hintQuad is provided, refine it precisely to the true floor.`;

    const tools = [{
      type: "function",
      function: {
        name: "apply_floor_config",
        description: "Send a floor quad and tiling settings to the UI.",
        parameters: {
          type: "object",
          properties: {
            floorQuad: { type: "array", minItems:4, maxItems:4, items:{ type:"object", properties:{x:{type:"number"},y:{type:"number"}}, required:["x","y"] } },
            rotationDegrees: { type: "number" },
            scale: { type: "number" },
            orientation: { type: "string", enum: ["horizontal","vertical"] },
            textureUrl: { type: "string" }
          },
          additionalProperties: false
        }
      }
    }];

    const parts = [{ type:"text", text: messages[messages.length-1]?.content || "Detect the floor polygon" }];
    if (roomImageDataURL) parts.push({ type:"image_url", image_url:{ url: roomImageDataURL, detail: "high" }});
    if (textureUrl) parts.push({ type:"text", text:`Texture hint: ${textureUrl}` });

    const chat = await client.chat.completions.create({
      model, temperature:0.2,
      messages:[ {role:"system",content:system}, {role:"user",content:parts}, ...(hintQuad?[{role:"user",content:[{type:"text",text:"Hint quad: "+JSON.stringify(hintQuad)}]}]:[]) ],
      tools,
      tool_choice:{ type:"function", function:{ name:"apply_floor_config" } }
    });

    const m=chat.choices?.[0]?.message||{};
    const actions=[];
    for (const t of (m.tool_calls||[])){
      if (t.type==="function" && t.function?.name==="apply_floor_config"){
        let args={}; try{ args=JSON.parse(t.function.arguments||"{}"); }catch(_){}
        actions.push({ name:t.function.name, arguments: args });
      }
    }
    return { statusCode:200, headers:CORS(), body: JSON.stringify({ actions }) };
  }catch(err){
    const status = err?.status || err?.response?.status || 500;
    const msg = err?.response?.data?.error?.message || err?.message || "Server error";
    let retry=0; try{
      const H=/in\s*(\d+)h/i.exec(msg); if(H) retry+=parseInt(H[1],10)*3600;
      const M=/in\s*(\d+)m/i.exec(msg); if(M) retry+=parseInt(M[1],10)*60;
      const S=/in\s*(\d+(?:\.\d+)?)s/i.exec(msg); if(S) retry+=Math.ceil(parseFloat(S[1]));
      if(!retry && status===429) retry=300;
    }catch(_){}
    return { statusCode: status, headers: CORS(), body: JSON.stringify({ error: msg, retryAfterSeconds: retry }) };
  }
};

function CORS(){ return {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"Content-Type, Authorization",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};}
