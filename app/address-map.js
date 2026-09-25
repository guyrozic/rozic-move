/**
 * app/address-map.js
 * ============================================================================
 * בורר מיקום על גבי מפה — Leaflet + OpenStreetMap (בלי מפתח API), מראה
 * `LocationConfirmMap.tsx` באפליקציה: פין קבוע במרכז המסך, המפה עצמה זזה
 * מתחתיו, וגיאוקודינג הפוך על כל תזוזה כדי לתרגם את נקודת המרכז לכתובת.
 *
 * ⚠️ **נטען עצלנית בכוונה.** האתר הזה JS וניל בלי bundler (ראו CLAUDE.md),
 * ו-Leaflet הוא ספרייה בגודל לא-זניח שרוב המשתמשים לא צריכים בכלל —
 * `mountAddressField` (ב-`address-autocomplete.js`) מייבא את הקובץ הזה
 * דינמית (`import()`) רק כשנלחץ כפתור "בחר ממפה"/"דייק מיקום על המפה".
 * עד אז לא נשלחת אף בקשת רשת ל-CDN של Leaflet.
 *
 * ⚠️ **SRI** — אותם משאבים ואותן חתימות בדיוק כמו ב-`app/order-track.html`
 * (הדף היחיד עד כה שטען Leaflet). CDN שנפרץ, או חבילת npm שנחטפה,
 * מריצים קוד שרירותי בתוך דף שמציג כתובות של לקוח — `integrity` הופך
 * את זה לכשל רועש (הדפדפן מסרב לטעון קובץ שהשתנה) במקום סיכון שקט.
 *
 * ⚠️ **CSP — לא נדרש שום שינוי.** `script-src`/`style-src` כבר כוללים
 * `https://cdn.jsdelivr.net` (מ-Leaflet שכבר טעון ב-order-track.html),
 * ו-`img-src` כבר כולל `https://*.tile.openstreetmap.org` (אריחי המפה).
 * `node scripts/check-csp.mjs` אומת ירוק בלי שום עריכה במדיניות.
 *
 * ⚠️ **גיאוקודינג הפוך עובד גם לאורח** (25.9, הכרעת גיא 70.1א) — `authUser`
 * מועבר כאן כמו שהוא, גם כשהוא `null`. `reverseGeocode` ב-
 * `address-autocomplete.js` מנתבת פנימית: מחובר → `mapsProxy`, אורח →
 * `geocodeAddress` המורחבת. לפני 25.9 הערה זו אמרה ש"נדרש `authUser`" —
 * זה תיאר את מגבלת השרת דאז, לא את הדפים: `apartment.html`/`small-move.html`
 * (הדפים היחידים שפותחים את המודאל הזה) תמכו בזרימת אורח כל הזמן.
 *
 * ## נגישות — מסלול מלא בלי מפה ובלי עכבר
 * המפה היא **תוספת**, לא תחליף: שדה הטקסט החופשי (עם ההשלמה האוטומטית
 * הקיימת) ממשיך לעבוד תמיד, גם למי שלא פותח את המודאל הזה בכלל, וגם אם
 * טעינת Leaflet מ-CDN נכשלת (`ensureLeaflet` דוחה, `openAddressMapPicker`
 * מציגה הודעת שגיאה בתוך המודאל ומאפשרת לסגור — לא זורקת ומשאירה את
 * העמוד תקוע). בתוך המודאל: מלכודת מיקוד מלאה, `Escape` סוגר ומחזיר
 * מיקוד למקור (מראה openDialog/closeDialog ב-order-status.html),
 * `aria-label` על כל פקד, ו-`prefers-reduced-motion` מבטל אנימציית
 * מעברי תצוגה יזומים (מרכוז ראשוני/כפתור "חזרה למיקום שלי") — לא נוגע
 * בגרירה/זום ביד, שאינם "תנועה שאנחנו כופים".
 */
import { reverseGeocode } from './address-autocomplete.js';

const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_SRI = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_JS_SRI = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';

// מרכז גיאוגרפי גס של ישראל — נקודת מוצא כשאין lat/lng ידוע וגם GPS
// ראשוני נכשל/נדחה. מראה ISRAEL_WIDE_REGION ב-LocationConfirmMap.tsx.
const ISRAEL_WIDE = { lat: 31.4, lng: 35.0, zoom: 7 };
const REDUCE_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

let leafletPromise = null;
function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.integrity = LEAFLET_CSS_SRI;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
    // סקריפט קלאסי (לא module) כדי שהמשתנה הגלובלי `L` יהיה זמין מיד —
    // אותה טכניקה בדיוק כמו ב-order-track.html.
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.integrity = LEAFLET_JS_SRI;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('leaflet load failed'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

/* ------------------------------------------------------------------ *
 * המודאל — singleton יחיד לכל הדף (from/to חולקים אותו; לא ניתן לפתוח
 * שניים בו-זמנית ממילא), נבנה פעם אחת ב-DOM ונשאר, כדי ש-Leaflet לא
 * ייווצר וייהרס בכל פתיחה.
 * ------------------------------------------------------------------ */
let els = null;
let map = null; // הפין עצמו קבוע ב-CSS מעל המפה (.address-map-pin) — המפה זזה מתחתיו, מראה LocationConfirmMap.tsx
let resolvePromise = null;
let resolved = null; // { lat, lng, fullAddress, city, street } | null
let reverseTimer = null;
let requestSeq = 0;
let bodyOverflowBefore = null;
let htmlOverflowBefore = null;
let returnFocusTo = null;

function buildModal() {
  if (els) return els;
  const overlay = document.createElement('div');
  overlay.className = 'address-map-overlay';
  overlay.id = 'address-map-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="address-map-card" role="dialog" aria-modal="true" aria-labelledby="address-map-title" tabindex="-1">
      <div class="address-map-head">
        <h2 id="address-map-title" class="sr-only">בחירת מיקום על גבי מפה</h2>
        <p class="address-map-hint">הזז את המפה כדי למקם את הסמן בדיוק על הכתובת</p>
        <button type="button" class="address-map-close" aria-label="סגירה">✕</button>
      </div>
      <div class="address-map-wrap">
        <div class="address-map-canvas" id="address-map-canvas" role="img" aria-label="מפה לבחירת מיקום"></div>
        <div class="address-map-pin" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 18 18" fill="none"><path d="M9 1.8c-2.9 0-5.2 2.3-5.2 5.1 0 3.8 5.2 9.3 5.2 9.3s5.2-5.5 5.2-9.3c0-2.8-2.3-5.1-5.2-5.1Z" fill="currentColor"/><circle cx="9" cy="6.9" r="1.9" fill="#fff"/></svg>
        </div>
        <button type="button" class="address-map-recenter" hidden aria-label="חזרה למיקום ההתחלתי על המפה">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M9 1.6v2.3M9 14.1v2.3M16.4 9h-2.3M3.9 9H1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="address-map-footer">
        <div class="address-map-status" id="address-map-status" aria-live="polite">טוען מפה…</div>
        <button type="button" class="btn btn-primary btn-block" id="address-map-confirm" disabled>אישור מיקום</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  els = {
    overlay,
    dialog: overlay.querySelector('[role="dialog"]'),
    closeBtn: overlay.querySelector('.address-map-close'),
    canvas: overlay.querySelector('#address-map-canvas'),
    recenterBtn: overlay.querySelector('.address-map-recenter'),
    statusEl: overlay.querySelector('#address-map-status'),
    confirmBtn: overlay.querySelector('#address-map-confirm'),
  };
  return els;
}

/** מלכודת מיקוד — מראה trapFocus ב-order-status.html. */
function trapFocus(dialogEl, e) {
  const focusables = dialogEl.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function setStatus(msg, kind) {
  els.statusEl.textContent = msg;
  els.statusEl.className = `address-map-status${kind ? ` ${kind}` : ''}`;
}

function doReverseGeocode(authUser, lat, lng) {
  if (reverseTimer) clearTimeout(reverseTimer);
  const seq = ++requestSeq;
  els.confirmBtn.disabled = true;
  resolved = null;
  setStatus('מאתר כתובת…');
  reverseTimer = setTimeout(async () => {
    try {
      const r = await reverseGeocode(authUser, lat, lng);
      if (seq !== requestSeq) return; // המשתמש כבר הזיז שוב — תוצאה ישנה
      if (!r || !r.fullAddress) { setStatus('לא הצלחנו לזהות כתובת במיקום הזה — נסה להזיז מעט', 'warn'); return; }
      resolved = { lat, lng, fullAddress: r.fullAddress, city: r.city, street: r.street };
      setStatus(r.fullAddress);
      els.confirmBtn.disabled = false;
    } catch {
      if (seq === requestSeq) setStatus('לא הצלחנו לזהות כתובת במיקום הזה — נסה להזיז מעט', 'warn');
    }
  }, 400);
}

function closeModal(result) {
  els.overlay.hidden = true;
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = bodyOverflowBefore ?? '';
  document.documentElement.style.overflow = htmlOverflowBefore ?? '';
  bodyOverflowBefore = null;
  htmlOverflowBefore = null;
  returnFocusTo?.focus({ preventScroll: true });
  returnFocusTo = null;
  if (resolvePromise) { const r = resolvePromise; resolvePromise = null; r(result); }
}

function onKeydown(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeModal(null); }
  else if (e.key === 'Tab') { trapFocus(els.dialog, e); }
}

/**
 * פותחת את בורר המיקום ומחזירה `Promise` שנפתרת ל-
 * `{ lat, lng, fullAddress, city, street }` באישור, או `null` בביטול/סגירה.
 *
 * @param {{authUser: any, lat?: number, lng?: number, returnFocusEl?: HTMLElement}} opts
 */
export function openAddressMapPicker({ authUser, lat, lng, returnFocusEl }) {
  return new Promise((resolve) => {
    resolvePromise = resolve;
    returnFocusTo = returnFocusEl ?? null;
    const hasInitial = typeof lat === 'number' && typeof lng === 'number';
    buildModal();

    bodyOverflowBefore = document.body.style.overflow;
    htmlOverflowBefore = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    els.overlay.hidden = false;
    els.confirmBtn.disabled = true;
    setStatus('טוען מפה…');
    document.addEventListener('keydown', onKeydown);
    els.dialog.focus({ preventScroll: true });

    els.closeBtn.onclick = () => closeModal(null);
    els.overlay.onclick = (e) => { if (e.target === els.overlay) closeModal(null); };
    els.confirmBtn.onclick = () => { if (resolved) closeModal(resolved); };

    ensureLeaflet().then(() => {
      let anchor = hasInitial ? { lat, lng } : null;

      function setView(center, zoom) {
        map.setView([center.lat, center.lng], zoom, { animate: !REDUCE_MOTION });
      }

      if (!map) {
        map = window.L.map(els.canvas).setView([ISRAEL_WIDE.lat, ISRAEL_WIDE.lng], ISRAEL_WIDE.zoom);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        map.on('moveend', () => {
          const c = map.getCenter();
          doReverseGeocode(authUser, c.lat, c.lng);
        });
      }
      // המודאל עבר מ-hidden ל-display רק עכשיו — Leaflet מודד גודל 0×0
      // אם זה קורה באותו טיק. מראה ensureMap ב-order-track.html.
      setTimeout(() => map.invalidateSize(), 0);

      els.recenterBtn.hidden = !anchor;
      els.recenterBtn.onclick = () => { if (anchor) setView(anchor, 16); };

      if (anchor) {
        setView(anchor, 16);
        doReverseGeocode(authUser, anchor.lat, anchor.lng);
      } else {
        // אין נקודת מוצא ידועה — מנסים GPS כניחוש התחלתי (בשקט, בלי לחסום
        // אם נדחה/נכשל), ואם לא, נשארים בתצוגה הרחבה של הארץ. מראה
        // ה-useEffect ב-LocationConfirmMap.tsx.
        map.setView([ISRAEL_WIDE.lat, ISRAEL_WIDE.lng], ISRAEL_WIDE.zoom);
        setStatus('הזז את המפה כדי לבחור מיקום');
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (els.overlay.hidden) return; // המשתמש כבר סגר בינתיים
              anchor = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              els.recenterBtn.hidden = false;
              setView(anchor, 15);
              doReverseGeocode(authUser, anchor.lat, anchor.lng);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
          );
        }
      }
    }).catch(() => {
      setStatus('טעינת המפה נכשלה — אפשר לסגור ולהמשיך עם הקלדת הכתובת.', 'warn');
    });
  });
}
