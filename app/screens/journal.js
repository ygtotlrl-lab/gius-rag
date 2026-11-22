// app/screens/journal.js — יומן העבודה: לכל יום חלון לכל קטגוריה ול«משימות כלליות», ארכיון הימים, ושיתוף כרטיס היום כתמונה
// רשומה לכל יום ולכל חלון (`gr_journal`: jday · section · body); נשמרת בהפסקת הקלדה, וציור המסך אינו דורס שדה שמקלידים בו.
import { esc } from '../../core/ui.js';
import { dayAdd, dayNoon, dayToday } from '../../core/util.js';
import { hebrewDate } from '../../core/hebrew.js';
import { LK_SECTION } from '../constants.js';
import { state } from '../state.js';
import { icon } from '../icons.js';
import { snapShare } from '../snap.js';
import { dmyDate, emptyBox, insert, lookupLabels, update } from '../domain.js';

// «משימות כלליות» — חלון קבוע אחרי הקטגוריות
var JN_GENERAL = 'משימות כלליות';
var JN_DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
var JN_SAVE_MS = 700;

function jnWindows() { return lookupLabels(LK_SECTION).concat([JN_GENERAL]); }
function jnRow(day, sec) {
  for (var i = 0; i < state.journal.length; i++) {
    var r = state.journal[i];
    if (r.jday === day && r.section === sec) return r;
  }
  return null;
}
function jnDayTitle(day) {
  var d = dayNoon(day);
  return 'יום ' + JN_DOW[d.getDay()] + ' · ' + hebrewDate(d);
}
function jnFilled(day) { return state.journal.filter(function (r) { return r.jday === day && String(r.body || '').trim(); }); }

// הארכיון — כל הימים שנכתב בהם, מהחדש; לחיצה פותחת את היום
function jnArchiveHTML() {
  var days = {};
  state.journal.forEach(function (r) { if (String(r.body || '').trim()) days[r.jday] = (days[r.jday] || 0) + 1; });
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
    '<div class="jn-acts">' +
      '<button class="btn" data-act="j-share">' + icon('share') + 'שיתוף כרטיס היום</button>' +
      '<button class="btn ghost" data-act="j-arc" aria-expanded="' + !!state.jArc + '">' + icon('calendar') + 'ארכיון הימים</button>' +
    '</div>' +
  '</section>';
  if (state.jArc) return h + '<section class="card"><h2>ארכיון הימים</h2>' + jnArchiveHTML() + '</section>';
  h += '<div class="jn-grid">' + jnWindows().map(function (sec) {
    var r = jnRow(day, sec), body = r ? r.body || '' : '';
    return '<div class="jn-win' + (sec === JN_GENERAL ? ' gen' : '') + (body.trim() ? ' has' : '') + '">' +
      '<h3>' + icon(sec === JN_GENERAL ? 'tasks' : 'tag') + esc(sec) + '</h3>' +
      '<textarea data-inp="j-body" data-day="' + esc(day) + '" data-sec="' + esc(sec) + '" placeholder="מה פעלו היום…" aria-label="' + esc(sec) + '">' +
        esc(body) + '</textarea></div>';
  }).join('') + '</div>';
  return h;
}

// הכתיבה — בהפסקת הקלדה; שורה ליום ולחלון, ונכתבת רק כשיש מה לכתוב או מה לרוקן
var _jnTimers = {};
function journalBody(el) {
  var day = el.dataset.day, sec = el.dataset.sec, k = day + '|' + sec;
  clearTimeout(_jnTimers[k]);
  _jnTimers[k] = setTimeout(function () {
    var txt = el.value, r = jnRow(day, sec);
    if (r) { if ((r.body || '') !== txt) update('gr_journal', r.client_id, { body: txt }); }
    else if (txt.trim()) insert('gr_journal', { jday: day, section: sec, body: txt });
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
  snapShare('<div class="snap-hd"><small>יומן עבודה · ' + esc(self.APP.shortName || '') + '</small><h2>' + esc(jnDayTitle(day)) + '</h2></div>' +
    '<div class="jn-snap">' + body + '</div>', 'יומן עבודה ' + dmyDate(day));
}

export { journalBody, journalShare, viewJournal };
