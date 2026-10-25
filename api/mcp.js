// שרת MCP (Streamable HTTP, JSON-RPC) — קריאה בלבד, מנתונים ציבוריים של האתר. עובד בלי הגדרות.
// לקוחות (Claude Desktop / Cursor / VS Code) מתחברים לכתובת: https://black1white00.com/api/mcp
const DB = 'https://newsite-f76e2-default-rtdb.firebaseio.com/website';
const SITE = 'https://black1white00.com';
let cache = { t: 0, items: [] };

async function loadItems() {
  if (Date.now() - cache.t < 60 * 1000 && cache.items.length) return cache.items;
  const pages = await (await fetch(`${DB}/pages.json`)).json();
  const items = [];
  (Array.isArray(pages) ? pages : Object.values(pages || {})).forEach(p => {
    const c = (p && p.content) || '';
    const re = /data-(photos|stories)-json="([^"]*)"/g; let m;
    while ((m = re.exec(c))) {
      let arr = []; try { arr = JSON.parse(decodeURIComponent(m[2])); } catch (e) {}
      const section = (c.match(/data-section="([^"]+)"/) || [])[1];
      arr.forEach(x => {
        if (!x || !x.id || x.approved === false) return;
        const kind = m[1] === 'stories' ? 'story' : (section === 'secondhand' ? 'product' : 'photo');
        items.push({ id: x.id, kind, title: x.title || '', author: x.author || '', category: x.category || '', summary: String(x.summary || '').slice(0, 300), price: x.price || '', likes: Number(x.likes) || 0, date: x.timestamp || '', url: `${SITE}/#${kind === 'story' ? 's' : 'p'}/${x.id}` });
      });
    }
  });
  const seen = new Set();
  cache = { t: Date.now(), items: items.filter(i => !seen.has(i.id) && seen.add(i.id)) };
  return cache.items;
}

const TOOLS = [
  { name: 'search_items', description: 'חיפוש תמונות, קומיקס, סיפורים ומוצרי גולשים לפי מילים', inputSchema: { type: 'object', properties: { query: { type: 'string' }, kind: { type: 'string', enum: ['photo', 'story', 'product'] }, limit: { type: 'number' } }, required: ['query'] } },
  { name: 'get_item', description: 'פרטי פריט לפי מזהה', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'list_news', description: 'הידיעות האחרונות בעמוד החדשות', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'list_products', description: 'מוצרי החנות עם מחיר ומלאי', inputSchema: { type: 'object', properties: {} } }
];

async function callTool(name, args) {
  args = args || {};
  if (name === 'search_items') {
    const q = String(args.query || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    const list = (await loadItems()).filter(i => (!args.kind || i.kind === args.kind) && words.every(w => (i.title + ' ' + i.author + ' ' + i.category + ' ' + i.summary).toLowerCase().includes(w)));
    return list.slice(0, Math.min(Number(args.limit) || 10, 25));
  }
  if (name === 'get_item') return (await loadItems()).find(i => i.id === args.id) || { error: 'not_found' };
  if (name === 'list_news') {
    const v = await (await fetch(`${DB}/news_posts.json`)).json() || {};
    return Object.entries(v).map(([id, n]) => ({ id, title: n.title || '', summary: String(n.desc || '').slice(0, 300), author: n.author || '', date: n.createdAt ? new Date(n.createdAt).toISOString() : '', url: `${SITE}/#n/${id}` }))
      .sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, Math.min(Number(args.limit) || 10, 30));
  }
  if (name === 'list_products') {
    const v = await (await fetch(`${DB}/products.json`)).json() || [];
    return (Array.isArray(v) ? v : Object.values(v)).filter(Boolean).map(p => ({ id: p.id, name: p.name, price: p.price || '', stock: p.stock, description: p.desc || '' }));
  }
  throw Object.assign(new Error('Unknown tool'), { code: -32602 });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, mcp-protocol-version, authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(405).json({ error: 'Use POST (MCP Streamable HTTP)' });
  if (req.method !== 'POST') return res.status(405).end();
  const msg = req.body || {};
  const reply = (result) => res.json({ jsonrpc: '2.0', id: msg.id, result });
  const fail = (code, message) => res.json({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });
  try {
    if (msg.method === 'initialize') return reply({ protocolVersion: (msg.params && msg.params.protocolVersion) || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'black1white00', version: '1.0.0' } });
    if (typeof msg.method === 'string' && msg.method.startsWith('notifications/')) return res.status(202).end();
    if (msg.method === 'ping') return reply({});
    if (msg.method === 'tools/list') return reply({ tools: TOOLS });
    if (msg.method === 'tools/call') {
      const out = await callTool(msg.params && msg.params.name, msg.params && msg.params.arguments);
      return reply({ content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
    }
    return fail(-32601, 'Method not found');
  } catch (e) {
    return fail(e.code || -32603, e.message || 'Internal error');
  }
}
