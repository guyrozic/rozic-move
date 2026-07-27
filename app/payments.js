// Calls the same createGrowCheckout Cloud Function the mobile app uses
// (functions/src/createGrowCheckout.ts) — it only needs a Firebase ID token
// (Bearer auth) and an orderId; the amount is always read server-side from the
// order doc itself, never trusted from the client.
import { auth } from './firebase.js';

const CREATE_CHECKOUT_URL = 'https://us-central1-hovalot-6cf65.cloudfunctions.net/createGrowCheckout';

/** Redirects the browser to the Grow hosted payment page for this order. */
export async function startGrowCheckout(orderId) {
  if (!auth.currentUser) throw new Error('NOT_LOGGED_IN');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(CREATE_CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, fromWeb: true }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) throw new Error((data && data.error) || 'CHECKOUT_FAILED');
  location.href = data.url;
}
