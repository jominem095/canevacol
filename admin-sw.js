// Caneva Admin service worker (v74): shows the store notices and puts the red number on the app icon.
// Only handles push and notification taps; it does not cache pages, so the admin always loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "CANEVA", body: e.data ? e.data.text() : "" }; }
  const jobs = [self.registration.showNotification(d.title || "CANEVA", {
    body: d.body || "",
    icon: "admin-icon-192.png",
    badge: "admin-icon-192.png",
    tag: d.tag || "caneva",
    renotify: true,
    data: { url: d.url || "admin_movil.html?app=1" }
  })];
  // red number on the "Caneva Admin" icon, even with the app closed
  if (typeof d.badge === "number" && self.navigator && "setAppBadge" in self.navigator) {
    jobs.push((d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(() => {}));
  }
  e.waitUntil(Promise.all(jobs));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "admin_movil.html?app=1", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.includes("admin_movil.html") && "focus" in c) { c.postMessage({ cv: "refresh" }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
