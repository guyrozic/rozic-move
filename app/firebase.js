// Firebase Web SDK init — same `hovalot-6cf65` project the mobile app uses,
// via the "Hovalot" Web app already registered in the Firebase console
// (separate app entry from iOS/Android, same underlying Firestore/Auth/Storage).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';

// מזהה GA4 ("G-XXXXXXXXXX") — קונסולת Firebase > Project settings > General >
// Your apps > Hovalot (Web) > SDK setup. ריק = המדידה כבויה (ראו analytics.js).
export const MEASUREMENT_ID = 'G-C7PJYPBSRZ';

const firebaseConfig = {
  projectId: 'hovalot-6cf65',
  appId: '1:896710732186:web:e3e59d0f8326fda1bc7223',
  storageBucket: 'hovalot-6cf65.firebasestorage.app',
  apiKey: 'AIzaSyB076tM6CJHfCXUNyaVoRKK5tW6ZL580To',
  authDomain: 'hovalot-6cf65.firebaseapp.com',
  messagingSenderId: '896710732186',
  ...(MEASUREMENT_ID ? { measurementId: MEASUREMENT_ID } : {}),
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
