// Service worker du Grenier Communautaire.
//  - Page hors connexion : si une navigation échoue faute de réseau, on affiche /offline.html.
//    Aucune donnée (demandes, stocks, messages) n'est mise en cache : elles restent toujours à jour
//    et rien de personnel ne reste stocké sur l'appareil.
//  - Notifications push : affichage et ouverture de la page concernée au clic.

const CACHE = "grenier-offline-v1";
const OFFLINE_ASSETS = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("grenier-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }
  // Ressources de la page hors connexion (même origine uniquement).
  const url = new URL(req.url);
  if (url.origin === self.location.origin && OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(url.pathname)));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Grenier Communautaire";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag, // une notification par demande : la plus récente remplace la précédente
      renotify: Boolean(data.tag),
      data: { url: data.url || "/demarrer" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Seules les adresses du site sont ouvertes (jamais une URL externe venue du message).
  const target = new URL(event.notification.data?.url || "/demarrer", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === target.origin && "focus" in w) {
          w.navigate(target.href);
          return w.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
