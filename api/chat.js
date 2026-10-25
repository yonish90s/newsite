// צ'אט מודלי שפה דרך השרת של האתר — המפתחות נשמרים רק במשתני הסביבה של Vercel (לא בקוד ולא בדפדפן).
// מה שצריך לחבר (Vercel → Project → Settings → Environment Variables):
//   ANTHROPIC_API_KEY  — למודלי Claude
//   OPENAI_API_KEY + OPENAI_MODEL   — ל-ChatGPT (OPENAI_MODEL = מזהה המודל שבחרתם)
//   GEMINI_API_KEY + GEMINI_MODEL   — ל-Gemini
// בלי מפתח — מוחזר 503 והאתר עובר למצב הדגמה.
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?black1white00\.com$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/localhost(:\d+)?$/];
const CLAUDE = { 'claude-opus-5-5': 'claude-opus-5-5', 'claude-sonnet-5-5': 'claude-sonnet-5-5', 'claude-haiku-5-5': 'claude-haiku-5-5' };
const hits = new Map(); // הגבלת קצב פשוטה לכל כתובת IP

function limited(ip) {
  const now = Date.now(), win = 60 * 1000, max = 20;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  return arr.length > max;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.some(r => r.test(origin))) return res.status(403).json({ error: 'forbidden' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'too_many_requests' });

  const { model, messages } = req.body || {};
  const msgs = (Array.isArray(messages) ? messages : []).slice(-20)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' });

  try {
    if (CLAUDE[model]) {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(503).json({ error: 'not_configured' });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: CLAUDE[model], max_tokens: 1024, messages: msgs })
      });
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'upstream_error' });
      return res.json({ text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n') });
    }
    if (model === 'openai') {
      const key = process.env.OPENAI_API_KEY, m = process.env.OPENAI_MODEL;
      if (!key || !m) return res.status(503).json({ error: 'not_configured' });
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: m, messages: msgs })
      });
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'upstream_error' });
      return res.json({ text: (((j.choices || [])[0] || {}).message || {}).content || '' });
    }
    if (model === 'gemini') {
      const key = process.env.GEMINI_API_KEY, m = process.env.GEMINI_MODEL;
      if (!key || !m) return res.status(503).json({ error: 'not_configured' });
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: msgs.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] })) })
      });
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'upstream_error' });
      return res.json({ text: ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('') });
    }
    return res.status(503).json({ error: 'not_configured' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
}
