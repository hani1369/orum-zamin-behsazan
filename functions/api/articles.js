import { requireSession, json } from "../_shared.js";

// GET /api/articles -> public visitors get only published articles.
// If a valid admin session token is sent, drafts are included too (for the admin panel).
export async function onRequestGet({ request, env }) {
  const raw = await env.OZ_KV.get("articles");
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }

  const isAdmin = await requireSession(request, env);
  if (!isAdmin) articles = articles.filter(a => a.published !== false);

  return json(articles);
}

// POST /api/articles -> protected, upsert: pass {id} to edit, omit it to create
export async function onRequestPost({ request, env }) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  const title = (body.title || "").toString().trim().slice(0, 300);
  const summary = (body.summary || "").toString().trim().slice(0, 500);
  const content = (body.content || "").toString().trim().slice(0, 20000);
  const published = body.published !== false;

  if (!title || !content) {
    return json({ error: "invalid" }, 400);
  }

  const raw = await env.OZ_KV.get("articles");
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }

  if (body.id) {
    const idx = articles.findIndex(a => a.id === body.id);
    if (idx === -1) return json({ error: "not_found" }, 404);
    articles[idx] = Object.assign({}, articles[idx], { title, summary, content, published });
  } else {
    articles.unshift({
      id: Date.now(),
      title, summary, content, published,
      date: new Date().toISOString()
    });
  }

  await env.OZ_KV.put("articles", JSON.stringify(articles));
  return json({ success: true });
}

// DELETE /api/articles -> protected, { id }
export async function onRequestDelete({ request, env }) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  const raw = await env.OZ_KV.get("articles");
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }
  articles = articles.filter(a => a.id !== body.id);

  await env.OZ_KV.put("articles", JSON.stringify(articles));
  return json({ success: true });
}
