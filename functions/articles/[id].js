function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

export async function onRequestGet({ params, env }) {
  const id = Number(params.id);
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
  const bodyHtml = escapeHtml(article.content)
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

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
