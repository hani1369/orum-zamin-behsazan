import { DEFAULT_CONTENT, requireSession, json } from "../_shared.js";

// GET /api/content -> public, returns the current site content (or defaults on first run)
export async function onRequestGet({ env }) {
  let raw = await env.OZ_KV.get("content");
  if (!raw) {
    raw = JSON.stringify(DEFAULT_CONTENT);
    await env.OZ_KV.put("content", raw);
  }
  return new Response(raw, { headers: { "content-type": "application/json; charset=utf-8" } });
}

// POST /api/content -> protected, overwrites the site content
export async function onRequestPost({ request, env }) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }
  await env.OZ_KV.put("content", JSON.stringify(body));
  return json({ success: true });
}
