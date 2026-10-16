/**
 * הודעת המדידה ו"הגדרות מדידה" — הבטחת מדיניות הפרטיות (privacy.html):
 * "אפשר לבטל את המדידה דרך 'הגדרות מדידה' בתחתית האתר".
 *
 * ## מה זה, ומה זה לא
 * לפי חוות הדעת המשפטית לישראל זו **הודעה ולא הסכמה**: המדידה פועלת כברירת
 * מחדל, גם לפני הלחיצה על "הבנתי". הלחיצה רק שומרת שהמשתמש ראה את ההודעה.
 * הביטול האמיתי הוא המתג בחלון ההגדרות (ראו measurement-state.js, וראו
 * analytics.js שקורא את אותו מתג ולא טוען את ה-SDK כשהוא כבוי).
 *
 * ## נגישות
 * הבאנר אינו חוסם (לא dialog), מוזרק אחרי קישור הדילוג כדי שיהיה נגיש
 * במקלדת, ושומר מקום בתחתית הדף (`--measurement-banner-h`) כך שלא יסתיר
 * את כפתורי ההזמנה. החלון הוא `<dialog>` מקורי: מלכודת מיקוד ו-Esc חינם.
 *
 * אין תלות חיצונית ואין CMP של צד שלישי.
 */
import {
  isMeasurementEnabled, setMeasurementEnabled, NOTICE_SEEN_KEY, MEASUREMENT_EVENT,
} from './measurement-state.js';

const PRIVACY_HREF = '/privacy.html';
let banner = null;
let dialog = null;
let resizeObs = null;

function noticeSeen() {
  try { return localStorage.getItem(NOTICE_SEEN_KEY) === '1'; } catch (_) { return false; }
}
function markSeen() {
  try { localStorage.setItem(NOTICE_SEEN_KEY, '1'); } catch (_) { /* יוצג שוב בביקור הבא */ }
}

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function removeBanner() {
  if (!banner) return;
  if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
  banner.remove();
  banner = null;
  document.body.classList.remove('has-measurement-notice');
  document.documentElement.style.removeProperty('--measurement-banner-h');
}

function dismissBanner() {
  markSeen();
  removeBanner();
  // הכפתור שהיה בפוקוס נעלם — מחזירים את המיקוד לתוכן במקום לאבד אותו.
  const main = document.getElementById('main-content');
  if (main) main.focus({ preventScroll: true });
}

function showBanner() {
  if (banner || noticeSeen()) return;
  const b = el('div', { class: 'measurement-notice', role: 'region', 'aria-label': 'הודעה על מדידת שימוש' });
  const p = el('p', { class: 'measurement-notice-text' },
    'אנחנו משתמשים בכלי מדידה (Google Analytics) כדי לשפר את האתר. ');
  p.appendChild(el('a', { href: PRIVACY_HREF }, 'מדיניות הפרטיות'));
  const actions = el('div', { class: 'measurement-notice-actions' });
  const ok = el('button', { type: 'button', class: 'measurement-notice-ok' }, 'הבנתי');
  ok.addEventListener('click', dismissBanner);
  const settings = el('a', { href: PRIVACY_HREF + '#measurement-settings', class: 'measurement-notice-settings', 'data-measurement-settings': '' }, 'הגדרות מדידה');
  actions.append(ok, settings);
  b.append(p, actions);

  const skip = document.querySelector('a.skip-link');
  if (skip) skip.insertAdjacentElement('afterend', b);
  else document.body.insertBefore(b, document.body.firstChild);
  banner = b;

  document.body.classList.add('has-measurement-notice');
  const sync = () => document.documentElement.style.setProperty('--measurement-banner-h', b.offsetHeight + 'px');
  sync();
  if (typeof ResizeObserver !== 'undefined') { resizeObs = new ResizeObserver(sync); resizeObs.observe(b); }
}

function buildDialog() {
  const d = el('dialog', { class: 'measurement-dialog', 'aria-labelledby': 'measurement-dialog-title', 'aria-describedby': 'measurement-dialog-desc' });
  d.append(el('h2', { id: 'measurement-dialog-title' }, 'הגדרות מדידה'));

  const row = el('label', { class: 'measurement-switch' });
  const input = el('input', { type: 'checkbox', role: 'switch', id: 'measurement-toggle' });
  const label = el('span', { class: 'measurement-switch-label' }, 'מדידת שימוש אנונימית');
  row.append(input, label);
  d.appendChild(row);

  d.appendChild(el('p', { id: 'measurement-dialog-desc', class: 'measurement-dialog-desc' },
    'המדידה (Google Analytics) עוזרת לנו להבין איך משתמשים באתר ולשפר אותו, ללא שם, טלפון, אימייל או כתובת. ' +
    'כשהמתג כבוי האתר לא טוען את כלי המדידה, לא שולח אירועי שימוש ומוחק את עוגיות המדידה (_ga). ' +
    'ביטול המדידה אינו משפיע על השימוש בשירות.'));
  const status = el('p', { class: 'measurement-dialog-status', role: 'status', 'aria-live': 'polite' });
  d.appendChild(status);

  const foot = el('div', { class: 'measurement-dialog-actions' });
  foot.appendChild(el('a', { href: PRIVACY_HREF }, 'מדיניות הפרטיות'));
  const close = el('button', { type: 'button', class: 'measurement-notice-ok' }, 'סגירה');
  close.addEventListener('click', () => d.close());
  foot.appendChild(close);
  d.appendChild(foot);

  const render = () => {
    const on = isMeasurementEnabled();
    input.checked = on;
    return on;
  };
  input.addEventListener('change', () => {
    setMeasurementEnabled(input.checked);
    markSeen();
    removeBanner();
    status.textContent = input.checked ? 'המדידה פעילה.' : 'המדידה כבויה.';
  });
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => { status.textContent = ''; });
  d._render = render;
  document.body.appendChild(d);
  return d;
}

export function openMeasurementSettings(opener) {
  if (!dialog) dialog = buildDialog();
  dialog._render();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  dialog.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus(); }, { once: true });
}

document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest && e.target.closest('[data-measurement-settings]');
  if (!a) return;
  e.preventDefault();
  openMeasurementSettings(a);
});
// שינוי מלשונית אחרת.
window.addEventListener(MEASUREMENT_EVENT, () => { if (dialog && dialog.open) dialog._render(); });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner, { once: true });
else showBanner();
