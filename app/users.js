// Web equivalent of Hovalot's src/services/users.ts getUser() — reads a single
// users/{uid} doc. firestore.rules allows `allow get: if isAuth()` on any user
// doc (but not `list`), so a customer can look up the driver assigned to their
// own order by uid — same access the app relies on for OrderDetailsScreen's
// driver card. Kept in its own file (not orders.js) since it's a users/ read,
// not an orders/ concern.
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

/**
 * 25.11 (W2) — קריאת users/{uid} של משתמש אחר היא הנתיב הישן, שייסגר בחוק
 * (שלב 2). הוא נשאר רק כנפילה כשהמסמך החדש חסר. ⚠️ לפני W2 ה-catch החזיר
 * null בשקט: כשהחוק ייסגר כל כרטיס מוביל היה נעלם בלי סימן. עכשיו כל כשל
 * שאינו "אין הרשאה" נרשם בקונסולה, ו-permission-denied נרשם כאזהרה אחת.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.warn('[users] legacy users/{uid} read failed', e?.code || e);
    return null;
  }
}

/** שם תצוגה ציבורי (publicProfile/{uid}, נכתב ע"י syncPublicProfile). null אם אין מסמך. */
export async function getPublicProfile(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'publicProfile', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.warn('[users] publicProfile read failed', e?.code || e);
    return null;
  }
}

/**
 * מראה `getOrderParty` ב-src/services/publicProfile.ts (ענף w2-public-profile):
 * orders/{orderId}/private/parties -> (נפילה) users/{uid}. מוחזר בצורת `users`
 * (`name`, `photoUrl`, `phone`, רכב, `idVerificationStatus`) כדי שהכרטיסים
 * הקיימים לא ישתנו. מסמך `parties` נכתב ע"י הטריגר רק אחרי שיבוץ; לפני
 * שהטריגר נפרס הוא פשוט לא קיים והנפילה עובדת כמו היום.
 */
export async function getOrderDriver(orderId, driverUid) {
  if (!driverUid) return null;
  if (orderId) {
    try {
      const snap = await getDoc(doc(db, 'orders', orderId, 'private', 'parties'));
      const d = snap.exists() ? snap.data() : null;
      const party = d && d.driverId === driverUid ? d.driver : null;
      if (party) {
        return {
          id: driverUid,
          name: party.name || '',
          phone: party.phone || null,
          photoUrl: party.photoUrl ?? null,
          vehicleType: party.vehicleType ?? null,
          vehicleMake: party.vehicleMake ?? null,
          vehicleModel: party.vehicleModel ?? null,
          vehiclePlate: party.vehiclePlate ?? null,
          idVerificationStatus: party.idVerified === true ? 'verified' : null,
        };
      }
    } catch (e) {
      // permission-denied לפני שהחוק/הטריגר פרוסים הוא צפוי; כל השאר (רשת) נרשם.
      if (e?.code !== 'permission-denied') console.warn('[users] parties read failed', e?.code || e);
    }
  }
  return getUserProfile(driverUid);
}

/** שם מוביל לרשימות (מועדפים): publicProfile.displayName -> users.name. */
export async function getDriverDisplayName(uid) {
  const pub = await getPublicProfile(uid);
  if (pub?.displayName) return pub.displayName;
  const legacy = await getUserProfile(uid);
  return legacy?.name || null;
}

// Mirrors VEHICLE_LABELS + formatVehicle in Hovalot's src/constants/vehicleTypes.ts.
const VEHICLE_LABELS = {
  car: 'רכב נוסעים',
  van: 'טנדר / ואן',
  truck: 'משאית',
  trailer: 'נגרר',
  scooter: 'קטנוע',
  truck_small: 'משאית קטנה',
  truck_large: 'משאית גדולה',
};

/** Prefers the driver's actual make+model over the generic vehicleType category — see formatVehicle() in vehicleTypes.ts. */
export function formatVehicle(profile) {
  if (!profile) return null;
  const makeModel = [profile.vehicleMake, profile.vehicleModel].filter(Boolean).join(' ').trim();
  if (makeModel) return makeModel;
  if (profile.vehicleType) return VEHICLE_LABELS[profile.vehicleType] ?? profile.vehicleType;
  return null;
}
