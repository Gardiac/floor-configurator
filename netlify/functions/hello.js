export const handler = async () => ({
  statusCode: 200,
  headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  body: JSON.stringify({ ok: true, msg: "hello from Netlify functions" })
});