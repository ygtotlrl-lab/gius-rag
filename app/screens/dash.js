// app/screens/dash.js — לוח הבקרה: קריאה בלבד, והכל נגזר מהתשלומים
import { esc, methodIcon, receiptHTML } from '../../core/ui.js';
import { stIcon } from '../../core/icons.js';
import { bar } from '../../core/chart.js';
import { pendTag } from '../../core/sync.js';
import { APP_FIRST_MONTH, MONTH_SHORT, STAGES } from '../constants.js';
import { state } from '../state.js';
import { icon } from '../icons.js';
import { dayToday } from '../../core/util.js';
import { donorName, emptyBox, gSortGroups, gSortTxns, ils, monthAmount, monthLabel, monthTxnsInit,
         assigneeNames, pendRowKey, pledgeById, shiftMonth, sum, targetFor, targetYear, txnSoLabel, txnWhen } from '../domain.js';

// הסף בהודעת המומנטום הוא «גדול או שווה» — «גדול» משנה בשקט את ההודעה בקצה הטווח.
function momentumMsg(pct) {
  if (pct >= 100) return momentumHTML('trophy', 'עמדנו ביעד!');
  if (pct >= 75) return momentumHTML('medal1', 'כמעט שם — דחיפה אחרונה!');
  if (pct >= 50) return momentumHTML('medal2', 'מעל המחצית — ממשיכים!');
  if (pct >= 25) return momentumHTML('medal3', 'רבע דרך — מומנטום!');
  return momentumHTML('star', 'מתחילים!');
}
function momentumHTML(ic, text) { return stIcon(icon(ic)) + esc(text); }

// מד בחצי עיגול שמתמלא מימין לשמאל, כיוון הקריאה; במרכזו הנגבה בלבד, בצבע שלב ההתקדמות.
// מעל 100% הקשת נשארת מלאה.
var GAUGE_LEN = Math.PI * 170;
function stageCls(pct) { return pct >= 100 ? 'st-done' : pct >= 50 ? 'st-mid' : pct >= 25 ? 'st-low' : 'st-start'; }
function gaugeHTML(collected, pct) {
  var fill = GAUGE_LEN * Math.max(0, Math.min(100, pct)) / 100;
  var arc = 'M370,200 A170,170 0 0 0 30,200';
  return '<div class="gauge">' +
    '<svg viewBox="0 0 400 220" aria-hidden="true">' +
      '<path class="bg" d="' + arc + '"></path>' +
      (fill > 0 ? '<path class="fg" d="' + arc + '" stroke-dasharray="' + fill.toFixed(1) + ' ' + GAUGE_LEN.toFixed(1) + '"></path>' : '') +
    '</svg>' +
    '<b class="gauge-val ' + stageCls(pct) + '">' + ils(collected) + '</b>' +
  '</div>';
}

// שורה ברשימה שליד המד — אייקון בעיגול, התווית מעל והערך מתחתיה.
function gStat(ic, lab, val) {
  return '<div><span class="g-ic">' + icon(ic) + '</span><span class="g-txt"><dt>' + esc(lab) + '</dt><dd>' + esc(val) + '</dd></span></div>';
}

// הסעיף והשגריר של תשלום — מההתחייבות שהוא נזקף אליה; התשלום עצמו אינו נושא אותם.
function groupBy(list, pick, fallback, m) {
  var map = {}, order = [];
  list.forEach(function (t) {
    var k = String(pick(t) || '').trim() || fallback;
    if (!map[k]) { map[k] = { key: k, total: 0, count: 0 }; order.push(k); }
    map[k].total += monthAmount(t, m);
    map[k].count++;
  });
  return gSortGroups(order.map(function (k) { return map[k]; }));
}

function pledgeField(t, f) { var p = pledgeById(t.pledge_client_id); return p ? p[f] : ''; }

// אייקון לקטגוריה — לפי מילה בשם, כמו אמצעי התשלום; קטגוריה שאינה מוכרת — תגית.
var SECTION_ICONS = [[/מגבי/, 'megaphone'], [/גביר/, 'star'], [/דינר|קמפיין/, 'coins'], [/חסד/, 'heart'],
  [/תקציב|עירי/, 'building'], [/התוועדו|שבת|עליו?ת/, 'calendar'], [/הוראו?ת קבע|הו״ק/, 'repeat']];
function sectionIcon(name) {
  for (var i = 0; i < SECTION_ICONS.length; i++) if (SECTION_ICONS[i][0].test(name || '')) return SECTION_ICONS[i][1];
  return 'tag';
}

// שורה רזה אחת: (אייקון) שם · פס · אחוז · סכום — עמודות משותפות, והפסים מתחילים ונגמרים באותו קו.
function breakdownHTML(rows, total, withIcon) {
  if (!rows.length) return emptyBox('dash', 'אין תשלומים בחודש זה');
  return '<div class="brk">' + rows.map(function (r) {
    var share = total > 0 ? r.total / total * 100 : 0;
    return '<div class="brk-row"><span class="brk-lab">' +
      (withIcon ? '<span class="brk-ic">' + icon(sectionIcon(r.key)) + '</span>' : '') +
      '<b>' + esc(r.key) + '</b></span>' +
      '<span class="brk-bar">' + bar(share.toFixed(1)) + '</span>' +
      '<span class="brk-pct">' + share.toFixed(0) + '%</span>' +
      '<b class="brk-val">' + ils(r.total) + '</b></div>';
  }).join('') + '</div>';
}

// המשימות בעבודה לכל אחראי — השם, ובצד השמאלי המספר בלבד; מנותב למסך המשימות.
function tasksHTML() {
  var st = STAGES[0].id;
  return '<div class="who-grid">' + assigneeNames().map(function (who) {
    var n = state.tasks.filter(function (t) { return t.assignee === who && t.stage === st; }).length;
    return '<button class="who-card" data-act="dash-who" data-who="' + esc(who) + '">' +
      '<span class="who-main"><b>' + esc(who) + '</b></span>' +
      '<span class="who-total" aria-label="' + n + ' משימות ' + esc(st) + '">' + n + '</span></button>';
  }).join('') + '</div>';
}

// ── השנה ──
// הטווח — מינואר של השנה המוצגת ועד החודש המוצג (ולא אחרי החודש של היום)
function yearMonths(m) {
  var now = dayToday().slice(0, 7), end = m < now ? m : now, out = [], k = m.slice(0, 4) + '-01';
  while (k <= end && out.length < 12) { if (k >= APP_FIRST_MONTH) out.push(k); k = shiftMonth(k, 1); }
  return out;
}
function kShort(v) { return v >= 1e6 ? (Math.round(v / 1e5) / 10) + 'M' : v >= 1000 ? (Math.round(v / 100) / 10) + 'K' : String(Math.round(v)); }
// היעד השנתי — מה שנגבה מתחילת השנה מול יעד השנה, פס ההתקדמות, ועמודה לכל חודש מול היעד החודשי
function yearHTML(m) {
  var ms = yearMonths(m), goal = targetYear();
  var rows = ms.map(function (k) { return { m: k, v: sum(monthTxnsInit(k), function (t) { return monthAmount(t, k); }), t: targetFor(k) }; });
  var got = sum(rows, function (r) { return r.v; }), pct = goal > 0 ? got / goal * 100 : 0;
  var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.v, r.t); }).concat([1]));
  return '<section class="card yr"><h2>היעד השנתי · ' + esc(m.slice(0, 4)) + '</h2>' +
    '<div class="yr-head"><b class="' + stageCls(pct) + '">' + ils(got) + '</b><span>מתוך ' + (goal > 0 ? ils(goal) : 'יעד שלא הוגדר') + '</span>' +
      (goal > 0 ? '<span class="yr-pct">' + Math.round(pct) + '%</span>' : '') + '</div>' +
    (goal > 0 ? '<div class="yr-bar">' + bar(Math.min(100, pct).toFixed(1)) + '</div><small class="yr-left">' +
      (got >= goal ? 'היעד השנתי הושג!' : 'נותרו ' + ils(goal - got)) + '</small>' : '') +
    (rows.length ? '<div class="yr-cols">' + rows.map(function (r) {
      var p = r.m.split('-');
      return '<div class="yr-col" title="' + esc(monthLabel(r.m) + ' · ' + ils(r.v)) + '"><span class="yr-v">' + esc(kShort(r.v)) + '</span>' +
        '<span class="yr-plot">' + (r.t > 0 ? '<i class="yr-tgt" style="--v:' + (r.t / max).toFixed(3) + '"></i>' : '') +
        '<span class="yr-fill ' + stageCls(r.t > 0 ? r.v / r.t * 100 : 0) + '" style="--v:' + (r.v / max).toFixed(3) + '"></span></span>' +
        '<span class="yr-lab">' + esc(MONTH_SHORT[+p[1] - 1]) + '</span></div>';
    }).join('') + '</div>' : '') +
    complyHTML(rows) +
  '</section>';
}

// עמידה ביעד — ממוצע החודשים שחלפו בשנה (עד לפני החודש של היום) מול ממוצע היעד שלהם; מתעדכן בסוף כל חודש
// כרטיס קטן: כותרת ותגית מצב · שלושה מספרים (ממוצע · יעד · עמידה) · פס · ושורת הסבר
function complyHTML(rows) {
  var now = dayToday().slice(0, 7);
  var past = rows.filter(function (r) { return r.m < now; });
  var hd = function (cls, chip) {
    return '<div class="yc-hd"><span class="yc-ic">' + icon('target') + '</span><b>עמידה ביעד</b>' + (chip ? '<span class="yc-chip ' + cls + '">' + esc(chip) + '</span>' : '') + '</div>';
  };
  if (!past.length) return '<div class="yr-comply none">' + hd('', '') +
    '<small class="yc-note">תחושב בסוף ' + esc(monthLabel(now)) + ' — ממוצע החודשים שחלפו מול היעד החודשי</small></div>';
  var avg = sum(past, function (r) { return r.v; }) / past.length, tgt = sum(past, function (r) { return r.t; }) / past.length;
  if (!(tgt > 0)) return '';
  var pct = avg / tgt * 100, ok = pct >= 100, cls = ok ? 'ok' : 'bad';
  var num = function (lab, val, c) { return '<div class="yc-n"><small>' + esc(lab) + '</small><b' + (c ? ' class="' + c + '"' : '') + '>' + esc(val) + '</b></div>'; };
  return '<div class="yr-comply">' + hd(cls, ok ? 'עומדים ביעד' : 'מתחת ליעד') +
    '<div class="yc-nums">' + num('ממוצע לחודש', ils(Math.round(avg)), cls) + num('יעד לחודש', ils(Math.round(tgt))) + num('עמידה', Math.round(pct) + '%', cls) + '</div>' +
    '<div class="yc-bar"><i class="' + cls + '" style="width:' + Math.min(100, pct).toFixed(1) + '%"></i></div>' +
    '<small class="yc-note">לפי ' + (past.length === 1 ? 'החודש שחלף' : past.length + ' החודשים שחלפו') + ' השנה · מתעדכן בסוף כל חודש</small></div>';
}

function viewDash() {
  var m = state.month;
  var txns = monthTxnsInit(m);
  var collected = sum(txns, function (t) { return monthAmount(t, m); });
  var target = targetFor(m);
  var remaining = Math.max(0, target - collected);
  var pct = target > 0 ? collected / target * 100 : 0;

  var h = '<section class="card">' +
    '<div class="monthnav">' +
      '<button class="btn ghost sm ic" data-act="month" data-d="-1" aria-label="חודש קודם"' + (m <= APP_FIRST_MONTH ? ' disabled' : '') + '>' + icon('prev') + '</button>' +
      '<b>' + esc(monthLabel(m)) + '</b>' +
      '<button class="btn ghost sm ic" data-act="month" data-d="1" aria-label="חודש הבא">' + icon('next') + '</button>' +
    '</div>' +
    '<div class="gauge-row">' + gaugeHTML(collected, target > 0 ? pct : 0) +
      '<dl class="g-list">' +
        gStat('dash', 'אחוזים', target > 0 ? Math.round(pct) + '%' : '—') +
        gStat('target', 'יעד', target > 0 ? ils(target) : 'לא הוגדר') +
        gStat('wait', 'סכום שנותר', target > 0 ? ils(remaining) : '—') +
        gStat('cash', 'מספר תשלומים', String(txns.length)) +
      '</dl>' +
    '</div>' +
    '<div class="momentum">' + momentumMsg(target > 0 ? pct : 0) + '</div>' +
  '</section>';

  h += yearHTML(m);

  // הפילוח — לפי הקטגוריה של ההתחייבות (אין פילוח שגרירים: התכנית והדשבורד לפי הקטגוריות)
  h += '<section class="card"><h2>פילוח קטגוריות</h2>' +
      breakdownHTML(groupBy(txns, function (t) { return pledgeField(t, 'section'); }, 'ללא קטגוריה', m), collected, true) +
    '</section>';

  h += '<section class="card"><h2>משימות בעבודה</h2>' + tasksHTML() + '</section>';

  // תשלום שלא סומן «סליקה בפועל» — שקוף מעט; הוא נספר בנגבה כמו כל תשלום.
  // שלושה אחרונים, והשאר בלחיצה — הרשימה המלאה ארוכה מדי לראש הלוח.
  var list = gSortTxns(txns), shown = state.dashPayAll ? list : list.slice(0, 3);
  h += '<section class="card"><h2>תשלומי החודש<span class="cnt">' + list.length + '</span></h2>';
  if (!list.length) h += emptyBox('cash', 'אין תשלומים בחודש זה');
  else {
    // «קבלה» — רכיב הליבה: קבוצה לכל יום (התאריך של התשלום, ובלעדיו החודש); מה שטרם נסלק — מקווקו והסכום אפור.
    h += receiptHTML(shown.map(function (t) {
      var p = pledgeById(t.pledge_client_id);
      return { day: t.txn_month === m ? txnWhen(t) : monthLabel(m), amt: ils(monthAmount(t, m)), method: t.method || '', ico: icon(methodIcon(t.method)),
        who: '<b>' + esc(donorName(t.donor_client_id)) + pendTag(pendRowKey('gr_txns', t.client_id)) + '</b>' +
          '<small>' + esc((p && (p.pledge_type || p.section)) || '—') + (txnSoLabel(t) ? ' · ' + esc(txnSoLabel(t)) : '') + '</small>',
        dashed: !t.cleared, muted: !t.cleared, title: t.cleared ? '' : 'טרם נסלק', act: 'card-go', id: t.donor_client_id };
    }));
  }
  if (list.length > 3) h += '<button class="btn ghost pay-more" data-act="dash-pay-all" aria-expanded="' + (state.dashPayAll ? 'true' : 'false') + '">' +
    (state.dashPayAll ? 'הצג פחות' + icon('up') : 'הצג את כל ' + list.length + ' התשלומים' + icon('down')) + '</button>';
  h += '</section>';
  return h;
}

export { sectionIcon, viewDash };
