import { DEFAULT_CONTENT, sha256Hex, requireSession, json, escapeHtml } from "./shared.js";

const DEFAULT_PASSWORD = "orum1404";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

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

    // everything else: serve the static site (public/ folder)
    return env.ASSETS.fetch(request);
  }
};

/* ---------- content ---------- */

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

/* ---------- articles ---------- */

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
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }
  articles = articles.filter(a => a.id !== body.id);
  await env.OZ_KV.put("articles", JSON.stringify(articles));
  return json({ success: true });
}

/* ---------- leads ---------- */

async function apiGetLeads(request, env) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);
  const raw = await env.OZ_KV.get("leads");
  return new Response(raw || "[]", { headers: { "content-type": "application/json; charset=utf-8" } });
}

async function apiPostLead(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }

  const name = (body.name || "").toString().trim().slice(0, 200);
  const phone = (body.phone || "").toString().trim().slice(0, 50);
  const email = (body.email || "").toString().trim().slice(0, 200);
  const message = (body.message || "").toString().trim().slice(0, 2000);

  if (!name || (!phone && !email)) return json({ error: "invalid" }, 400);

  const raw = await env.OZ_KV.get("leads");
  let leads = [];
  try { leads = raw ? JSON.parse(raw) : []; } catch (e) { leads = []; }

  leads.unshift({ id: Date.now(), name, phone, email, message, date: new Date().toISOString() });
  if (leads.length > 2000) leads = leads.slice(0, 2000);

  await env.OZ_KV.put("leads", JSON.stringify(leads));
  return json({ success: true });
}

async function apiDeleteLead(request, env) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }
  const raw = await env.OZ_KV.get("leads");
  let leads = [];
  try { leads = raw ? JSON.parse(raw) : []; } catch (e) { leads = []; }
  leads = leads.filter(l => l.id !== body.id);
  await env.OZ_KV.put("leads", JSON.stringify(leads));
  return json({ success: true });
}

/* ---------- auth ---------- */

async function apiLogin(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }

  let adminRaw = await env.OZ_KV.get("admin");
  if (!adminRaw) {
    const hash = await sha256Hex(DEFAULT_PASSWORD);
    adminRaw = JSON.stringify({ hash });
    await env.OZ_KV.put("admin", adminRaw);
  }

  let stored;
  try { stored = JSON.parse(adminRaw).hash; } catch (e) { stored = null; }

  const hash = await sha256Hex((body.password || "").toString());
  if (!stored || hash !== stored) return json({ error: "invalid_credentials" }, 401);

  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.OZ_KV.put("session:" + token, "1", { expirationTtl: SESSION_TTL_SECONDS });
  return json({ token });
}

async function apiLogout(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) await env.OZ_KV.delete("session:" + token);
  return json({ success: true });
}

async function apiChangePassword(request, env) {
  const ok = await requireSession(request, env);
  if (!ok) return json({ error: "unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid_json" }, 400); }

  const current = (body.current || "").toString();
  const next = (body.next || "").toString();
  if (!next || next.length < 4) return json({ error: "weak_password" }, 400);

  const adminRaw = await env.OZ_KV.get("admin");
  let stored = null;
  try { stored = JSON.parse(adminRaw).hash; } catch (e) {}

  const curHash = await sha256Hex(current);
  if (!stored || curHash !== stored) return json({ error: "wrong_current" }, 400);

  const newHash = await sha256Hex(next);
  await env.OZ_KV.put("admin", JSON.stringify({ hash: newHash }));
  return json({ success: true });
}

/* ---------- server-rendered article page ---------- */

function renderShell(innerHtml, title) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} | اروم زمین بهسازان</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header id="site-header" style="position:static; background:var(--panel); border-bottom:1px solid var(--line); padding:16px 0;">
  <div class="container header-inner">
    <a href="/" class="brand">
      <div class="brand-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c4 5 7 9 7 13a7 7 0 1 1-14 0c0-4 3-8 7-13z"/></svg>
      </div>
      <div class="brand-name"><b>اروم زمین بهسازان</b><span>ORUM ZAMIN BEHSAZAN</span></div>
    </a>
    <a href="/#contact" class="btn btn-gold btn-sm">تماس با ما</a>
  </div>
</header>
${innerHtml}
<footer style="padding:36px 0;">
  <div class="container footer-bottom" style="border-top:1px solid var(--line); padding-top:20px;">
    <p style="font-size:12.5px; color:var(--muted); font-family:var(--mono);">© ${new Date().getFullYear()} اروم زمین بهسازان</p>
    <a href="/" style="font-size:13px; color:var(--gold-light);">بازگشت به صفحه اصلی</a>
  </div>
</footer>
</body>
</html>`;
}

async function articlePage(env, id) {
  const raw = await env.OZ_KV.get("articles");
  let articles = [];
  try { articles = raw ? JSON.parse(raw) : []; } catch (e) { articles = []; }
  const article = articles.find(a => a.id === id && a.published !== false);

  if (!article) {
    const html = renderShell(`
      <div class="article-404">
        <h1>مقاله پیدا نشد</h1>
        <p>این مقاله حذف شده یا هنوز منتشر نشده است.</p>
        <a href="/#articles" class="btn btn-gold btn-sm">بازگشت به مقالات</a>
      </div>
    `, "مقاله پیدا نشد");
    return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const d = new Date(article.date);
  const dateStr = isNaN(d) ? "" : d.toLocaleDateString("fa-IR");
  const bodyHtml = escapeHtml(article.content).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

  const html = renderShell(`
    <div class="article-page-wrap">
      <a href="/#articles" class="back-link">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M11 18l-6-6 6-6"/></svg>
        بازگشت به مقالات
      </a>
      <div class="article-page-date">${dateStr}</div>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-page-body">${bodyHtml}</div>
    </div>
  `, article.title);

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
