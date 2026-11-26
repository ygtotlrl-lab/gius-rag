// supabase/functions/gr-agent/index.ts — המחבר של קלוד לגיוס רמת אביב ג׳ — שרת MCP (Streamable HTTP, JSON)
// זהות: OAuth 2.1 של Supabase Auth — המשתמש נכנס עם Google בדף האישור (oauth/consent שבאפליקציה), וקלוד מגיע עם אסימון המשתמש.
// כל פעולה רצה בשם המשתמש — מדיניות המסד של האפליקציה חלות כמות שהן: מי שאינו ברשימת המשתמשים אינו רואה דבר,
// הכלים מוגדרים, והשער ממלא את שדות החותמת: client_id · updated_at · deleted_* · last_changed.
// לפני כל כתיבה השער בודק את כללי החובה של האפליקציה (`RULES` ⟵ `check`), באותן הודעות שבטפסים — שורה שהאפליקציה הייתה דוחה אינה נכתבת.
// המקור — הקובץ הזה בריפו, והפריסה ממנו.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const APP = 'גיוס — בית חב״ד רמת אביב ג׳';
const P = 'gr_';
// הטבלאות שקלוד רשאי לכתוב בהן, והמפתח של כל אחת; וטבלאות לקריאה בלבד
const WRITE: Record<string, string> = {
  donors: 'client_id', pledges: 'client_id', txns: 'client_id', plan_items: 'client_id', journal: 'client_id',
  tasks: 'client_id', lookups: 'client_id', notes: 'client_id', targets: 'client_id', settings: 'key',
};
const READ = new Set([...Object.keys(WRITE), 'users']);
const OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is']);
const COL = /^[a-z_][a-z0-9_]*$/;

function base(req: Request) {
  const u = new URL(req.url);
  const i = u.pathname.indexOf('/gr-agent');
  return URL_ + '/functions/v1' + u.pathname.slice(i, i + '/gr-agent'.length);
}
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'WWW-Authenticate' };
function json(b: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(b), { status, headers: { ...H, ...extra } });
}

// ── זהות ──
async function who(req: Request) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok) return null;
  const db = createClient(URL_, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + tok } } });
  const r = await db.auth.getUser(tok);
  const email = r.data && r.data.user && r.data.user.email;
  return email ? { db, email: String(email).toLowerCase() } : null;
}
type Who = { db: any; email: string };

function tbl(name: string, write: boolean) {
  const t = String(name || '').replace(/^gr_/, '');
  if (write ? !(t in WRITE) : !READ.has(t)) throw new Error('טבלה לא מותרת: ' + name);
  return t;
}
function cols(o: Record<string, unknown>) {
  for (const k of Object.keys(o || {})) if (!COL.test(k)) throw new Error('שם עמודה לא תקין: ' + k);
  return o;
}
async function touch(w: Who, now: number) {
  await w.db.from(P + 'settings').update({ value: String(now), updated_at: now }).eq('key', 'last_changed');
}

// ── הכלים ──
const TOOLS = [
  { name: 'schema', description: 'מבנה הטבלאות: שם כל טבלה ועמודותיה. לקרוא פעם אחת בתחילת עבודה.',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'query', description: 'קריאה מטבלה, עם סינון, מיון ומגבלה. רשומות שנמחקו מחיקה רכה מוסתרות, אלא אם include_deleted. ביומן העבודה (journal) — רק של המשתמש המחובר.',
    inputSchema: { type: 'object', required: ['table'], properties: {
      table: { type: 'string', description: 'donors · pledges · txns · plan_items · journal · tasks · lookups · notes · targets · settings · users' },
      select: { type: 'string', description: 'עמודות מופרדות בפסיק, ברירת מחדל *' },
      filters: { type: 'array', items: { type: 'object', required: ['column', 'op', 'value'], properties: {
        column: { type: 'string' }, op: { type: 'string', enum: [...OPS] }, value: {} } } },
      order: { type: 'string', description: 'עמודה, ואחריה אופציונלית .desc' },
      limit: { type: 'number', description: 'עד 500, ברירת מחדל 100' },
      include_deleted: { type: 'boolean' } } } },
  { name: 'insert', description: 'הוספת רשומות. client_id, updated_at ו-deleted מתמלאים מעצמם, וביומן — גם owner. לפני הוספה — להציג למשתמש מה ייכנס ולקבל אישור.',
    inputSchema: { type: 'object', required: ['table', 'rows'], properties: {
      table: { type: 'string' }, rows: { type: 'array', items: { type: 'object' } } } } },
  { name: 'update', description: 'עדכון רשומה אחת לפי המזהה שלה (client_id, ובהגדרות — key). updated_at מתעדכן מעצמו. שינוי סכום — רק באישור מפורש של המשתמש.',
    inputSchema: { type: 'object', required: ['table', 'id', 'values'], properties: {
      table: { type: 'string' }, id: { type: 'string' }, values: { type: 'object' } } } },
  { name: 'soft_delete', description: 'מחיקה רכה של רשומה: deleted, deleted_at, deleted_by ו-updated_at. אין מחיקה לצמיתות. מחיקת כרטיס — מוחקים קודם את התחייבויותיו, תשלומיו ושורות התכנית שלו.',
    inputSchema: { type: 'object', required: ['table', 'id'], properties: { table: { type: 'string' }, id: { type: 'string' } } } },
];

// מבנה הטבלאות — כמו ב-migrations/000_schema.sql; * — חובה
const SCHEMA = [
  'donors: client_id*, name*, ambassador, phone, role, birth_date (date), dates (jsonb), notes, affiliations (text[]), starred, is_general',
  'pledges: client_id*, donor_client_id*, section* (קטגוריה), pledge_type*, detail, ambassador*, amount (≥0, 0 — ללא סכום), note',
  'txns: client_id*, donor_client_id* (של ההתחייבות), pledge_client_id*, amount* (>0), txn_month* (YYYY-MM), txn_date (date), method, installments (≥2, בהו״ק), first_installment, cleared, not_initiated, note',
  'plan_items: client_id*, donor_client_id*, plan_month* (YYYY-MM), section, kind, expected, ambassador, care_date (date), note, irrelevant, sort',
  'journal: client_id*, jday* (date), section*, body — owner מתמלא מעצמו',
  'tasks: client_id*, title*, stage, assignee, domain, due_date (date), due_time, repeat (jsonb), subtasks (jsonb), starred, note, sort',
  'lookups: client_id*, kind* (section · ptype · method · affiliation · ambassador · domain), label*, sort',
  'notes: client_id*, title, body, color, sort',
  'targets: client_id*, target_month* (YYYY-MM), amount',
  'settings: key*, value (JSON כמחרוזת)',
  'users (קריאה בלבד): login, full_name, role, active',
  'בכל טבלה גם: updated_at · deleted · deleted_at · deleted_by — השער ממלא אותם.',
].join('\n');

// ── כללי החובה — כמו בטפסים של האפליקציה ──
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const has = (v: unknown) => v != null && String(v).trim() !== '';
async function live(w: Who, t: string, id: unknown, cols: string) {
  if (!has(id)) return null;
  const r = await w.db.from(P + t).select(cols).eq('client_id', String(id)).eq('deleted', false).maybeSingle();
  return r.data || null;
}
const RULES: Record<string, (w: Who, o: Record<string, any>) => Promise<string>> = {
  donors: async (_w, o) => has(o.name) ? '' : 'נא למלא שם',
  pledges: async (w, o) => {
    if (!(await live(w, 'donors', o.donor_client_id, 'client_id'))) return 'הכרטיס לא נמצא';
    if (!has(o.section)) return 'נא לבחור קטגוריה';
    if (!has(o.pledge_type)) return 'נא לבחור סוג';
    if (!has(o.ambassador)) return 'נא לבחור שגריר';
    return o.amount != null && Number(o.amount) < 0 ? 'נא להזין סכום גדול מאפס' : '';
  },
  txns: async (w, o) => {
    const p = await live(w, 'pledges', o.pledge_client_id, 'donor_client_id,ambassador');
    if (!p) return 'ההתחייבות לא נמצאה — תשלום הוא תמיד של התחייבות';
    if (!has(p.ambassador)) return 'להתחייבות אין שגריר — יש לבחור אותו בעריכת ההתחייבות';
    if (String(o.donor_client_id) !== String(p.donor_client_id)) return 'הכרטיס של התשלום — הכרטיס של ההתחייבות';
    if (!(Number(o.amount) > 0)) return 'נא להזין סכום גדול מאפס';
    if (!MONTH.test(String(o.txn_month || ''))) return 'נא לבחור חודש תקין';
    if (o.installments != null && !(Number(o.installments) >= 2 && Number.isInteger(Number(o.installments)))) return 'מספר הפעימות — 2 לפחות';
    if (o.first_installment != null && !(Number(o.first_installment) > 0 && Number(o.first_installment) <= Number(o.amount))) return 'הפעימה הראשונה — חיובית, ולא מעבר לסכום';
    return '';
  },
  plan_items: async (w, o) => {
    if (!(await live(w, 'donors', o.donor_client_id, 'client_id'))) return 'הכרטיס לא נמצא';
    return MONTH.test(String(o.plan_month || '')) ? '' : 'נא לבחור חודש תקין';
  },
  tasks: async (_w, o) => has(o.title) ? '' : 'נא למלא כותרת',
};
async function check(w: Who, t: string, o: Record<string, any>) {
  const why = RULES[t] ? await RULES[t](w, o) : '';
  if (why) throw new Error(why);
}

async function call(w: Who, name: string, a: Record<string, any>) {
  const now = Date.now();
  if (name === 'schema') return SCHEMA;
  if (name === 'query') {
    const t = tbl(a.table, false);
    let q = w.db.from(P + t).select(String(a.select || '*'));
    for (const f of a.filters || []) {
      if (!COL.test(String(f.column)) || !OPS.has(String(f.op))) throw new Error('סינון לא תקין');
      const v = f.op === 'in' ? '(' + (Array.isArray(f.value) ? f.value : [f.value]).map((x: unknown) => JSON.stringify(String(x))).join(',') + ')' : String(f.value);
      q = q.filter(f.column, f.op, v);
    }
    if (!a.include_deleted && t !== 'users') q = q.eq('deleted', false);
    if (t === 'journal') q = q.eq('owner', w.email);
    if (a.order) { const [c, dir] = String(a.order).split('.'); if (COL.test(c)) q = q.order(c, { ascending: dir !== 'desc' }); }
    q = q.limit(Math.min(Math.max(Number(a.limit) || 100, 1), 500));
    const r = await q;
    if (r.error) throw new Error(r.error.message);
    return JSON.stringify({ rows: r.data, count: r.data.length });
  }
  if (name === 'insert') {
    const t = tbl(a.table, true), key = WRITE[t];
    const rows = (Array.isArray(a.rows) ? a.rows : []).map((x: Record<string, unknown>) => {
      const o: Record<string, unknown> = { ...cols(x), updated_at: now, deleted: false };
      if (key === 'client_id' && !o.client_id) o.client_id = crypto.randomUUID();
      if (t === 'journal') o.owner = w.email;
      delete o.deleted_at; delete o.deleted_by;
      return o;
    });
    if (!rows.length) throw new Error('אין רשומות');
    for (const o of rows) await check(w, t, o);
    const r = await w.db.from(P + t).insert(rows).select();
    if (r.error) throw new Error(r.error.message);
    await touch(w, now);
    return JSON.stringify({ inserted: r.data });
  }
  if (name === 'update') {
    const t = tbl(a.table, true), key = WRITE[t];
    const v: Record<string, unknown> = { ...cols(a.values || {}), updated_at: now };
    delete v[key]; delete v.deleted; delete v.deleted_at; delete v.deleted_by; delete v.owner;
    if (RULES[t]) {
      const cur = await w.db.from(P + t).select('*').eq(key, String(a.id)).eq('deleted', false).maybeSingle();
      if (!cur.data) throw new Error('הרשומה לא נמצאה');
      await check(w, t, { ...cur.data, ...v });
    }
    let q = w.db.from(P + t).update(v).eq(key, String(a.id));
    if (t === 'journal') q = q.eq('owner', w.email);
    const r = await q.select();
    if (r.error) throw new Error(r.error.message);
    if (!r.data.length) throw new Error('הרשומה לא נמצאה');
    await touch(w, now);
    return JSON.stringify({ updated: r.data });
  }
  if (name === 'soft_delete') {
    const t = tbl(a.table, true), key = WRITE[t];
    let q = w.db.from(P + t).update({ deleted: true, deleted_at: new Date(now).toISOString(), deleted_by: w.email, updated_at: now }).eq(key, String(a.id));
    if (t === 'journal') q = q.eq('owner', w.email);
    const r = await q.select(key);
    if (r.error) throw new Error(r.error.message);
    if (!r.data.length) throw new Error('הרשומה לא נמצאה');
    await touch(w, now);
    return JSON.stringify({ deleted: r.data });
  }
  throw new Error('כלי לא מוכר: ' + name);
}

const INSTRUCTIONS = [
  'המסד של ' + APP + '. כל פעולה רצה בשם המשתמש המחובר ובהרשאות שלו באפליקציה, ונרשמת ביומן השינויים.',
  'כרטיס תורם: donors · התחייבות: pledges (donor_client_id, section, pledge_type, ambassador חובה) · תשלום: txns (pledge_client_id ו-donor_client_id חובה, txn_month בצורת YYYY-MM חובה) · שורת תכנית: plan_items · יומן עבודה אישי: journal (jday, section, body) · משימות: tasks · רשימות: lookups (kind: section, ptype, method, affiliation, ambassador, domain) · הגדרות: settings.',
  'סכומים מחושבים (נגבה, נותר, סטטוס) אינם נשמרים: נגבה להתחייבות = סכום התשלומים שלה שאינם מחוקים.',
  'כללי עבודה: לפני כל כתיבה — קוראים את המצב הקיים ומציגים למשתמש מה ישתנה · שינוי סכום — רק באישור מפורש · מחיקה — רכה בלבד · כרטיס חדש — שם משפחה ואז שם פרטי · בלי הערות משלך ברשומות.',
].join('\n');

async function handle(w: Who, m: any) {
  const id = m.id;
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result });
  if (m.method === 'initialize') return ok({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'gius-rag', version: '2.0.0' }, instructions: INSTRUCTIONS });
  if (m.method === 'ping') return ok({});
  if (m.method === 'tools/list') return ok({ tools: TOOLS });
  if (m.method === 'tools/call') {
    try { return ok({ content: [{ type: 'text', text: await call(w, String(m.params && m.params.name), (m.params && m.params.arguments) || {}) }] }); }
    catch (e: any) { return ok({ content: [{ type: 'text', text: 'שגיאה: ' + String((e && e.message) || e) }], isError: true }); }
  }
  if (id === undefined || id === null) return null;
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found' } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...H, 'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
  const res = base(req);
  // מטא-דאטה של המשאב המוגן (RFC 9728) — ממנה קלוד מוצא את שרת ההרשאות
  if (new URL(req.url).pathname.endsWith('/.well-known/oauth-protected-resource')) {
    return json({ resource: res, authorization_servers: [URL_ + '/auth/v1'], bearer_methods_supported: ['header'], scopes_supported: ['openid', 'email', 'profile'], resource_name: APP });
  }
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const w = await who(req);
  if (!w) return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer resource_metadata="' + res + '/.well-known/oauth-protected-resource"' });
  let body: any;
  try { body = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handle(w, m)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const r = await handle(w, body);
  return r ? json(r) : new Response(null, { status: 202 });
});
