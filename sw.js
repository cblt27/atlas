// Atlas mobile : l'interface s'ouvre même hors connexion (les données restent celles de la dernière lecture) ; jamais de données mises en cache ici
// Correctifs mobqa (08/10) : seuls les 6 fichiers de l'app sont gardés, sous leur adresse SANS « ?… » (une adresse avec paramètre ne crée plus de copie,
// la fiche d'exemple de la démo n'est jamais gardée) ; une réponse d'erreur (404, 503) ne remplace jamais la bonne copie (la copie gardée est servie) ;
// hors réseau, une adresse avec « ?… » ouvre l'app (jamais la page d'erreur du navigateur) ; la page est revalidée à chaque ouverture (cache « no-cache » :
// une nouvelle version publiée arrive tout de suite, pas 10 minutes plus tard) ; nom du cache = version de l'app (VERSION_APP de index.html) : à changer à
// chaque publication, l'ancien cache est alors effacé à l'activation.
const C = "atlas-35", FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
const APP = FILES.map(f => new URL(f, location).href);
// bibliothèque Microsoft (MSAL) : adresse à version fixe (contenu immuable, empreinte contrôlée par la page) gardée ici pour l'ouverture hors connexion
const MSAL = "https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.30.0/lib/msal-browser.min.js";
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(APP.map(u => new Request(u, { cache: "reload" }))).then(() => c.add(new Request(MSAL, { mode: "cors" })).catch(() => {}))).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.url === MSAL) {
    e.respondWith(caches.match(MSAL).then(r => r || fetch(e.request).then(x => { if (x.ok) { const k = x.clone(); caches.open(C).then(c => c.put(MSAL, k)); } return x; })));
    return;
  }
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;   // Microsoft et OneDrive : toujours en direct
  const cle = u.origin + u.pathname;
  if (!APP.includes(cle)) return;             // tout autre fichier du site (fiche d'exemple de la démo…) : en direct, jamais gardé
  e.respondWith(fetch(cle, { cache: "no-cache" }).then(r => {
    if (r.ok) { const k = r.clone(); caches.open(C).then(c => c.put(cle, k)); return r; }
    return caches.match(cle).then(m => m || r);   // erreur du serveur : la copie gardée, sinon l'erreur
  }, () => caches.match(cle)
    .then(m => m || (e.request.mode === "navigate" ? caches.match(new URL("./", location).href) : null))
    .then(m => m || Response.error())));
});
