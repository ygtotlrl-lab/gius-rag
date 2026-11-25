// app/constants.js — הנתונים: שמות הטבלאות, הרשימות, המחרוזות והקבועים
import { appConfigure } from '../core/util.js';

// ── מסירת התצורה ──
// כאן הנתונים שהליבה קוראת, והחיווט — ב-main.js; הקובץ הזה נטען ראשון, לפני כל קריאה לליבה.
// העידן עולה בשינוי צורת רשומה או מפתחה, ושינוי שם טבלה הוא שינוי כזה — המראה ממופתחת בשם.
// עותק בעידן ישן אינו נדחף — הממתין בו נרשם ביומן, והוא נזרק ונמשך מלא.
var DATA_ERA = 8;

appConfigure({ DATA_ERA: DATA_ERA });

var SUPABASE_URL = self.APP.supabase.url;

var SUPABASE_ANON_KEY = self.APP.supabase.key;

// ── הרשימות — gr_lookups ──
// הרשימה עצמה בטבלה וניתנת לעריכה ולגרירה; dflt — נקודת פתיחה להתקנה טרייה בלבד, והזריעה בפעולת המשתמש הראשונה.
var LK_SECTION = 'section';
var LK_PTYPE = 'ptype';
var LK_METHOD = 'method';
var LK_AFFIL = 'affiliation';
var LK_AMBASSADOR = 'ambassador';
var LK_DOMAIN = 'domain';

var LISTS = [
  // הקטגוריות — התכנית, הדשבורד וחלונות היומן מחולקים לפיהן
  { kind: LK_SECTION, title: 'קטגוריות', one: 'קטגוריה',
    dflt: ['גבירים', 'הו״ק', 'הקדשת התוועדויות שבת', 'עליות לתורה', 'מגביות', 'דינר/קמפיין', 'מרכז החסד', 'תקציבים ועירייה'] },
  { kind: LK_PTYPE, title: 'סוגי התחייבויות', one: 'סוג',
    dflt: ['עליה לתורה', 'פרנס שבת', 'דינר', 'קמפיין', 'זכות החודש', 'ברכת השנה', 'שטר', 'מייסדים', 'זכות השמחה',
           'הוראת קבע', 'מגבית', 'חוב ישן', 'כללי', 'ימים נוראים וחגים', 'קופת צדקה', 'מקווה'] },
  { kind: LK_METHOD, title: 'אמצעי תשלום', one: 'אמצעי',
    dflt: ['העברה בנקאית', 'צ׳ק', 'ביט ופייבוקס', 'מזומן', 'אשראי', 'הו״ק'] },
  { kind: LK_AFFIL, title: 'שייכויות', one: 'שייכות',
    dflt: [] },
  { kind: LK_AMBASSADOR, title: 'שגרירים', one: 'שגריר', dflt: [] },
  { kind: LK_DOMAIN, title: 'תחומי משימות', one: 'תחום',
    dflt: ['כספים', 'שימור תורמים', 'תשתיות', 'יעד יזום'] }
];

// ── המשימות ──
// שלושת האחראים קבועים — אין להם רשימה בהגדרות.
var ASSIGNEES = ['הרב ליפש', 'הרב מישולובין'];

// הצעת הגיוס החודשית לכל קטגוריה — מה שמכוונים לגייס בחודש, בתחתית התכנית
var CAT_SUGGEST = [['גבירים', 10000], ['הו״ק', 500], ['הקדשת התוועדויות שבת', 2000], ['עליות לתורה', 1500],
  ['מגביות', 2000], ['דינר/קמפיין', 2000], ['מרכז החסד', 1000], ['תקציבים ועירייה', 1000]];

var STAGES = [
  { id: 'בעבודה', cls: 'run' },
  { id: 'הושלם', cls: 'done' },
  { id: 'לא רלוונטי', cls: 'off' }
];

// ── התכנית ──
var PLAN_KINDS = ['גבייה', 'התרמה'];

// ── ההלוואות ──
// בסדר הטיפול — מה שמחכה לפעולה ראשון, ומה שנמסר בסוף; זה גם סדר המיון לפי סטטוס.

// ── הפתקים — צבעי הרקע ──
var NOTE_COLORS = ['sand', 'terra', 'sage', 'sky', 'rose', 'plum'];


// ── הניווט ──
// ארבעה ראשיים ו«עוד» — והמשניים בלוח שנפתח מלמטה. ic — שם אייקון מהסט שב-app/icons.js.
var TABS = [
  { id: 'dash', ic: 'dash', label: 'דשבורד' },
  { id: 'cards', ic: 'cards', label: 'כרטיסים', title: 'כרטיסים ותשלומים' },
  { id: 'plan', ic: 'plan', label: 'תכנית' },
  { id: 'journal', ic: 'journal', label: 'יומן', title: 'יומן עבודה' }
];

var MORE = [
  { id: 'tasks', ic: 'tasks', label: 'משימות' },
  { id: 'notes', ic: 'notes', label: 'פתקים' },
  { id: 'settings', ic: 'settings', label: 'הגדרות' }
];

// ── הודעות פר-אפליקציה ──
var MSG_MAYBE_STALE = ') — המוצג עלול להיות לא מעודכן';
// החודש הראשון של האפליקציה — המעבר מהגיליון; הגרפים מתחילים בו, ומה שלפניו אינו נתון של הדשבורד.
var APP_FIRST_MONTH = '2026-11';
var MSG_NEED_NAME = 'נא למלא שם';
var MSG_PICK_DATE = 'בוחרים תאריך — עברי או לועזי';
// סוג ההלוואה — לפי ההחזר: בתשלומים (תשלום חודשי — צ׳ק, העברה או מלגה; ההחזר — הוצאה של התקציב) או לטווח ארוך (מועד החזר אחד, ונספר במדד החוב); בלי סוג — «לא מסווג».
// שמות החודשים המקוצרים — בתוויות הגרפים (הדשבורד וההלוואות).
var MONTH_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
var LOAN_KINDS = { checks: 'החזר בתשלומים', long: 'החזר לטווח ארוך' };
var MSG_CK_COUNT = 'נא להזין את מספר התשלומים';
var MSG_CK_AMT = 'נא להזין סכום לכל תשלום';
var MSG_CK_FIRST = 'נא לבחור את חודש התשלום הראשון';
var MSG_LOAN_KIND = 'נא לבחור את סוג ההחזר';
var MSG_CK_SUM_PRE = 'סך התשלומים פחות מסכום ההלוואה: ';
var MSG_NEED_TITLE = 'נא למלא כותרת';
var MSG_NEED_VALUE = 'נא להזין ערך';
var MSG_VALUE_EXISTS = 'הערך כבר קיים ברשימה';
var MSG_PICK_DONOR = 'נא לבחור כרטיס';
var MSG_PICK_TYPE = 'נא לבחור סוג';
var MSG_PICK_AMB = 'נא לבחור שגריר';
var MSG_PICK_SEC = 'נא לבחור קטגוריה';
var MSG_PLEDGE_NO_AMB = 'להתחייבות אין שגריר — יש לבחור אותו בעריכת ההתחייבות';
var MSG_AMOUNT_POSITIVE = 'נא להזין סכום גדול מאפס';
var MSG_SO_COUNT = 'מספר הפעימות — 2 לפחות';
var MSG_SO_FIRST = 'הפעימה הראשונה — סכום חיובי';
var MSG_SO_FIRST_OVER = 'הפעימה הראשונה גדולה מהסכום הכולל';
// האמצעי שפותח את הפעימות — שורה ברשימת האמצעים, והתשלום עצמו מסווג לפי installments ולא לפי התווית.
var METHOD_SO = 'הו״ק';
var MSG_NEED_DATE = 'נא לבחור תאריך';
var MSG_PICK_VALID_MONTH = 'נא לבחור חודש תקין';
var MSG_DONOR_CREATED = 'הכרטיס נוצר';
var DONOR_NEW_LABEL = '＋ כרטיס חדש';
var DONOR_NO_PHONE = 'ללא טלפון';
var MSG_DELETE_ACT = 'מחיקה';
var MSG_DEL_SOFT = ' המחיקה רכה וניתנת לשחזור במסד.';
var MSG_DEL_DONOR = 'למחוק את הכרטיס? ההתחייבויות, התשלומים ושורות התכנית שלו יימחקו איתו.';
var MSG_DEL_PLEDGE = 'למחוק את ההתחייבות? התשלומים שלה יימחקו איתה.';
var MSG_DEL_PAY = 'למחוק את התשלום?';
var MSG_DEL_PLAN = 'למחוק את השורה מהתכנית?';
var MSG_DEL_TASK = 'למחוק את המשימה?';
var MSG_DEL_NOTE = 'למחוק את הפתק?';
var MSG_DEL_LOOKUP = 'להסיר את הערך מהרשימה? רשומות שכבר משתמשות בו יישארו כמות שהן.';
var MSG_MONTH_GOAL = 'יעד חודשי';

// ── עמידות אחסון מקומי ──
var KV_TABLE = 'gr_settings';

// ── PUSH_CFG ──
// הסדר שומר על המפתח הזר — כרטיסים לפני התחייבויות ושורות תכנית, התחייבויות לפני תשלומים, והלוואות לפני תנועותיהן;
var PUSH_TABLES = ['gr_donors', 'gr_pledges', 'gr_txns', 'gr_plan_items', 'gr_tasks', 'gr_targets',
                   'gr_notes', KV_TABLE, 'gr_lookups', 'gr_journal'];

// strip — עמודות שאינן נשמרות במראה; אין היום עמודה כזו, והמנגנון נשאר דרוך לסוד עתידי.
// אין כאן סדר תצוגה — המיון של כל רשומה בפונקציה אחת בתחום.
var TABLES = [
  { t: 'gr_donors',       key: 'client_id', soft: true },
  { t: 'gr_pledges',      key: 'client_id', soft: true },
  { t: 'gr_txns',         key: 'client_id', soft: true },
  { t: 'gr_plan_items',   key: 'client_id', soft: true },
  { t: 'gr_tasks',        key: 'client_id', soft: true },
  { t: 'gr_targets',      key: 'client_id', soft: true },
  { t: 'gr_notes',        key: 'client_id', soft: true },
  { t: KV_TABLE,         key: 'key',       soft: false },
  { t: 'gr_lookups',      key: 'client_id', soft: true },
  { t: 'gr_journal',      key: 'client_id', soft: true }
];

var EPS = 0.005;


// כותרות החלונות והודעות השמירה — מחרוזת למשתמש היא קבוע.
var TTL_MORE = 'עוד';
var TTL_EDIT_PRE = 'עריכת ';
var TTL_ADD_PRE = 'הוספת ';
var TTL_GOAL_YEAR = 'יעד שנתי';
var TTL_GOAL_DEFAULT = 'יעד חודשי קבוע';
var TTL_DONOR_EDIT = 'עריכת כרטיס';
var TTL_DONOR_NEW = 'כרטיס חדש';
var TTL_PLEDGE_EDIT = 'עריכת התחייבות — ';
var TTL_PLEDGE_NEW = 'התחייבות — ';
var TTL_PAY_EDIT = 'עריכת תשלום — ';
var TTL_PAY_NEW = 'תשלום — ';
var TTL_PLAN_EDIT = 'עריכת שורה';
var TTL_PLAN_NEW = 'שורה חדשה — ';
var TTL_TASK_EDIT = 'עריכת משימה';
var TTL_TASK_NEW = 'משימה חדשה';
var MSG_SAVE_ACT = 'שמירה';
var MSG_DELETED = 'נמחק';
var MSG_SAVED_OK = 'נשמר';
var MSG_TASK_SAVED = 'המשימה נשמרה';
var MSG_REMOVED = 'הוסר';
var MSG_GOAL_SAVED = 'היעד נשמר';
var MSG_GOAL_RESET = 'החודש חזר ליעד הקבוע';
var MSG_GOAL_DEFAULT_SAVED = 'היעד הקבוע נשמר';

export { CAT_SUGGEST, ASSIGNEES, DONOR_NEW_LABEL, DONOR_NO_PHONE, EPS, KV_TABLE, LISTS, LK_AFFIL, LK_AMBASSADOR,
         LK_DOMAIN, LK_METHOD, LK_PTYPE, LK_SECTION, MORE,
         METHOD_SO, MSG_AMOUNT_POSITIVE, MSG_SO_COUNT, MSG_SO_FIRST, MSG_SO_FIRST_OVER, MSG_DELETE_ACT, MSG_DEL_DONOR,
         MSG_DEL_LOOKUP, MSG_DEL_NOTE, MSG_DEL_PAY, MSG_DEL_PLAN, MSG_DEL_PLEDGE, MSG_DEL_SOFT,
         MSG_DEL_TASK, MSG_DONOR_CREATED, MSG_MAYBE_STALE, MSG_MONTH_GOAL, MSG_NEED_DATE,
         APP_FIRST_MONTH, MSG_PICK_DATE, MSG_NEED_NAME, LOAN_KINDS, MONTH_SHORT, MSG_CK_AMT, MSG_CK_COUNT, MSG_CK_FIRST, MSG_CK_SUM_PRE, MSG_LOAN_KIND, MSG_NEED_TITLE, MSG_NEED_VALUE, MSG_PICK_AMB, MSG_PICK_DONOR, MSG_PICK_SEC,
         MSG_PICK_TYPE, MSG_PLEDGE_NO_AMB, MSG_PICK_VALID_MONTH, MSG_VALUE_EXISTS, NOTE_COLORS, PLAN_KINDS,
         PUSH_TABLES, STAGES, SUPABASE_ANON_KEY, SUPABASE_URL, TABLES, TABS,
         TTL_MORE, TTL_EDIT_PRE, TTL_ADD_PRE, TTL_GOAL_DEFAULT, TTL_GOAL_YEAR, TTL_DONOR_EDIT, TTL_DONOR_NEW, TTL_PLEDGE_EDIT, TTL_PLEDGE_NEW, TTL_PAY_EDIT, TTL_PAY_NEW, TTL_PLAN_EDIT, TTL_PLAN_NEW, TTL_TASK_EDIT, TTL_TASK_NEW, MSG_SAVE_ACT, MSG_DELETED, MSG_SAVED_OK, MSG_TASK_SAVED, MSG_REMOVED, MSG_GOAL_SAVED, MSG_GOAL_RESET, MSG_GOAL_DEFAULT_SAVED };
