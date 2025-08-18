/**
 * 静态资源优化中间件
 * 提供文件压缩、缓存控制、CDN集成等功能
 */

const compression = require('compression');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * 创建压缩中间件
 */
const createCompressionMiddleware = (options = {}) => {
  const defaultOptions = {
    level: 6, // 压缩级别 (1-9)
    threshold: 1024, // 最小压缩文件大小 (bytes)
    filter: (req, res) => {
      // 默认压缩过滤器
      if (req.headers['x-no-compression']) {

        return false;
      }

      // 检查Content-Type
      const contentType = res.getHeader('content-type');
      if (!contentType) return false;

      // 压缩文本类型文件
      return /text|javascript|json|xml|css|svg/.test(contentType);
    }
  };

  const config = { ...defaultOptions, ...options };

  return compression(config);
};

/**
 * 创建缓存控制中间件
 */
const createCacheControlMiddleware = (options = {}) => {
  const defaultOptions = {
    // 不同文件类型的缓存策略
    strategies: {
      // 静态资源 - 长期缓存
      static: {
        pattern: /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
        maxAge: 365 * 24 * 60 * 60, // 1年
        immutable: true
      },

      // HTML文件 - 短期缓存
      html: {
        pattern: /\.html$/,
        maxAge: 60 * 60, // 1小时
        mustRevalidate: true
      },

      // API响应 - 根据内容缓存
      api: {
        pattern: /^\/api\//,
        maxAge: 5 * 60, // 5分钟
        mustRevalidate: true,
        vary: ['Authorization', 'Accept-Encoding']
      },

      // 默认策略
      default: {
        maxAge: 0,
        noCache: true
      }
    }
  };

  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    const url = req.url;
    const method = req.method;

    // 只处理GET请求
    if (method !== 'GET') {

      return next();
    }

    // 查找匹配的缓存策略
    let strategy = config.strategies.default;

    for (const [name, strategyConfig] of Object.entries(config.strategies)) {
      if (name === 'default') continue;

      if (strategyConfig.pattern.test(url)) {
        strategy = strategyConfig;
        break;
      }
    }

    // 设置缓存头
    setCacheHeaders(res, strategy);

    next();
  };
};

/**
 * 设置缓存头
 */
function setCacheHeaders(res, strategy) {
  const headers = {};

  if (strategy.noCache) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  } else {
    const cacheControl = [];

    if (strategy.maxAge > 0) {
      cacheControl.push(`max-age=${strategy.maxAge}`);
    }

    if (strategy.immutable) {
      cacheControl.push('immutable');
    }

    if (strategy.mustRevalidate) {
      cacheControl.push('must-revalidate');
    }

    if (strategy.public) {
      cacheControl.push('public');
    } else if (strategy.private) {
      cacheControl.push('private');
    }

    headers['Cache-Control'] = cacheControl.join(', ');

    if (strategy.vary) {
      headers['Vary'] = strategy.vary.join(', ');
    }
  }

  // 设置头部
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

/**
 * 创建ETag中间件
 */
const createETagMiddleware = (options = {}) => {
  const defaultOptions = {
    algorithm: 'md5',
    weak: true
  };

  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // 生成ETag
      if (data && !res.getHeader('ETag')) {
        const etag = generateETag(data, config);
        res.setHeader('ETag', etag);

        // 检查If-None-Match头
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {

          res.status(304);
          return res.end();
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * 生成ETag
 */
function generateETag(data, options) {
  const hash = crypto.createHash(options.algorithm);
  hash.update(data);
  const etag = hash.digest('hex');

  return options.weak ? `W/"${etag}"` : `"${etag}"`;
}

/**
 * 创建资源版本管理中间件
 */
const createVersioningMiddleware = (options = {}) => {
  const defaultOptions = {
    versionParam: 'v',
    manifestPath: './public/manifest.json',
    urlPrefix: '/static/'
  };

  const config = { ...defaultOptions, ...options };
  let manifest = null;

  // 加载资源清单
  const loadManifest = async () => {
    try {
      const manifestData = await fs.readFile(config.manifestPath, 'utf8');
      manifest = JSON.parse(manifestData);
    } catch (error) {
      console.warn('无法加载资源清单:', error.message);
      manifest = {};
    }
  };

  // 初始化时加载清单
  loadManifest();

  return (req, res, next) => {
    const url = req.url;

    // 检查是否是静态资源请求
    if (!url.startsWith(config.urlPrefix)) {
      return next();
    }

    // 检查版本参数
    const urlObj = new URL(url, `http://${req.headers.host}`);
    const version = urlObj.searchParams.get(config.versionParam);

    if (version && manifest) {
      // 查找对应的文件
      const filePath = urlObj.pathname.substring(config.urlPrefix.length);
      const versionedFile = manifest[filePath];

      if (versionedFile && versionedFile.version === version) {
        // 设置长期缓存
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }

    next();
  };
};

/**
 * 创建CDN集成中间件
 */
const createCDNMiddleware = (options = {}) => {
  const defaultOptions = {
    cdnDomain: process.env.CDN_DOMAIN,
    enabled: process.env.NODE_ENV === 'production',
    staticPaths: ['/static/', '/assets/', '/images/'],
    rewriteUrls: true
  };

  const config = { ...defaultOptions, ...options };

  if (!config.enabled || !config.cdnDomain) {

    return (req, res, next) => next();
  }

  return (req, res, next) => {
    // 重写静态资源URL
    if (config.rewriteUrls) {
      const originalSend = res.send;

      res.send = function (data) {
        if (typeof data === 'string' && res.getHeader('content-type')?.includes('text/html')) {
          // 替换HTML中的静态资源URL
          data = rewriteStaticUrls(data, config);
        }

        return originalSend.call(this, data);
      };
    }

    next();
  };
};

/**
 * 重写静态资源URL
 */
function rewriteStaticUrls(html, config) {
  let rewrittenHtml = html;

  config.staticPaths.forEach(path => {
    const regex = new RegExp(`(src|href)="(${path}[^"]*)"`, 'g');
    rewrittenHtml = rewrittenHtml.replace(regex, (match, attr, url) => {
      const cdnUrl = `https://${config.cdnDomain}${url}`;
      return `${attr}="${cdnUrl}"`;
    });
  });

  return rewrittenHtml;
}

/**
 * 创建预加载提示中间件
 */
const createPreloadMiddleware = (options = {}) => {
  const defaultOptions = {
    preloadResources: [
      { href: '/static/css/main.css', as: 'style' },
      { href: '/static/js/main.js', as: 'script' },
      { href: '/static/fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
    ]
  };

  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    // 只对HTML页面添加预加载提示
    if (req.path === '/' || req.path.endsWith('.html')) {
      const preloadLinks = config.preloadResources.map(resource => {
        let link = `<${resource.href}>; rel=preload; as=${resource.as}`;

        if (resource.type) {
          link += `; type=${resource.type}`;
        }

        if (resource.crossorigin) {
          link += `; crossorigin=${resource.crossorigin}`;
        }

        return link;
      });

      if (preloadLinks.length > 0) {
        res.setHeader('Link', preloadLinks.join(', '));
      }
    }

    next();
  };
};

/**
 * 创建安全头中间件
 */
const createSecurityHeadersMiddleware = (options = {}) => {
  const defaultOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  };

  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    // Content Security Policy
    if (config.contentSecurityPolicy) {
      const csp = Object.entries(config.contentSecurityPolicy.directives)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');

      res.setHeader('Content-Security-Policy', csp);
    }

    // HTTP Strict Transport Security
    if (config.hsts && req.secure) {
      let hstsValue = `max-age=${config.hsts.maxAge}`;

      if (config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }

      if (config.hsts.preload) {
        hstsValue += '; preload';
      }

      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // 其他安全头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  };
};

module.exports = {
  createCompressionMiddleware,
  createCacheControlMiddleware,
  createETagMiddleware,
  createVersioningMiddleware,
  createCDNMiddleware,
  createPreloadMiddleware,
  createSecurityHeadersMiddleware
};
