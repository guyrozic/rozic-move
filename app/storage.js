// Web equivalent of Hovalot's src/services/storage.ts (Firebase Storage upload).
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { storage } from './firebase.js';

export async function uploadImageFile(path, file) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// 17.9 — מראה `uploadProfilePhoto` ב-Hovalot's src/services/storage.ts: אותו
// נתיב קבוע `profiles/{uid}/avatar.jpg` (לא שם קובץ ייחודי כמו במודעות —
// תמונת פרופיל אחת בלבד לכל משתמש, וההעלאה הבאה דורסת את הקודמת). storage.rules
// (`match /profiles/{userId}/{fileName}`) מתירות כתיבה רק ל-uid()==userId,
// וקוראות אותה לכל משתמש מחובר — היא מוצגת לצד השני של ההזמנה.
export async function uploadProfilePhoto(uid, file) {
  return uploadImageFile(`profiles/${uid}/avatar.jpg`, file);
}
