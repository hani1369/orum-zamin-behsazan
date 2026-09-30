import { sha256Hex, requireSession, json } from "../_shared.js";

// POST /api/change-password -> protected, { current, next }
export async function onRequestPost({ request, env }) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  const current = (body.current || "").toString();
  const next = (body.next || "").toString();

  if (!next || next.length < 4) {
    return json({ error: "weak_password" }, 400);
  }

  const adminRaw = await env.OZ_KV.get("admin");
  let stored = null;
  try { stored = JSON.parse(adminRaw).hash; } catch (e) {}

  const curHash = await sha256Hex(current);
  if (!stored || curHash !== stored) {
    return json({ error: "wrong_current" }, 400);
  }

  const newHash = await sha256Hex(next);
  await env.OZ_KV.put("admin", JSON.stringify({ hash: newHash }));
  return json({ success: true });
}
