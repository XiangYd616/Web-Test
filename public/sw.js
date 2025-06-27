// Service Worker for Test Web App
const CACHE_NAME = 'test-web-app-v1.0.0';
const STATIC_CACHE_NAME = 'test-web-app-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'test-web-app-dynamic-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  // 添加其他静态资源
];

// 需要缓存的 API 路径
const API_CACHE_PATTERNS = [
  /^\/api\/.*$/,
];

// 检测是否为开发环境
function isDevelopment() {
  return location.hostname === 'localhost' ||
         location.hostname === '127.0.0.1' ||
         location.port === '5174';
}

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');

  // 在开发环境中跳过预缓存
  if (isDevelopment()) {
    console.log('[SW] Development mode - skipping static asset caching');
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting(); // 强制激活新的 SW
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
        // 在开发环境中，即使缓存失败也要继续
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('test-web-app-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // 立即控制所有页面
      })
  );
});



// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 开发环境特殊处理 - 大幅减少拦截
  if (isDevelopment()) {
    // 在开发环境中，只处理明确需要缓存的静态资源
    if (!isStaticAsset(request) ||
        url.pathname.includes('/@vite/') ||
        url.pathname.includes('/@fs/') ||
        url.pathname.includes('/@id/') ||
        url.pathname.includes('/__vite_ping') ||
        url.pathname.includes('/node_modules/') ||
        url.pathname.includes('/src/') ||
        url.searchParams.has('import') ||
        url.searchParams.has('t') ||
        request.headers.get('accept')?.includes('text/x-component')) {
      return; // 让浏览器直接处理这些请求
    }
  }

  // 处理导航请求 (HTML 页面)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 处理静态资源
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // 处理 API 请求
  if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // 其他请求使用网络优先策略
  event.respondWith(handleOtherRequest(request));
});

// 处理导航请求 - 缓存优先，网络回退
async function handleNavigationRequest(request) {
  try {
    // 尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving navigation from cache:', request.url);
      return cachedResponse;
    }

    // 缓存未命中，从网络获取
    const networkResponse = await fetch(request);
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Navigation request failed:', error);
    
    // 返回离线页面或缓存的首页
    const fallbackResponse = await caches.match('/') || 
                             await caches.match('/index.html');
    
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // 返回基本的离线页面
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>离线模式 - Test Web App</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: #f3f4f6;
              color: #374151;
            }
            .container { 
              text-align: center; 
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { margin: 0 0 1rem 0; color: #1f2937; }
            p { margin: 0 0 1.5rem 0; color: #6b7280; }
            button { 
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 6px; 
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>当前处于离线模式</h1>
            <p>请检查您的网络连接，然后重试。</p>
            <button onclick="window.location.reload()">重新加载</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// 处理静态资源 - 缓存优先
async function handleStaticAssetRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset request failed:', error);
    throw error;
  }
}

// 处理 API 请求 - 网络优先，缓存回退
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 只缓存 GET 请求的成功响应
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] API request failed, trying cache:', error);
    
    // 网络失败，尝试从缓存获取
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving API from cache:', request.url);
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// 处理其他请求 - 网络优先
async function handleOtherRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[SW] Other request failed:', error);

    // 在开发环境中，对于某些失败的请求，我们可以更宽容
    if (isDevelopment()) {
      // 对于开发环境的特殊请求，返回一个简单的响应而不是抛出错误
      const url = new URL(request.url);
      if (url.pathname.includes('.tsx') ||
          url.pathname.includes('.ts') ||
          url.pathname.includes('.jsx') ||
          url.pathname.includes('.js')) {
        return new Response('// Development mode - file not found', {
          status: 404,
          headers: { 'Content-Type': 'application/javascript' }
        });
      }
    }

    throw error;
  }
}

// 判断是否为静态资源
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// 判断是否为 API 请求
function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 监听消息事件
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  // 这里可以实现后台数据同步逻辑
}

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open_app') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
