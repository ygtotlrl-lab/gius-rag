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
    url: 'https://zrftjkghhjhqzopvdzou.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZnRqa2doaGpocXpvcHZkem91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDc4MzQsImV4cCI6MjEwMDg4MzgzNH0.DWcW3o4Y9Is3jGx1frHkrUz7cc045aH1m1uKsrwRhIA'
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
    versionCode: 1,
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
  signSha256: '30:C3:08:38:6B:2E:19:F6:B2:0C:FF:AE:57:4A:3C:9A:DF:13:63:8C:B6:A6:8F:80:E4:8E:88:9F:1D:00:A9:7A',
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
