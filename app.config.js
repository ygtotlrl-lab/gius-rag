// app.config.js — תצורת האפליקציה
self.APP = Object.freeze({
  // ממנו נגזרים ה-scope, קידומת המטמון ושם הפרויקט באנדרואיד
  id: 'gius-rag',
  name: 'גיוס',
  shortName: 'גיוס',
  description: 'גיוס — בית חב״ד רמת אביב ג׳: כרטיסים, התחייבויות, תשלומים, תכנית, יומן עבודה ומשימות.',
  prefix: 'gr_',
  colors: { theme: '#0B55A6', background: '#f3f5fa' },
  // דף האופליין של ה-service worker — הכהה לפי אסימוני הערכה הכהה של האפליקציה
  offline: { light: { bg: '#f3f5fa', ink: '#1b2440' }, dark: { bg: '#10151f', ink: '#e8edf5' } },
  // מפתח anon ציבורי ולא מפתח שירות — ההרשאות נאכפות במסד.
  supabase: {
    url: 'https://bwlsogunthyqwklzkrrd.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bHNvZ3VudGh5cXdrbHprcnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2MDYwNDYsImV4cCI6MjExMTE4MjA0Nn0.x7eRXcz37r6XOJdBRc25iJNaQV0s6BAJrOXZAvzoOAY'
  },
  // הכניסה — חובה, בחשבון Google מתוך רשימת המשתמשים (core/gauth.js); דרכים: google · password
  auth: { required: true, ways: ['google'] },
  android: {
    package: 'com.gius.rag',
    // ממנה נגזר המקור היחיד שגשר השיתוף מקבל
    url: 'https://ygtotlrl-lab.github.io/gius-rag/',
    // משפט שלם ולא שם בלבד — הפועל מתאים למין השם
    offlineLine: 'גיוס לא הצליח להתחבר.',
    // צבע כפתור הניסיון החוזר בדף האופליין של המעטפת
    accent: '#0B55A6',
    // לעולם אינו יורד — בלי קידום המכשיר המותקן אינו מקבל את ה-APK החדש.
    versionCode: 2,
    versionName: '1.0',
    launcherBg: { kind: 'solid', color: '#FFFFFF' },
    // אפליקציות אחרות שקישור intent: רשאי לפתוח — שם ⟵ חבילה; ריק — המעטפת אינה פותחת אף אחת
    launch: {},
    // כפתור «יציאה» שהמעטפת קולטת וסוגרת בו את האפליקציה
    exit: false,
    // ההתראות — FCM במעטפת; google-services.json שב-android/app — של האפליקציה הזו בלבד
    push: true,
    // הכניסה עם Google במעטפת — לקוח ה-Web של פרויקט Google (הקהל של אסימון הזהות); ריק — אין כניסה עם Google
    google: '1083124359240-4umlnm6fic0locuq2tm8m4q6udmbrgdv.apps.googleusercontent.com',
    // גשר השיתוף (FileProvider ו-androidx) וגשר ההדפסה — בכל האפליקציות, אחידים
    share: { chooser: 'שיתוף הקובץ', print: true }
  },
  // sign-apk.sh מסרב לחתום בכל מפתח אחר
  signSha256: '39:D5:CA:F8:FE:2F:B3:9F:68:13:77:ED:22:78:3E:07:F5:2F:65:03:23:F5:1A:66:FC:6F:B7:89:6F:33:B4:58',
  icon: {
    // svg הוא מאסטר גיאומטרי שנקרא ונצבע, ו-master רסטרי הוא ציור שהוקטן — ותואם את סיומת המאסטר.
    art: 'svg',
    master: 'design/icon-master.svg',
    // ריקים ולא נשמטים — המאסטר הגיאומטרי נושא בעצמו את הרקע, הדיו ותיבת הסמל; שדה חסר נקרא לא נשאל.
    ink: null,
    bg: null,
    mark: null,
    bgKey: null,
    keyTol: null,
  }
});
