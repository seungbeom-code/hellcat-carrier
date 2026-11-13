// 오프라인 실행용 서비스 워커: 한 번 열어 두면 인터넷이 없어도 게임이 열린다
// 아이콘이나 manifest 를 바꾸면 CACHE 이름의 숫자를 올린다
const CACHE = 'blue-wings-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // 게임 페이지: 인터넷이 되면 항상 서버에 새 판이 있는지 확인해서 받고, 안 되면 저장해 둔 판을 쓴다
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req.url, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // 아이콘·manifest: 저장해 둔 게 있으면 바로 쓰고, 없으면 받아서 저장
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put(req, copy)); }
      return res;
    })),
  );
});
