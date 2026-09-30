import { getToken, json } from "../_shared.js";

// POST /api/logout -> invalidates the current session token
export async function onRequestPost({ request, env }) {
  const token = getToken(request);
  if (token) await env.OZ_KV.delete("session:" + token);
  return json({ success: true });
}
