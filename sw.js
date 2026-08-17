/* ============================================================
   人生管理系统 - Service Worker
   缓存策略：安装时预缓存核心文件，运行时网络优先回退缓存
   ============================================================ */
const CACHE_NAME = 'life-mgmt-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './life-management.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {
        // 部分资源（如本地图标）缺失时忽略，保证安装成功
        console.log('部分资源预缓存失败，忽略');
      });
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求：网络优先，失败时回退缓存（CDN资源直连，不缓存）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 跨域请求（如 Chart.js CDN）直接放行，不拦截
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 只缓存成功的同源 GET 请求
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        return cached || caches.match('./index.html') || caches.match('./life-management.html');
      }))
  );
});
