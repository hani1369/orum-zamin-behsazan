import { sha256Hex, json } from "../_shared.js";

const DEFAULT_PASSWORD = "orum1404";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// POST /api/login -> { password } -> { token }
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  let adminRaw = await env.OZ_KV.get("admin");
  if (!adminRaw) {
    // first ever login: seed the default password
    const hash = await sha256Hex(DEFAULT_PASSWORD);
    adminRaw = JSON.stringify({ hash });
    await env.OZ_KV.put("admin", adminRaw);
  }

  let stored;
  try { stored = JSON.parse(adminRaw).hash; } catch (e) { stored = null; }

  const hash = await sha256Hex((body.password || "").toString());
  if (!stored || hash !== stored) {
    return json({ error: "invalid_credentials" }, 401);
  }

  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.OZ_KV.put("session:" + token, "1", { expirationTtl: SESSION_TTL_SECONDS });

  return json({ token });
}
