/**
 * Service Worker for caching and performance optimization
 */

const CACHE_NAME = 'test-web-app-v1';
const STATIC_CACHE_NAME = 'test-web-app-static-v1';
const DYNAMIC_CACHE_NAME = 'test-web-app-dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/favicon.ico',
  '/vite.svg'
];

// 需要缓存的API路径模式
const API_CACHE_PATTERNS = [
  /^\/api\/v1\/system\/config/,
  /^\/api\/v1\/user\/profile/,
  /^\/api\/v1\/statistics/
];

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源：缓存优先
  static: {
    cacheName: STATIC_CACHE_NAME,
    strategy: 'cacheFirst',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    maxEntries: 100
  },

  // API响应：网络优先，缓存降级
  api: {
    cacheName: DYNAMIC_CACHE_NAME,
    strategy: 'networkFirst',
    maxAge: 5 * 60 * 1000, // 5分钟
    maxEntries: 50
  },

  // 图片：缓存优先
  images: {
    cacheName: 'test-web-app-images-v1',
    strategy: 'cacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    maxEntries: 200
  }
};

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_STRATEGIES.images.cacheName) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 确定缓存策略
  let strategy = null;

  if (isStaticAsset(request)) {
    strategy = CACHE_STRATEGIES.static;
  } else if (isAPIRequest(request)) {
    strategy = CACHE_STRATEGIES.api;
  } else if (isImageRequest(request)) {
    strategy = CACHE_STRATEGIES.images;
  }

  if (strategy) {
    event.respondWith(handleRequest(request, strategy));
  }
});

// 判断是否为静态资源
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|html|ico|svg|woff2?|ttf|eot)$/);
}

// 判断是否为API请求
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
    API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 判断是否为图片请求
function isImageRequest(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/);
}

// 处理请求
async function handleRequest(request, strategy) {
  switch (strategy.strategy) {
    case 'cacheFirst':
      return cacheFirst(request, strategy);
    case 'networkFirst':
      return networkFirst(request, strategy);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, strategy);
    default:
      return fetch(request);
  }
}

// 缓存优先策略
async function cacheFirst(request, strategy) {
  try {
    const cache = await caches.open(strategy.cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // 检查缓存是否过期
      const cachedDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();

      if (now - cachedDate < strategy.maxAge) {
        return cachedResponse;
      }
    }

    // 缓存未命中或已过期，从网络获取
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 克隆响应用于缓存
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);

      // 清理过期缓存
      await cleanupCache(strategy.cacheName, strategy.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);

    // 降级到缓存
    const cache = await caches.open(strategy.cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 返回离线页面或错误响应
    return new Response('Network error', { status: 503 });
  }
}

// 网络优先策略
async function networkFirst(request, strategy) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(strategy.cacheName);
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);

      // 清理过期缓存
      await cleanupCache(strategy.cacheName, strategy.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('Network first strategy failed:', error);

    // 降级到缓存
    const cache = await caches.open(strategy.cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // 检查缓存是否过期
      const cachedDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();

      if (now - cachedDate < strategy.maxAge) {
        return cachedResponse;
      }
    }

    return new Response('Network error', { status: 503 });
  }
}

// 过期重新验证策略
async function staleWhileRevalidate(request, strategy) {
  const cache = await caches.open(strategy.cacheName);
  const cachedResponse = await cache.match(request);

  // 异步更新缓存
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  // 如果有缓存，立即返回；否则等待网络响应
  return cachedResponse || fetchPromise;
}

// 清理过期缓存
async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    // 删除最旧的缓存项
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// 消息处理
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', payload: stats });
      });
      break;

    case 'CLEAR_CACHE':
      clearCache(payload.cacheName).then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    case 'PRELOAD_ROUTES':
      preloadRoutes(payload.routes);
      break;
  }
});

// 获取缓存统计
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }

  return stats;
}

// 清理指定缓存
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

// 预加载路由
async function preloadRoutes(routes) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);

  for (const route of routes) {
    try {
      const response = await fetch(route);
      if (response.ok) {
        await cache.put(route, response);
      }
    } catch (error) {
      console.warn('Failed to preload route:', route, error);
    }
  }
}

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  // 这里可以实现离线数据同步逻辑
  console.log('Background sync triggered');
}

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        data: data.data
      })
    );
  }
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});