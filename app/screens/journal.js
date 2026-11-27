// app/screens/journal.js — יומן העבודה: לכל יום חלון לכל קטגוריה ול«משימות כלליות», ארכיון הימים, ושיתוף כרטיס היום כתמונה
// רשומה לכל משתמש, יום וחלון (`gr_journal`: owner · jday · section · body); נשמרת בהפסקת הקלדה, וציור המסך אינו דורס שדה שמקלידים בו.
// היומן אישי — כל משתמש רואה וכותב את שלו (`owner` = המייל שנכנס בו), והחלונות שלו — מ-`journal_sections` שבהגדרות, ובלעדיו הקטגוריות.
// המנהל — בורר «היומן של»: היומן של כל משתמש, לקריאה בלבד (`state.jWho`); הכתיבה — רק ביומן של עצמו.
import { esc } from '../../core/ui.js';
import { gauthIsAdmin, gauthUser } from '../../core/gauth.js';
import { dayAdd, dayNoon, dayToday } from '../../core/util.js';
import { hebrewDate } from '../../core/hebrew.js';
import { LK_SECTION } from '../constants.js';
import { state } from '../state.js';
import { icon } from '../icons.js';
import { snapShare } from '../../core/snap.js';
import { assigneeList, dmyDate, emptyBox, insert, lookupLabels, settingJson, update } from '../domain.js';

// «משימות כלליות» — חלון קבוע אחרי הקטגוריות
var JN_GENERAL = 'משימות כלליות';
var JN_DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
var JN_SAVE_MS = 700;

function jnMe() { var u = gauthUser(); return String(u && u.login || '').toLowerCase(); }
// של מי היומן שעל המסך — המנהל בוחר, וכל השאר — רק שלו
function jnWho() { return (gauthIsAdmin() && state.jWho) || jnMe(); }
function jnMine() { return jnWho() === jnMe(); }
function jnRows() { var who = jnWho(); return state.journal.filter(function (r) { return String(r.owner || '').toLowerCase() === who; }); }
// הבורר — האחראים שבהגדרות (בשמם), ומי שכתב ביומן ואינו ביניהם (במייל); «היומן שלי» ראשון
function jnPeople() {
  var me = jnMe(), seen = {}, out = [{ login: me, name: 'היומן שלי' }];
  seen[me] = 1;
  assigneeList().forEach(function (a) {
    var l = String(a.login || '').toLowerCase();
    if (l && !seen[l]) { seen[l] = 1; out.push({ login: l, name: a.name || l }); }
  });
  state.journal.forEach(function (r) {
    var l = String(r.owner || '').toLowerCase();
    if (l && !seen[l] && !r.deleted) { seen[l] = 1; out.push({ login: l, name: l }); }
  });
  return out;
}
function jnWhoName() {
  var w = jnWho(), p = jnPeople().filter(function (x) { return x.login === w; })[0];
  return p && !jnMine() ? p.name : '';
}
function jnWindows() {
  var own = settingJson('journal_sections', {})[jnWho()];
  return Array.isArray(own) && own.length ? own : lookupLabels(LK_SECTION).concat([JN_GENERAL]);
}
function jnRow(day, sec) {
  var rows = jnRows();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.jday === day && r.section === sec) return r;
  }
  return null;
}
function jnDayTitle(day) {
  var d = dayNoon(day);
  return 'יום ' + JN_DOW[d.getDay()] + ' · ' + hebrewDate(d);
}
function jnFilled(day) { return jnRows().filter(function (r) { return r.jday === day && String(r.body || '').trim(); }); }

// הארכיון — כל הימים שנכתב בהם, מהחדש; לחיצה פותחת את היום
function jnArchiveHTML() {
  var days = {};
  jnRows().forEach(function (r) { if (String(r.body || '').trim()) days[r.jday] = (days[r.jday] || 0) + 1; });
  var list = Object.keys(days).sort().reverse();
  if (!list.length) return emptyBox('journal', 'עוד לא נכתב ביומן');
  return '<div class="jn-arc">' + list.map(function (d) {
    return '<button class="jn-day" data-act="j-day" data-day="' + esc(d) + '"><b>' + esc(jnDayTitle(d)) + '</b>' +
      '<small>' + esc(dmyDate(d)) + '</small><span class="cnt">' + days[d] + '</span></button>';
  }).join('') + '</div>';
}

function viewJournal() {
  var day = state.jDay || dayToday(), today = dayToday();
  var h = '<section class="card">' +
    '<div class="jn-nav">' +
      '<button class="btn ghost sm ic" data-act="j-day" data-day="' + esc(dayAdd(day, -1)) + '" aria-label="היום הקודם">' + icon('prev') + '</button>' +
      '<b>' + esc(jnDayTitle(day)) + '<small>' + esc(dmyDate(day) + (day === today ? ' · היום' : '')) + '</small></b>' +
      '<button class="btn ghost sm ic" data-act="j-day" data-day="' + esc(dayAdd(day, 1)) + '" aria-label="היום הבא"' + (day >= today ? ' disabled' : '') + '>' + icon('next') + '</button>' +
    '</div>' +
    // שיתוף וארכיון — כפתורים קטנים ועדינים מתחת לתאריך, ולא שני כפתורים גדולים
    (gauthIsAdmin() ? '<label class="jn-who"><span>היומן של</span><select class="inp" data-chg="j-who" aria-label="היומן של">' +
      jnPeople().map(function (p) {
        return '<option value="' + esc(p.login) + '"' + (p.login === jnWho() ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('') + '</select></label>' : '') +
    '<div class="jn-acts">' +
      '<button class="jn-act" data-act="j-share">' + icon('share') + 'שיתוף היום</button>' +
      '<button class="jn-act' + (state.jArc ? ' on' : '') + '" data-act="j-arc" aria-expanded="' + !!state.jArc + '">' + icon('calendar') + 'ארכיון הימים</button>' +
    '</div>' +
  '</section>';
  if (state.jArc) return h + '<section class="card"><h2>ארכיון הימים</h2>' + jnArchiveHTML() + '</section>';
  // רכיב אחד ארוך — לכל קטגוריה כותרת ושדה טקסט, בקו דק ביניהן, ולא חלון נפרד לכל אחת
  h += '<section class="card jn-book">' + jnWindows().map(function (sec) {
    var r = jnRow(day, sec), body = r ? r.body || '' : '';
    var gen = sec === JN_GENERAL || sec.indexOf('משימות') === 0;
    return '<div class="jn-win' + (gen ? ' gen' : '') + (body.trim() ? ' has' : '') + '">' +
      '<h3>' + icon(gen ? 'tasks' : 'tag') + esc(sec) + '</h3>' +
      '<textarea data-inp="j-body" data-day="' + esc(day) + '" data-sec="' + esc(sec) + '"' +
        (jnMine() ? ' placeholder="טקסט חופשי…"' : ' readonly placeholder="לא נכתב"') + ' aria-label="' + esc(sec) + '">' +
        esc(body) + '</textarea></div>';
  }).join('') + '</section>';
  return h;
}

// הכתיבה — בהפסקת הקלדה; שורה ליום ולחלון, ונכתבת רק כשיש מה לכתוב או מה לרוקן
var _jnTimers = {};
function journalBody(el) {
  var day = el.dataset.day, sec = el.dataset.sec, k = day + '|' + sec;
  clearTimeout(_jnTimers[k]);
  _jnTimers[k] = setTimeout(function () {
    if (!jnMine()) return;
    var txt = el.value, r = jnRow(day, sec);
    if (r) { if ((r.body || '') !== txt) update('gr_journal', r.client_id, { body: txt }); }
    else if (txt.trim() && jnMe()) insert('gr_journal', { owner: jnMe(), jday: day, section: sec, body: txt });
    var win = el.closest('.jn-win');
    if (win) win.classList.toggle('has', !!txt.trim());
  }, JN_SAVE_MS);
}

// כרטיס היום כתמונה — הכותרת, ורק החלונות שנכתב בהם
function journalShare(day) {
  day = day || dayToday();
  var rows = jnFilled(day);
  var order = jnWindows();
  rows.sort(function (a, b) { return order.indexOf(a.section) - order.indexOf(b.section); });
  var body = rows.length ? rows.map(function (r) {
    return '<h3>' + esc(r.section) + '</h3><p>' + esc(String(r.body).trim()) + '</p>';
  }).join('') : '<p>לא נכתב היום ביומן</p>';
  var who = jnWhoName();
  snapShare('<div class="snap-hd"><small>יומן עבודה · ' + esc(self.APP.shortName || '') + (who ? ' · ' + esc(who) : '') + '</small><h2>' + esc(jnDayTitle(day)) + '</h2></div>' +
    '<div class="jn-snap">' + body + '</div>', 'יומן עבודה ' + (who ? who + ' ' : '') + dmyDate(day));
}

export { journalBody, journalShare, viewJournal };
