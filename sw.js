// Atlas mobile : l'interface s'ouvre même hors connexion (les données restent celles de la dernière lecture) ; jamais de données mises en cache ici
const C = "atlas-v2", FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
// bibliothèque Microsoft (MSAL) : adresse à version fixe (contenu immuable, empreinte contrôlée par la page) gardée ici pour l'ouverture hors connexion
const MSAL = "https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.30.0/lib/msal-browser.min.js";
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES).then(() => c.add(new Request(MSAL, { mode: "cors" })).catch(() => {}))).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (e.request.url === MSAL) {
    e.respondWith(caches.match(MSAL).then(r => r || fetch(e.request).then(x => { if (x.ok) { const k = x.clone(); caches.open(C).then(c => c.put(MSAL, k)); } return x; })));
    return;
  }
  if (u.origin !== location.origin) return;   // Microsoft et OneDrive : toujours en direct
  e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
});
