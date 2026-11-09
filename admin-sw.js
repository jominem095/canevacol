// Caneva Admin service worker (v101): auto-update without manual restart + the store notices + the red number on the icon.
// v101: when a new version activates it RELOADS every open Caneva Admin (client.navigate), and the app shell (the page
// navigation) is served network-first, so a new version comes in by itself with the next open — no "cerrar y abrir". The
// service worker itself updates on its own (the browser re-fetches it on open and ~every 24 h), which is what pulls v101 in.
// v100: "Dónde está cada uno" (Reportes) with the normal notices (a new order, for example): every notice that arrives or
// is tapped leaves a mark (Cache Storage "cv-meta"); Caneva Admin, on screen, sends this phone's location with the
// permission it already gave. A service worker has no GPS, so with the app closed it waits for the next open.
// v98: a notice can carry the location of whoever sent it: tapping it opens Caneva Admin with the map
// (iPhone too); on Android the buttons "🗺️ Ver en el mapa" / "🧭 Cómo llegar" go straight to Google Maps.
// v97: notices carry the CΛNEVΛ diamond (large icon) and a diamond silhouette in the Android status bar.
// v88: reminders from Libretas ring with buttons "✓ Hecho" and "⏰ +1 hora" (work even with the app closed, Android/PC;
// on iPhone tapping the notice opens Libretas). Only handles push and taps; it does not cache pages.
const API = "https://caneva-ai.canevacol.workers.dev";
const markNotice = () => caches.open("cv-meta").then(c => c.put("/cv-last-notice", new Response(String(Date.now())))).catch(() => {});
const adminClients = () => self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => (l || []).filter(c => c.url.includes("admin_movil.html"))).catch(() => []);
const SHELL = "cv-shell-v101";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  await self.clients.claim();
  for (const k of await caches.keys()) if (k.startsWith("cv-shell-") && k !== SHELL) await caches.delete(k).catch(() => {});
  // v101: a new version just activated -> reload every open Caneva Admin so it runs the new code, no manual restart
  const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true }).catch(() => []);
  // not awaited: awaiting navigate() inside activate deadlocks (the reload waits for activate to finish)
  for (const c of (list || [])) if (c.url.includes("admin_movil.html")) { try { c.navigate(c.url.split("#")[0]); } catch (e) {} }
})()));

// v101: the page itself (navigation) always comes from the network when online, so the newest version loads by itself;
// the cache is only an offline fallback. The versioned scripts (admin_push.js?v=N) refresh on their own via the ?v=.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      try { (await caches.open(SHELL)).put("shell", fresh.clone()); } catch (x) {}
      return fresh;
    } catch (err) {
      return (await caches.match("shell")) || fetch(req);
    }
  })());
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "CANEVA", body: e.data ? e.data.text() : "" }; }
  const opts = {
    body: d.body || "",
    icon: d.icon || "admin-push-icon.png",
    badge: "admin-push-badge.png",
    tag: d.tag || "caneva",
    renotify: true,
    data: Object.assign({ url: d.url || "admin_movil.html?app=1" }, d.data || {})
  };
  if (Array.isArray(d.actions)) opts.actions = d.actions.slice(0, 2);
  if (d.requireInteraction) opts.requireInteraction = true;
  if (d.data && d.data.rem) opts.vibrate = [80, 60, 80, 60, 160];
  const jobs = [self.registration.showNotification(d.title || "CANEVA", opts)];
  // v100: mark of the notice; if Caneva Admin is open it sends its location now (only when it is on screen)
  jobs.push(markNotice().then(adminClients).then(list => list.forEach(c => c.postMessage({ cv: "seen" }))));
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
      .then(r => r.ok ? null : self.registration.showNotification("CΛNEVΛ", { body: "No se pudo guardar. Ábrelo en Libretas.", icon: "admin-push-icon.png", badge: "admin-push-badge.png", tag: "rem-err" }))
      .catch(() => null)
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then(list => { (list || []).forEach(c => c.postMessage({ cv: "refresh", tab: "libretas" })); }));
    return;
  }
  // v98: shared location → the buttons open Google Maps directly; a tap on the notice shows the map inside the app
  const lc = data.loc && isFinite(data.loc.lat) && isFinite(data.loc.lng) ? data.loc : null;
  if (lc && (e.action === "map" || e.action === "route")) {
    const ll = lc.lat + "," + lc.lng;
    e.waitUntil(self.clients.openWindow(e.action === "route" ? "https://www.google.com/maps/dir/?api=1&destination=" + ll : (data.map || "https://www.google.com/maps/search/?api=1&query=" + ll)));
    return;
  }
  const loc = lc ? { lat: +lc.lat, lng: +lc.lng, acc: +lc.acc || 0, label: String(lc.label || "").slice(0, 80), at: +data.at || e.notification.timestamp || Date.now(), title: e.notification.title || "", body: e.notification.body || "" } : null;
  let url = new URL(data.url || "admin_movil.html?app=1", self.registration.scope).href;
  // in the #hash (never reaches the server): admin_push.js reads it and shows the map
  if (loc) url = url.split("#")[0] + "#cvloc=" + encodeURIComponent(JSON.stringify(loc));
  const tab = (url.match(/[?&]tab=([a-z]+)/) || [])[1] || "";
  // v100: the tap also leaves the mark, so the app (opened or brought to the front) sends its location
  e.waitUntil(Promise.all([markNotice(), self.clients.matchAll({ type: "window", includeUncontrolled: true })]).then(([, list]) => {
    for (const c of list || []) {
      if (c.url.includes("admin_movil.html") && "focus" in c) {
        c.postMessage({ cv: "refresh", tab });
        c.postMessage({ cv: "seen" });
        if (loc) c.postMessage({ cv: "map", loc });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
