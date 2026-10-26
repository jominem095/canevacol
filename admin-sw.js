// Caneva Admin service worker (v88): shows the store notices and puts the red number on the app icon.
// v88: reminders from Libretas ring with buttons "✓ Hecho" and "⏰ +1 hora" (work even with the app closed, Android/PC;
// on iPhone tapping the notice opens Libretas). Only handles push and taps; it does not cache pages.
const API = "https://caneva-ai.canevacol.workers.dev";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "CANEVA", body: e.data ? e.data.text() : "" }; }
  const opts = {
    body: d.body || "",
    icon: "admin-icon-192.png",
    badge: "admin-icon-192.png",
    tag: d.tag || "caneva",
    renotify: true,
    data: Object.assign({ url: d.url || "admin_movil.html?app=1" }, d.data || {})
  };
  if (Array.isArray(d.actions)) opts.actions = d.actions.slice(0, 2);
  if (d.requireInteraction) opts.requireInteraction = true;
  if (d.data && d.data.rem) opts.vibrate = [80, 60, 80, 60, 160];
  const jobs = [self.registration.showNotification(d.title || "CANEVA", opts)];
  // red number on the "Caneva Admin" icon, even with the app closed
  if (typeof d.badge === "number" && self.navigator && "setAppBadge" in self.navigator) {
    jobs.push((d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(() => {}));
  }
  e.waitUntil(Promise.all(jobs));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const data = e.notification.data || {};
  // buttons of a reminder: done / one more hour, without opening the app
  if (e.action && data.rem) {
    e.waitUntil(fetch(API + "/rem/act", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.rem.id, col: data.rem.col, sig: data.rem.sig, act: e.action === "snooze" ? "snooze" : "done" }) })
      .then(r => r.ok ? null : self.registration.showNotification("CΛNEVΛ", { body: "No se pudo guardar. Ábrelo en Libretas.", icon: "admin-icon-192.png", tag: "rem-err" }))
      .catch(() => null)
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then(list => { (list || []).forEach(c => c.postMessage({ cv: "refresh", tab: "libretas" })); }));
    return;
  }
  const url = new URL(data.url || "admin_movil.html?app=1", self.registration.scope).href;
  const tab = (url.match(/[?&]tab=([a-z]+)/) || [])[1] || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.includes("admin_movil.html") && "focus" in c) { c.postMessage({ cv: "refresh", tab }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
