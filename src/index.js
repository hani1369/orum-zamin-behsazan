import { DEFAULT_CONTENT, sha256Hex, requireSession, json, escapeHtml } from "./shared.js";

const DEFAULT_PASSWORD = "orum1404";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === "/api/content") {
        if (method === "GET") return apiGetContent(env);
        if (method === "POST") return apiPostContent(request, env);
      }

      if (path === "/api/articles") {
        if (method === "GET") return apiGetArticles(request, env);
        if (method === "POST") return apiPostArticle(request, env);
        if (method === "DELETE") return apiDeleteArticle(request, env);
      }

      if (path === "/api/leads") {
        if (method === "GET") return apiGetLeads(request, env);
        if (method === "POST") return apiPostLead(request, env);
        if (method === "DELETE") return apiDeleteLead(request, env);
      }

      if (path === "/api/login" && method === "POST") return apiLogin(request, env);
      if (path === "/api/logout" && method === "POST") return apiLogout(request, env);
      if (path === "/api/change-password" && method === "POST") return apiChangePassword(request, env);

      const articleMatch = path.match(/^\/articles\/(\d+)$/);
      if (articleMatch && method === "GET") return articlePage(env, Number(articleMatch[1]));
    } catch (e) {
      return json({ error: "server_error", message: String(e && e.message || e) }, 500);
    }

    return env.ASSETS.fetch(request);
  }
};

async function apiGetContent(env) {
  let raw = await env.OZ_KV.get("content");
  if (!raw) {
    raw = JSON.stringify(DEFAULT_CONTENT);
    await env.OZ_KV.put("content", raw);
  }
  return new Response(raw, { headers: { "content-type": "application/json; charset=utf-8" } });
}

async function apiPostContent(request, env) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }
  await env.OZ_KV.put("content", JSON.stringify(body));
  return json({ success: true });
}

async function apiGetArticles(request, env) {
  const raw = await env.OZ_KV.get("articles");
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }
  const isAdmin = await requireSession(request, env);
  if (!isAdmin) articles = articles.filter(a => a.published !== false);
  return json(articles);
}

async function apiPostArticle(request, env) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }

  const title = (body.title || "").toString().trim().slice(0, 300);
  const summary = (body.summary || "").toString().trim().slice(0, 500);
  const content = (body.content || "").toString().trim().slice(0, 20000);
  const published = body.published !== false;

  if (!title || !content) return json({ error: "invalid" }, 400);

  const raw = await env.OZ_KV.get("articles");
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }

  if (body.id) {
    const idx = articles.findIndex(a => a.id === body.id);
    if (idx === -1) return json({ error: "not_found" }, 404);
    articles[idx] = Object.assign({}, articles[idx], { title, summary, content, published });
  } else {
    articles.unshift({ id: Date.now(), title, summary, content, published, date: new Date().toISOString() });
  }

  await env.OZ_KV.put("articles", JSON.stringify(articles));
  return json({ success: true });
}

async function apiDeleteArticle(request, env) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }
  const raw = await env.OZ_KV.get("articles");
  let articl
