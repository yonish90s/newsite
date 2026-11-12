// סוכן ה-AI של חלון "פרסום מהיר": עוזר לגולש לבנות מודעה בשיחה חופשית, ועונה על שאלות שירות לקוחות.
// המפתח נשמר רק במשתני הסביבה של Vercel: ANTHROPIC_API_KEY (בלי מפתח — 503, והאתר חוזר לשאלות הקבועות).
// הסוכן לא מפרסם בעצמו: הוא מחזיר טיוטה, והגולש מאשר בלחיצה. אחרי זה המודעה עדיין עוברת אישור מנהל.
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?black1white00\.com$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^https:\/\/newsite-f76e2\.(web\.app|firebaseapp\.com)$/, /^http:\/\/localhost(:\d+)?$/];
const MODEL = 'claude-haiku-5-5';
const KB_URL = 'https://newsite-f76e2-default-rtdb.firebaseio.com/website/assistant_kb.json';

// הגבלת שימוש לכל כתובת IP: עד 20 הודעות בדקה ועד 150 ביום
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 864e5);
  arr.push(now); hits.set(ip, arr);
  return arr.filter(t => now - t < 6e4).length > 20 || arr.length > 150;
}

// מאגר הידע של האתר (המנהל כותב אותו בעוזר האתר) — נטען מהשרת, לא מהדפדפן, ונשמר 5 דקות
let kbCache = { t: 0, text: '' };
async function kbText() {
  if (Date.now() - kbCache.t < 3e5) return kbCache.text;
  try {
    const r = await fetch(KB_URL);
    const v = (await r.json()) || {};
    const items = Object.values(v.items || {}).filter(x => x && x.q && x.a).slice(0, 80).map(x => `ש: ${String(x.q).slice(0, 200)}\nת: ${String(x.a).slice(0, 600)}`);
    kbCache = { t: Date.now(), text: [String(v.notes || '').slice(0, 6000), items.join('\n\n')].filter(Boolean).join('\n\n').slice(0, 12000) };
  } catch (e) { kbCache = { t: Date.now(), text: kbCache.text || '' }; }
  return kbCache.text;
}

const AREAS = 'elec=חשמל ואלקטרוניקה, home=בית ומטבח, tools=כלים ותיקונים, car=רכב ותחבורה, garden=גינה וחקלאות, energy=אנרגיה וסביבה, web=אתרים, apps=אפליקציות, ai=בינה מלאכותית ואוטומציה, biz=כלים לעסקים, d3=יצירות תלת מימד, games=משחקים, toys=צעצועים ומשחקי קופסה, sport=ספורט וטיולים, music=מוזיקה, art=אמנות ועיצוב, photo=צילום ווידאו, edu=לימוד וחינוך, health=בריאות ונגישות, comm=קהילה והתנדבות';

function systemPrompt(kb) {
  return `אתה העוזר של "שיתוף רעיונות" (black1white00.com) — אתר קהילה ושוק ישראלי בעברית. אתה מדבר בעברית, בקצרה ובחום, בגוף שני.

יש לך שני תפקידים:
1. לעזור לגולש לפרסם מודעה בקלות: להבין מה הוא רוצה לפרסם, לשאול רק את מה שחסר (שאלה אחת בכל פעם), ולמלא טיוטה.
2. שירות לקוחות: לענות על שאלות על האתר לפי המידע למטה. אם אינך יודע או שמדובר בבעיה בחשבון, בתשלום או בתלונה — אל תמציא; הצע להעביר למנהל (handoff=true).

סוגי מודעות (type):
- sale = יד 2 (offer: sale מכירה / swap החלפה / loan השאלה)
- biz = עסק (חובה bizName — שם העסק)
- proj = פרויקט שבנו (חובה area מהרשימה; kind: site/app/3d/other)
תחומי פרויקטים (area): ${AREAS}

כללים לטיוטה:
- title: עד 32 תווים, קצר וברור (בערך 5 מילים). אם הגולש נתן ארוך — קצר בעצמך.
- price: מספר בשקלים, או null אם אין מחיר (מותר בלי מחיר).
- desc: תיאור קצר (עד 400 תווים) — אפשר לנסח בעצמך מהשיחה.
- city: עיר אם נאמרה. link: קישור אם נאמר. video: קישור יוטיוב אם נאמר.
- תמונה: חובה לפחות אחת. הגולש מוסיף תמונות בכפתור + שליד שורת ההקלדה; images אומר כמה כבר הוסיף.
- ready=true רק כשיש type, title, ולפחות תמונה אחת (ו-bizName לעסק, area לפרויקט). אז תכתוב סיכום קצר ותבקש אישור.
- לעולם אל תגיד שהמודעה פורסמה — הגולש מפרסם בלחיצה על כפתור. אחרי זה המודעה מחכה לאישור מנהל.
- אל תבקש ואל תקבל סיסמאות, מספרי כרטיס אשראי או תעודת זהות.
- סרב בנימוס לתוכן לא חוקי, מיני, אלים או פוגעני.

מידע על האתר (מהמנהל):
${kb || '(אין עדיין מידע נוסף)'}

ענה תמיד ב-JSON בלבד, בלי טקסט מחוץ לו, בצורה הזו:
{"reply":"מה שאתה אומר לגולש","draft":{"type":null,"offer":null,"title":null,"price":null,"desc":null,"city":null,"bizName":null,"area":null,"kind":null,"link":null,"video":null},"ready":false,"handoff":false}
ב-draft כתוב רק שדות שנאמרו או שאתה בטוח בהם; השאר null.`;
}

const str = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
function cleanDraft(d) {
  d = d && typeof d === 'object' ? d : {};
  const out = {};
  if (['sale', 'biz', 'proj'].includes(d.type)) out.type = d.type;
  if (['sale', 'swap', 'loan'].includes(d.offer)) out.offer = d.offer;
  if (str(d.title, 32)) out.title = str(d.title, 32);
  const p = Number(d.price); if (d.price !== null && d.price !== undefined && d.price !== '' && p >= 0 && p <= 10000000) out.price = Math.round(p);
  if (str(d.desc, 400)) out.desc = str(d.desc, 400);
  if (str(d.city, 40)) out.city = str(d.city, 40);
  if (str(d.bizName, 60)) out.bizName = str(d.bizName, 60);
  if (/^[a-z0-9]{2,8}$/.test(d.area || '')) out.area = d.area;
  if (['site', 'app', '3d', 'other'].includes(d.kind)) out.kind = d.kind;
  if (str(d.link, 200)) out.link = str(d.link, 200);
  if (str(d.video, 200)) out.video = str(d.video, 200);
  return out;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.some(r => r.test(origin))) return res.status(403).json({ error: 'forbidden' });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'not_configured' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'too_many_requests' });

  const { messages, draft, images } = req.body || {};
  const msgs = (Array.isArray(messages) ? messages : []).slice(-16)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' });
  // מצב הטיוטה ומספר התמונות — מצורפים להודעה האחרונה, כדי שהסוכן יידע מה כבר יש
  const state = `\n\n[מצב נוכחי — טיוטה: ${JSON.stringify(cleanDraft(draft))} · תמונות: ${Math.max(0, Math.min(5, Number(images) || 0))}]`;
  msgs[msgs.length - 1] = { role: 'user', content: msgs[msgs.length - 1].content + state };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: systemPrompt(await kbText()), messages: msgs.concat([{ role: 'assistant', content: '{' }]) })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'upstream_error' });
    const raw = '{' + (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    let out;
    try { out = JSON.parse(raw.slice(0, raw.lastIndexOf('}') + 1)); } catch (e) { out = { reply: raw.replace(/^\{\s*"reply"\s*:\s*"?/, '').slice(0, 800) }; }
    return res.json({ reply: String(out.reply || '').slice(0, 1500), draft: cleanDraft(out.draft), ready: !!out.ready, handoff: !!out.handoff });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
