// Web equivalent of Hovalot's src/services/users.ts getUser() — reads a single
// users/{uid} doc. firestore.rules allows `allow get: if isAuth()` on any user
// doc (but not `list`), so a customer can look up the driver assigned to their
// own order by uid — same access the app relies on for OrderDetailsScreen's
// driver card. Kept in its own file (not orders.js) since it's a users/ read,
// not an orders/ concern.
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase.js';

export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
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
