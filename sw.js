/* O Códice — service worker (PWA + notificações) */
const CACHE = 'codice-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

/* cache leve do shell (a página). Conteúdo dos dias vem da rede (gated). */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // não intercepta Supabase/áudios/api — sempre rede
  if (url.hostname.includes('supabase') || url.pathname.includes('/audios/')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (url.origin === location.origin) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

/* clicou na notificação → abre o app */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) { if (c.url.includes(location.origin) && 'focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./?app=1');
    })
  );
});

/* lembrete local agendado: a página manda {tipo:'agendar', hora, texto} */
let timer = null;
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo === 'agendar') {
    if (timer) clearTimeout(timer);
    const agora = new Date();
    const alvo = new Date(); alvo.setHours(d.hora || 8, 0, 0, 0);
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
    const ms = alvo - agora;
    timer = setTimeout(() => {
      self.registration.showNotification('O Códice 📖', {
        body: d.texto || 'Seu devocional de hoje te espera. Um passo a mais, do escravo ao filho.',
        icon: 'img/icon-192.png', badge: 'img/icon-192.png', tag: 'codice-diario'
      });
    }, ms);
  }
});
