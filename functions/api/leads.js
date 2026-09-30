import { requireSession, json } from "../_shared.js";

// GET /api/leads -> protected, list all submitted leads
export async function onRequestGet({ request, env }) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);
  const raw = await env.OZ_KV.get("leads");
  return new Response(raw || "[]", { headers: { "content-type": "application/json; charset=utf-8" } });
}

// POST /api/leads -> public, visitors submit the contact form here
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  const name = (body.name || "").toString().trim().slice(0, 200);
  const phone = (body.phone || "").toString().trim().slice(0, 50);
  const email = (body.email || "").toString().trim().slice(0, 200);
  const message = (body.message || "").toString().trim().slice(0, 2000);

  if (!name || (!phone && !email)) {
    return json({ error: "invalid" }, 400);
  }

  const raw = await env.OZ_KV.get("leads");
  let leads = [];
  try { leads = raw ? JSON.parse(raw) : []; } catch (e) { leads = []; }

  leads.unshift({
    id: Date.now(),
    name, phone, email, message,
    date: new Date().toISOString()
  });

  // keep the list from growing without bound
  if (leads.length > 2000) leads = leads.slice(0, 2000);

  await env.OZ_KV.put("leads", JSON.stringify(leads));
  return json({ success: true });
}

// DELETE /api/leads -> protected, remove a single lead by id
export async function onRequestDelete({ request, env }) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  const raw = await env.OZ_KV.get("leads");
  let leads = [];
  try { leads = raw ? JSON.parse(raw) : []; } catch (e) { leads = []; }
  leads = leads.filter(l => l.id !== body.id);
  await env.OZ_KV.put("leads", JSON.stringify(leads));
  return json({ success: true });
}
