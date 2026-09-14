// Web equivalent of Hovalot's src/context/AuthContext.tsx — same Firestore
// `users/{uid}` shape, same phone-verification semantics (secondary step on an
// already-signed-in user, not a login method), so the mobile app's admin/driver
// screens read web-created accounts with no changes on their side.
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile as fbUpdateProfile, sendEmailVerification,
  RecaptchaVerifier, PhoneAuthProvider, updatePhoneNumber,
  GoogleAuthProvider, OAuthProvider, signInWithPopup,
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

export function toE164(localPhone) {
  const digits = localPhone.replace(/\D/g, '');
  return `+972${digits.replace(/^0/, '')}`;
}

function toLocalPhone(e164) {
  return e164.startsWith('+972') ? '0' + e164.slice(4) : e164;
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
    uid: credential.user.uid, name, email, phone, userType: 'customer',
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
  if (snap.exists() && snap.data().suspended) {
    await signOut(auth);
    throw { code: 'auth/account-suspended' };
  }
  return credential.user;
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
    name: user.displayName || '',
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
  }
  const { user } = await signInWithPopup(auth, provider);
  const { profile, isNew } = await upsertOAuthProfile(user);
  return { profile, isNew, needsPhone: !profile.phone };
}

/** משלימה את הטלפון שחסר אחרי התחברות עם ספק. ראו `needsPhone`. */
export async function setProfilePhone(uid, localPhone) {
  await updateDoc(doc(db, 'users', uid), { phone: toE164(localPhone) });
}
