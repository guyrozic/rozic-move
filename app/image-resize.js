// Browser equivalent of the app's expo-image-manipulator resize step (used in
// both AIRoomScanScreen.tsx and CreateGiveawayScreen.tsx) — downscaling locally
// before upload is faster to send and avoids hitting storage.rules' per-photo
// size cap (isImageUnder(10) — a full-res smartphone photo can easily exceed
// that) or Gemini's own preference for smaller images.
function loadResizedCanvas(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('DECODE_FAILED'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Resizes a File to maxWidth (JPEG, given quality) and returns just the base64 payload (no data: prefix) — matches the {base64, mimeType} shape ai-vision.js expects. */
export async function resizeImageToBase64(file, maxWidth = 1024, quality = 0.7) {
  const canvas = await loadResizedCanvas(file, maxWidth);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

/** Resizes a File to maxWidth (JPEG, given quality) and returns a Blob — for Firebase Storage uploadBytes (marketplace listing photos etc.), where a base64 string isn't directly usable. */
export async function resizeImageToBlob(file, maxWidth = 1600, quality = 0.82) {
  const canvas = await loadResizedCanvas(file, maxWidth);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('BLOB_FAILED')), 'image/jpeg', quality);
  });
}
