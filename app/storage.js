// Web equivalent of Hovalot's src/services/storage.ts (Firebase Storage upload).
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { storage } from './firebase.js';

export async function uploadImageFile(path, file) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// storage.rules requires the path segment right after `listings/` to be
// exactly request.auth.uid (`match /listings/{userId}/{fileName}` + `uid() ==
// userId`) — the uniqueness has to live in the filename, not an extra path
// segment, or every write here would be permission-denied.
export async function uploadListingPhoto(uid, file, index) {
  return uploadImageFile(`listings/${uid}/${Date.now()}_${index}.jpg`, file);
}
