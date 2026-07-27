// Browser equivalent of the app's expo-image-manipulator resize step in
// AIRoomScanScreen.tsx — downscaling locally before sending to Gemini is faster
// than sending a full-resolution photo (same reasoning as the original code).
/** Resizes a File to maxWidth (JPEG, given quality) and returns just the base64 payload (no data: prefix) — matches the {base64, mimeType} shape ai-vision.js expects. */
export function resizeImageToBase64(file, maxWidth = 1024, quality = 0.7) {
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
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
