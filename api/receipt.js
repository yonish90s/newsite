// שליחת קבלה במייל אחרי תשלום. ספק: Resend (resend.com).
// מה שצריך לחבר ב-Vercel → Settings → Environment Variables:
//   RESEND_API_KEY  — המפתח מ-Resend
//   RECEIPT_FROM    — כתובת שולח מאומתת, למשל: "Black1White00 <orders@black1white00.com>"
// הגנה מפני שימוש לרעה: נשלח רק להזמנה אמיתית שנוצרה עכשיו (בודקים את website/order_stubs), עם הגבלת קצב.
const crypto = require('crypto');
const DB = 'https://newsite-f76e2-default-rtdb.firebaseio.com/website';
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?black1white00\.com$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/localhost(:\d+)?$/];
const hits = new Map();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.some(r => r.test(origin))) return res.status(403).json({ error: 'forbidden' });
  const key = process.env.RESEND_API_KEY, from = process.env.RECEIPT_FROM;
  if (!key || !from) return res.status(503).json({ error: 'not_configured' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 3600e3); arr.push(now); hits.set(ip, arr);
  if (arr.length > 5) return res.status(429).json({ error: 'too_many_requests' });

  const { no, email, order } = req.body || {};
  if (!/^BW-\d{6}$/.test(String(no || '')) || !/^[^\s@]{1,64}@[^\s@]{1,100}\.[a-z]{2,}$/i.test(String(email || ''))) return res.status(400).json({ error: 'bad_request' });
  try {
    const stub = await (await fetch(`${DB}/order_stubs/${no}.json`)).json();
    const h = crypto.createHash('sha256').update(String(email).toLowerCase() + '|' + no).digest('hex');
    if (!stub || stub.h !== h || now - Number(stub.t) > 15 * 60 * 1000) return res.status(403).json({ error: 'order_not_found' });
    const o = order || {};
    const items = (Array.isArray(o.items) ? o.items : []).slice(0, 30);
    const rows = items.map(i => `<tr><td style="padding:6px 0">${esc(i.name)} × ${Number(i.qty) || 1}</td><td style="padding:6px 0;text-align:left">₪${(Number(i.price) || 0) * (Number(i.qty) || 1)}</td></tr>`).join('');
    const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
      <h2 style="margin:0 0 4px">תודה על ההזמנה!</h2><p style="margin:0 0 16px;color:#666">הזמנה ${esc(no)} · ${new Date(Number(o.t) || now).toLocaleString('he-IL')}</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
        <tr><td style="padding:6px 0;border-top:1px solid #eee">משלוח</td><td style="padding:6px 0;border-top:1px solid #eee;text-align:left">${Number(o.ship) ? '₪' + Number(o.ship) : 'חינם'}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">סה״כ</td><td style="padding:8px 0;font-weight:bold;text-align:left">₪${Number(o.total) || 0}</td></tr></table>
      <p style="color:#666;font-size:13px">${o.method === 'pickup' ? 'איסוף עצמי' : 'משלוח ל: ' + esc(o.addr)}</p>
      <p style="color:#999;font-size:12px">תשלום הדגמה — לא בוצע חיוב. לעולם לא נבקש תשלום נוסף ב-SMS או במייל.</p></div>`;
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject: `קבלה — הזמנה ${no}`, html }) });
    if (!r.ok) return res.status(502).json({ error: 'send_failed' });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
