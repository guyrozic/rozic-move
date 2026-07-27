// Web equivalent of Hovalot's src/services/storage.ts (Firebase Storage upload).
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { storage } from './firebase.js';

export async function uploadImageFile(path, file) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadListingPhoto(listingTmpId, file, index) {
  return uploadImageFile(`listings/${listingTmpId}/${index}_${Date.now()}.jpg`, file);
}
