// Web equivalent of Hovalot's src/context/AuthContext.tsx — same Firestore
// `users/{uid}` shape, same phone-verification semantics (secondary step on an
// already-signed-in user, not a login method), so the mobile app's admin/driver
// screens read web-created accounts with no changes on their side.
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile as fbUpdateProfile, sendEmailVerification,
  RecaptchaVerifier, PhoneAuthProvider, updatePhoneNumber,
  GoogleAuthProvider, OAuthProvider, signInWithPopup,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword as fbUpdatePassword,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { auth, db } from './firebase.js';
import { TERMS_VERSION } from './legal.js';

// NOTE on how this reaches verify-redirect.html: the Firebase Console has a custom
// email-action URL configured to that page (confirmed by the app's own code — it reads
// mode/oobCode/apiKey directly off its own query string, which only happens when a
// project has a custom action URL, not Firebase's default hosted confirmation page).
// That means `url` here does NOT become verify-redirect.html's own query string —
// it arrives there as a `continueUrl` param instead. The app's identical flow sets
// `url` to verify-redirect.html itself (self-referential, not a useful signal), so
// pointing this at app/account.html is what lets verify-redirect.html tell "came from
// the website" apart from "came from the app" and redirect accordingly after success.
const EMAIL_VERIFICATION_SETTINGS = { url: 'https://rozicmove.com/app/account.html' };

export function generateReferralCode(uid) {
  return `ROZIC-${uid.slice(0, 6).toUpperCase()}`;
}

/**
 * מראה `INVISIBLE`/`cleanName`/`isValidFullName`/`FULL_NAME_ERROR` ב-
 * Hovalot's src/utils/validation.ts. **לא קישוט נגישות — מניעת כשל תשלום
 * אמיתי:** Grow דוחה `fullName` שהוא מילה אחת בלבד (תקרית ייצור אמיתית,
 * ראו הערת המקור), ותווים חסרי רוחב/מסמני כיווניות עוברים `.trim()` רגיל
 * ומייצרים שם שנראה ריק (או הפוך) בכל מסך שמציג אותו. אותה בדיקה בדיוק,
 * כדי שהאתר לא ישחזר את התקרית שכבר נמצאה ותוקנה באפליקציה.
 */
const INVISIBLE = /[​-‏‪-‮⁠-⁯﻿]/g;

export function cleanName(name) {
  return String(name ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
}

export function isValidFullName(name) {
  return cleanName(name).split(' ').filter(Boolean).length >= 2;
}

export const FULL_NAME_ERROR = 'יש להזין שם מלא — שם פרטי ושם משפחה';

export function toE164(localPhone) {
  const digits = localPhone.replace(/\D/g, '');
  return `+972${digits.replace(/^0/, '')}`;
}

function toLocalPhone(e164) {
  return e164.startsWith('+972') ? '0' + e164.slice(4) : e164;
}

/**
 * הצורה הקנונית של `users.phone` בכל הפרויקט: `05XXXXXXXX`, ספרות בלבד.
 *
 * ## ⚠️ למה זה נוסף (15.9)
 * שדה ההרשמה הוא `type="tel"` בלי `pattern`, ו-`registerCustomer` כתב
 * את הערך **גולמי**. בבדיקה נרשם בפועל חשבון עם הטלפון `abcdefg`,
 * והוא נשמר. וה-placeholder בטופס הוא `050-1234567` **עם מקפים** —
 * כלומר כל מי שהלך לפי הדוגמה שמרנו לו מספר עם מקפים.
 *
 * מה שזה שבר במורד הזרם: `marketplace` ו-`listing` בונים
 * `wa.me/972${phone.replace(/^0/,'')}`, ומקף אחד הפך את הקישור ל-
 * `wa.me/97250-881-1085` — שבור לכל מודעה של כל מי שהקליד לפי
 * ה-placeholder. ו-`createGrowCheckout` שולח את אותו שדה לספק התשלומים.
 *
 * ⚠️ **זה מנרמל ואינו מאמת.** קלט שאינו מספר כלל הופך למחרוזת ריקה,
 * והחסימה על ריק היא באחריות הקורא — בדיוק כמו `needsPhone` ב-OAuth.
 */
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return '0' + digits.slice(3);
  return digits.startsWith('0') ? digits : '0' + digits;
}

/** Registers a new customer account — web ordering is customer-only, no driver signup here. */
export async function registerCustomer({ name, email, phone, password, termsAccepted }) {
  // הסכמה לתנאי השימוש ולמדיניות הפרטיות היא תנאי להרשמה (כמו באפליקציה).
  // הטופס ב-login.html כבר חוסם, אבל termsAcceptedAt נכתב למסמך המשתמש למטה,
  // ולא נכתוב אותו בלי הסכמה אמיתית — לכן גם כאן.
  if (!termsAccepted) throw { code: 'auth/terms-not-accepted' };
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await fbUpdateProfile(credential.user, { displayName: name });
  const profile = {
    uid: credential.user.uid, name, email, phone: normalizePhone(phone), userType: 'customer',
    referralCode: generateReferralCode(credential.user.uid),
    // אין כאן walletBalance. firestore.rules (newUserFieldsSafe) אוסר על
    // walletBalance/earningsBalance/cancellationStrikes/suspendedUntil/
    // suspensionReason להופיע במסמך משתמש חדש — הם חיים ב-
    // users/{uid}/private/financial ורק אדמין/Cloud Function כותב אותם.
    // AuthContext.register באפליקציה כבר לא כותב אותם מאותה סיבה.
  };
  // ראיית ההסכמה לתקנון: המועד (היה קיים) **וגם** הגרסה שאושרה (11.9) —
  // בלי הגרסה, "אישר ב-3.2" לא אומר למה בדיוק הוא הסכים. אותם שני שדות
  // בדיוק נכתבים ע"י AuthContext.register באפליקציה. ראו legal.js.
  await setDoc(doc(db, 'users', credential.user.uid), { ...profile, termsAcceptedAt: serverTimestamp(), termsVersion: TERMS_VERSION });
  sendEmailVerification(credential.user, EMAIL_VERIFICATION_SETTINGS).catch(() => {});
  return profile;
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', credential.user.uid));
  /**
   * ⚠️ 17.9 — חשבון יתום: זהה ל-`login()` ב-Hovalot's AuthContext.tsx (16.9).
   * הרשמה שנקטעת בין `createUserWithEmailAndPassword` ל-`setDoc` (סגירת
   * הדפדפן/נפילת רשת) משאירה חשבון ב-Auth בלי מסמך ב-Firestore. בלי הבדיקה
   * הזו `snap.exists()` הוא `false`, שום דבר לא נזרק, וה-`subscribeToAuth`
   * שבתחתית login.html מקבל `callback(null)` (ראו שם) — כלומר הכפתור נלחץ,
   * הספינר נגמר, ושום דבר לא קורה, בדיוק כמו שהיה באפליקציה לפני התיקון.
   * `signOut` הכרחי מאותה סיבה: בלעדיו יישאר משתמש מחובר בלי פרופיל.
   */
  if (!snap.exists()) {
    await signOut(auth);
    throw { code: 'auth/profile-missing' };
  }
  if (snap.data().suspended) {
    await signOut(auth);
    throw { code: 'auth/account-suspended' };
  }
  return credential.user;
}

/**
 * בלם שליחה חוזרת לאיפוס סיסמה — זהה ל-`useSendCooldown('email', ...)` ב-
 * LoginScreen.tsx: אין שום אימות שהמלחיץ הוא בעל הכתובת, ולכן בלי צינון
 * זהו וקטור הצפה של תיבה זרה. 60 שניות בין שליחה לשליחה, עד 5 שליחות
 * לאותה כתובת — אותם מספרים בדיוק כמו האפליקציה.
 *
 * ⚠️ מצב ברמת המודול, לא ברמת הרכיב/הדף — רענון הדף מאפס אותו (אין כאן
 * localStorage), בדיוק כמו שסגירה ופתיחה מחדש של האפליקציה מאפסת את הצד
 * שלה. זו הגנת קליינט בלבד, מרסן ולא מנעול.
 */
const RESET_COOLDOWN_MS = 60_000;
const RESET_MAX_PER_TARGET = 5;
const resetAttempts = new Map();
const resetNextAllowedAt = new Map();

export function getPasswordResetCooldown(email) {
  const key = String(email ?? '').trim().toLowerCase();
  const secondsLeft = Math.max(0, Math.ceil(((resetNextAllowedAt.get(key) ?? 0) - Date.now()) / 1000));
  const exhausted = (resetAttempts.get(key) ?? 0) >= RESET_MAX_PER_TARGET;
  return { canSend: !exhausted && secondsLeft === 0, secondsLeft, exhausted };
}

export async function sendPasswordReset(email) {
  const trimmed = String(email ?? '').trim();
  const key = trimmed.toLowerCase();
  await sendPasswordResetEmail(auth, trimmed);
  resetNextAllowedAt.set(key, Date.now() + RESET_COOLDOWN_MS);
  resetAttempts.set(key, (resetAttempts.get(key) ?? 0) + 1);
}

/* ═══════════ צינון על שליחת קוד SMS ═══════════════════════════════
   ⚠️ **כל שליחה עולה כסף אמיתי.** האתר מנע רק לחיצה כפולה בזמן
   הבקשה עצמה, ולכן לחיצות חוזרות — בטעות או בכוונה — היו שליחות
   ממומנות בלי שום רסן. `PhoneVerificationScreen.tsx:57` באפליקציה
   מחזיק `useSendCooldown('sms', { cooldownSeconds: 45, maxPerTarget: 5 })`,
   וזו אותה מדיניות. המבנה מועתק מ-`getPasswordResetCooldown` שמעליו
   ולא נכתב מחדש, כדי ששני הצינונים לא יתפצלו.

   ⚠️ זו הגנה בצד הלקוח בלבד — היא מונעת בזבוז, לא תוקף. Firebase
   מגביל בצד השרת, וההודעה שלו גנרית; זו נותנת ללקוח מספר שניות
   ומסלול מוצא אמיתי. */
const SMS_COOLDOWN_MS = 45_000;
const SMS_MAX_PER_TARGET = 5;
const smsAttempts = new Map();
const smsNextAllowedAt = new Map();

const smsKey = (phone) => String(phone ?? '').replace(/\D/g, '');

export function getSmsCooldown(phone) {
  const key = smsKey(phone);
  const secondsLeft = Math.max(0, Math.ceil(((smsNextAllowedAt.get(key) ?? 0) - Date.now()) / 1000));
  const exhausted = (smsAttempts.get(key) ?? 0) >= SMS_MAX_PER_TARGET;
  return { canSend: !exhausted && secondsLeft === 0, secondsLeft, exhausted };
}

export function noteSmsSent(phone) {
  const key = smsKey(phone);
  smsNextAllowedAt.set(key, Date.now() + SMS_COOLDOWN_MS);
  smsAttempts.set(key, (smsAttempts.get(key) ?? 0) + 1);
}

export function logout() {
  return signOut(auth);
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  await sendEmailVerification(auth.currentUser, EMAIL_VERIFICATION_SETTINGS);
}

export async function refreshEmailVerified() {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

/**
 * Combined auth+profile subscription, mirroring AuthContext's own listener:
 * fires with `null` when signed out, otherwise `{ authUser, profile }` and
 * keeps firing on profile doc changes (e.g. phoneVerified flips after SMS
 * confirm). Returns the unsubscribe function.
 */
export function subscribeToAuth(callback) {
  let unsubProfile = null;
  const unsubAuth = onAuthStateChanged(auth, (authUser) => {
    if (unsubProfile) { unsubProfile(); unsubProfile = null; }
    if (!authUser) { callback(null); return; }
    unsubProfile = onSnapshot(doc(db, 'users', authUser.uid), (snap) => {
      if (!snap.exists()) { callback(null); return; }
      callback({ authUser, profile: { uid: snap.id, ...snap.data() } });
    });
  });
  return () => { unsubAuth(); if (unsubProfile) unsubProfile(); };
}

/** Redirects to login.html (preserving the current page as `next`) if signed out; resolves with the profile once known. */
export function requireAuth() {
  return new Promise((resolve) => {
    const unsub = subscribeToAuth((state) => {
      unsub();
      if (!state) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = `login.html?next=${next}`;
        return;
      }
      resolve(state);
    });
  });
}

let recaptchaVerifier = null;
function getRecaptcha(containerId) {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  }
  return recaptchaVerifier;
}

/** Sends a real SMS OTP to the already-signed-in user's phone, same as the app's sendPhoneVerificationCode. Expects a local (05...) number. */
export async function sendPhoneVerificationCode(localPhone, recaptchaContainerId) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(toE164(localPhone), getRecaptcha(recaptchaContainerId));
  return verificationId;
}

/** Confirms the SMS code and marks the account phone-verified, same fields as the app (`phone` local format + `phoneVerified: true`). */
export async function confirmPhoneVerificationCode(verificationId, code, localPhone) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const credential = PhoneAuthProvider.credential(verificationId, code);
  await updatePhoneNumber(auth.currentUser, credential);
  // ⚠️ 17.9 — מרעננים את ה-ID token לפני הכתיבה, בדיוק כמו האפליקציה
  // (AuthContext). החוק phoneVerifiedNotSelfGranted דורש שה-claim
  // phone_number בטוקן יתאים למספר שנכתב; בלי רענון מפורש הכתיבה עלולה
  // להיכשל לסירוגין ב-Web SDK מיד אחרי אימות SMS מוצלח.
  await auth.currentUser.getIdToken(true);
  await updateDoc(doc(db, 'users', auth.currentUser.uid), { phone: toLocalPhone(toE164(localPhone)), phoneVerified: true });
}


/* ══════════════════════════════════════════════════════════════════
   התחברות עם Google / Apple
   ══════════════════════════════════════════════════════════════════

   ## למה זה נוסף (15.9)
   גיא פתח את זרימת ההזמנה לאורחים, וההרשמה עברה לנקודה שלפני התשלום.
   אבל הוא זיהה בעצמו שהגבול האמיתי אינו **מתי** מבקשים אלא **כמה
   עבודה** זה:

   > *"באפליקציה זה שונה ואין להם בעיה ללחוץ על הכפתור התחבר עם אפל
   > או גוגל... אולי אם זה היה באתר זה היה יותר בסדר."*

   טופס עם שם, מייל, טלפון וסיסמה מבריח; כפתור אחד לא. שני הנתיבים
   מגיעים לאותו `users/{uid}` בדיוק, כך שמסכי האדמין והמוביל
   באפליקציה קוראים חשבון שנוצר כאן בלי שום שינוי אצלם.

   ## ⚠️ הטלפון — הפער שנוצר, ולמה הוא לא נסגר כאן
   `registerCustomer` מקבל טלפון כשדה חובה; Google ו-Apple **אינם
   מוסרים אותו**. הפרופיל נוצר עם `phone: ''`, וזה תקין רק כל עוד
   משהו אוסף אותו לפני שמוביל צריך להתקשר. `needsPhone` למטה הוא
   הדגל שאומר את זה למי שקורא — **הוא חייב להיבדק לפני התשלום.**
   פרופיל בלי טלפון שמגיע להזמנה פעילה הוא הזמנה שאי אפשר לבצע.

   ## ⚠️ Apple דורש הגדרה שאינה בקוד
   בניגוד לאפליקציה, Sign in with Apple **באתר** עובד דרך Service ID
   נפרד ב-Apple Developer, עם Return URL שמצביע ל-
   `hovalot-6cf65.firebaseapp.com/__/auth/handler`. בלי זה הקריאה
   נכשלת ב-`auth/operation-not-allowed` — כלומר הכפתור יופיע ולא
   יעבוד. הכפתור מוסתר עד שהספק מופעל, ולא מוצג ונשבר.
*/

/** ההסכמה נלכדת בלחיצה עצמה — ראו `terms-note` מתחת לכפתורים ב-login.html. */
async function upsertOAuthProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { profile: { uid: snap.id, ...snap.data() }, isNew: false };

  const profile = {
    uid: user.uid,
    /**
     * ⚠️ 16.9 — היה `user.displayName || ''`, ועם Apple זה מייצר חשבון בלי שם.
     * Apple מוסר את השם **רק בהרשאה הראשונה** ורק אם המשתמש לא בחר להסתיר
     * אותו, כלומר `displayName` ריק הוא מצב שכיח ולא חריג. הנפילה חוזרת
     * במורד הזרם: מסכי האדמין והמוביל באפליקציה מציגים `user.name`, והמוביל
     * מקבל הזמנה של "" — הוא לא יודע למי הוא מתקשר.
     *
     * הנוסחה זהה ל-`completeOAuthProfile` באפליקציה (AuthContext.tsx):
     * שם → החלק שלפני ה-@ במייל → `'משתמש'`. ⚠️ עם "הסתר את הכתובת שלי"
     * המייל הוא `xxxx@privaterelay.appleid.com`, ולכן החלק שלפני ה-@ הוא
     * מזהה חסר משמעות — אבל הוא עדיין ייחוד שמבדיל בין שני חשבונות
     * במסך אדמין, וזה עדיף על מחרוזת ריקה. המשתמש מתקן שם במסך החשבון.
     */
    name: user.displayName || user.email?.split('@')[0] || 'משתמש',
    email: user.email || '',
    // ⚠️ ריק במכוון. ראו ההערה למעלה — `needsPhone` הוא מה שמסמן את זה.
    phone: '',
    userType: 'customer',
    referralCode: generateReferralCode(user.uid),
    // walletBalance ואחיו אסורים במסמך חדש לפי firestore.rules — ראו
    // registerCustomer, אותה מגבלה בדיוק.
  };
  await setDoc(ref, { ...profile, termsAcceptedAt: serverTimestamp(), termsVersion: TERMS_VERSION });
  return { profile, isNew: true };
}

/**
 * @param {'google'|'apple'} kind
 * @returns {Promise<{profile: object, isNew: boolean, needsPhone: boolean}>}
 */
export async function signInWithProvider(kind) {
  let provider;
  if (kind === 'google') {
    provider = new GoogleAuthProvider();
    // בלי זה, משתמש שכבר בחר חשבון פעם אחת מדלג על הבחירה בשקט —
    // מטריד במיוחד במכשיר משותף.
    provider.setCustomParameters({ prompt: 'select_account' });
  } else {
    provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    /**
     * מסך ההתחברות של Apple הוא דף של Apple ולא שלנו, והוא נפתח בשפת
     * ה-Accept-Language של הדפדפן — כלומר לקוח ישראלי עם דפדפן באנגלית
     * קיבל מסך אנגלי בתוך זרימה עברית. `locale` הוא הפרמטר שמתועד
     * ב-Firebase לשליטה על השפה של המסך הזה.
     * ⚠️ הצורה היא `he_IL` ולא `he`: התיעוד של Firebase מדגים `'fr'`,
     * אבל חבילת השפה של Apple עצמה קיימת תחת `he_IL` בלבד —
     * `appleid.cdn-apple.com/.../1/he_IL/appleid.auth.js` מחזיר 200
     * ו-`.../1/he/...` מחזיר 404 (נבדק 16.9). ⚠️ זו ראיה עקיפה
     * (נתיב חבילת ה-JS, לא הפרמטר עצמו) — **לאמת במסך אמיתי** אחרי
     * שהספק יופעל. Apple עצמה קובעת את הנוסח בדף שלה; זה מבקש ולא מבטיח.
     */
    provider.setCustomParameters({ locale: 'he_IL' });
  }
  const { user } = await signInWithPopup(auth, provider);
  const { profile, isNew } = await upsertOAuthProfile(user);
  /**
   * ⚠️ 16.9 — **הבדיקה הזאת הייתה כאן חסרה, והיא קיימת ב-`login()`
   * שורות ספורות מעל.**
   *
   * השעיה נאכפת בשרת בשני מקומות בלבד (`acceptOrderSecure`,
   * `notifyDriversOnNewOrder`) ו**אינה מופיעה בחוקי Firestore כלל**.
   * כלומר מסך ההתחברות הוא שער האכיפה המרכזי — ומוביל מושעה שלחץ
   * "המשך עם Google" באתר פשוט נכנס.
   *
   * ההשעיה היא הסנקציה **היחידה** שיש למערכת מול דיווח הטרדה
   * (`AdminReportsScreen`). שער שנאכף במסלול אחד מתוך שניים אינו שער.
   *
   * ⚠️ `upsertOAuthProfile` רץ **לפני** הבדיקה בכוונה — הוא זה שמחזיר
   * את הפרופיל, ובלעדיו אין מה לבדוק. הוא אינו מעניק שום גישה בפני
   * עצמו.
   */
  if (profile?.suspended) {
    await signOut(auth);
    throw { code: 'auth/account-suspended' };
  }
  return { profile, isNew, needsPhone: !profile.phone };
}

/**
 * משלימה את הטלפון שחסר אחרי התחברות עם ספק. ראו `needsPhone`.
 *
 * ⚠️ 15.9 — **נכתב כאן `toE164` (`+972…`), וזה היה הפורמט הלא נכון.**
 * הפורמט הקנוני של `users.phone` בפרויקט הוא המקומי (`05…`): כך כותבים
 * `registerCustomer` למעלה, `confirmPhoneVerificationCode` (שמריץ בדיוק
 * `toLocalPhone(toE164(...))`), ו-`AuthContext` באפליקציה בשני נתיבי
 * אימות הטלפון שלו. `toLocalPhone` קיים בקובץ הזה בשביל זה בדיוק.
 *
 * מה נשבר בפועל מהפורמט הזר: הלוח בונה קישור וואטסאפ בתור
 * `wa.me/972${phone.replace(/^0/, '')}` — על `+972521234567` ה-replace לא
 * תופס כלום והקישור יוצא `wa.me/972+972521234567`, כלומר שבור. בנוסף כל
 * חיפוש/השוואה של מספר במסכי האדמין מניח `05…`.
 */
export async function setProfilePhone(uid, localPhone) {
  await updateDoc(doc(db, 'users', uid), { phone: normalizePhone(localPhone) });
}


/* ══════════════════════════════════════════════════════════════════
   עריכת פרופיל ושינוי סיסמה — פאזה 2 של האזור האישי (16.9)
   ══════════════════════════════════════════════════════════════════ */

/**
 * שם וטלפון — מראה את `editProfile` ב-Hovalot's AuthContext.tsx (השדות
 * הרלוונטיים ללקוח באתר; לא רכב/ניווט, שהם שדות מוביל בלבד).
 *
 * ⚠️ **זו לא אותה פעולה כמו אימות טלפון ב-SMS** (`confirmPhoneVerificationCode`
 * למעלה). זו עריכת טקסט חופשי — בדיוק כמו EditProfileScreen באפליקציה,
 * ששני המסכים שלה (עריכה חופשית מול אימות OTP) קיימים זה לצד זה. שינוי
 * המספר כאן מפיל `phoneVerified` בחזרה ל-`false`, כי המספר החדש עדיין לא
 * עבר אימות — בדיוק אותו כלל.
 *
 * `currentPhone` מגיע מהקורא (לא נקרא כאן מ-Firestore) כדי שהפונקציה
 * תישאר קריאה בודדת, בלי round-trip נוסף על פעולת שמירה רגישה לזמן תגובה.
 */
export async function updateProfileFields(uid, { name, phone, currentPhone }) {
  const updates = {};
  const trimmedName = cleanName(name);
  if (trimmedName) updates.name = trimmedName;
  if (phone !== undefined) {
    const normalized = normalizePhone(phone);
    updates.phone = normalized;
    if (normalized !== normalizePhone(currentPhone ?? '')) updates.phoneVerified = false;
  }
  if (Object.keys(updates).length === 0) return;
  await updateDoc(doc(db, 'users', uid), updates);
  // מסמך ה-Firestore הוא מקור האמת שממנו שאר האתר קורא (state.profile),
  // אבל auth.currentUser.displayName הוא מה שמופיע ב-Firebase Console
  // ובכל מקום שקורא ישירות מאובייקט ה-Auth — לא להשאיר אותו מיותם.
  if (updates.name && auth.currentUser) {
    await fbUpdateProfile(auth.currentUser, { displayName: updates.name });
  }
}

/** מראה את `changePassword` ב-AuthContext.tsx — דורש סיסמה נוכחית (Firebase לא מאפשר שינוי סיסמה בלי אימות מחדש טרי). לא ישים לחשבון Google/Apple (אין סיסמה לאמת מולה); הקורא אחראי לבדוק providerData לפני הצגת הטופס. */
export async function changePassword(currentPassword, newPassword) {
  if (!auth.currentUser || !auth.currentUser.email) throw new Error('NOT_LOGGED_IN');
  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await fbUpdatePassword(auth.currentUser, newPassword);
}
