/**
 * 静态资源优化中间件
 * 提供文件压缩、缓存控制、CDN集成等功能
 */

import compression from 'compression';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

interface CompressionOptions {
  level?: number;
  threshold?: number;
  filter?: (req: Request, res: Response) => boolean;
}

interface CacheOptions {
  maxAge?: number;
  etag?: boolean;
  lastModified?: boolean;
  immutable?: boolean;
}

interface CDNOptions {
  enabled?: boolean;
  domain?: string;
  subdomains?: string[];
  https?: boolean;
}

interface OptimizationOptions {
  compression?: CompressionOptions;
  cache?: CacheOptions;
  cdn?: CDNOptions;
  minification?: boolean;
  imageOptimization?: boolean;
}

interface FileStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  lastModified: Date;
  etag: string;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * 创建压缩中间件
 */
const createCompressionMiddleware = (options: CompressionOptions = {}) => {
  const defaultOptions: CompressionOptions = {
    level: 6, // 压缩级别 (1-9)
    threshold: 1024, // 最小压缩文件大小 (bytes)
    filter: (req: Request, res: Response) => {
      // 默认压缩过滤器
      if (req.headers['x-no-compression']) {
        return false;
      }

      // 检查Content-Type
      const contentType = res.getHeader('content-type');
      if (!contentType) return false;

      // 压缩文本类型文件
      return /text|javascript|json|xml|css|svg/.test(contentType as string);
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };
  return compression(mergedOptions);
};

/**
 * 创建缓存控制中间件
 */
const createCacheMiddleware = (options: CacheOptions = {}) => {
  const {
    maxAge = 86400000, // 1天 (秒)
    etag = true,
    lastModified = true,
    immutable = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 设置缓存控制头
    const cacheControl = immutable
      ? `public, max-age=${maxAge}, immutable`
      : `public, max-age=${maxAge}`;

    res.setHeader('Cache-Control', cacheControl);

    // 设置ETag
    if (etag) {
      const fileContent = res.locals.fileContent;
      if (fileContent) {
        const hash = crypto.createHash('md5').update(fileContent).digest('hex');
        res.setHeader('ETag', `"${hash}"`);
      }
    }

    // 设置Last-Modified
    if (lastModified) {
      const lastModified = res.locals.lastModified;
      if (lastModified) {
        res.setHeader('Last-Modified', lastModified.toUTCString());
      }
    }

    // 处理条件请求
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];

    if (ifNoneMatch && res.getHeader('etag') === ifNoneMatch) {
      return res.status(304).end();
    }

    if (ifModifiedSince && res.getHeader('last-Modified') === ifModifiedSince) {
      return res.status(304).end();
    }

    next();
  };
};

/**
 * 创建CDN中间件
 */
const createCDNMiddleware = (options: CDNOptions = {}) => {
  const { enabled = false, domain = '', subdomains = [], https = true } = options;

  if (!enabled || !domain) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const protocol = https ? 'https' : 'http';
    const subdomain =
      subdomains.length > 0 ? subdomains[Math.floor(Math.random() * subdomains.length)] : '';

    const cdnUrl = `${protocol}://${subdomain ? `${subdomain}.` : ''}${domain}`;

    // 设置CDN相关头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');

    // 如果是静态资源请求，重定向到CDN
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i)) {
      return res.redirect(301, `${cdnUrl}${req.url}`);
    }

    next();
  };
};

/**
 * 文件统计信息
 */
const fileStats = new Map<string, FileStats>();

/**
 * 获取文件统计
 */
const getFileStats = (filePath: string): FileStats => {
  return (
    fileStats.get(filePath) || {
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      lastModified: new Date(),
      etag: '',
      cacheHits: 0,
      cacheMisses: 0,
    }
  );
};

/**
 * 更新文件统计
 */
const updateFileStats = (filePath: string, stats: Partial<FileStats>) => {
  const currentStats = getFileStats(filePath);
  const updatedStats = { ...currentStats, ...stats };
  fileStats.set(filePath, updatedStats);
  return updatedStats;
};

/**
 * 文件压缩统计中间件
 */
const compressionStatsMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSize = parseInt((res.getHeader('content-length') as string) || '0', 10);

    res.on('finish', () => {
      const endTime = Date.now();
      const compressedSize = parseInt((res.getHeader('content-length') as string) || '0', 10);
      const filePath = req.path;

      if (originalSize > 0 && compressedSize > 0) {
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        updateFileStats(filePath, {
          originalSize,
          compressedSize,
          compressionRatio,
          lastModified: new Date(),
        });
      }
    });

    next();
  };
};

/**
 * 缓存统计中间件
 */
const cacheStatsMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const filePath = req.path;

    res.on('finish', () => {
      if (res.statusCode === 304) {
        // 缓存命中
        const stats = getFileStats(filePath);
        updateFileStats(filePath, {
          cacheHits: stats.cacheHits + 1,
        });
      } else if (res.statusCode === 200) {
        // 缓存未命中
        const stats = getFileStats(filePath);
        updateFileStats(filePath, {
          cacheMisses: stats.cacheMisses + 1,
        });
      }
    });

    next();
  };
};

/**
 * 图片优化中间件
 */
const imageOptimizationMiddleware = (
  options: {
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
    sizes?: number[];
  } = {}
) => {
  const { quality = 80, format = 'auto', sizes = [1920, 1280, 960, 640, 480] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否为图片请求
    if (!req.url.match(/\.(png|jpg|jpeg|gif)$/i)) {
      return next();
    }

    // 解析请求参数
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const requestedQuality = parseInt(urlParams.get('quality') || quality.toString(), 10);
    const requestedFormat = urlParams.get('format') || format;
    const requestedSize = parseInt(urlParams.get('size') || '', 10);

    // 设置图片优化头
    res.setHeader('Vary', 'Accept');
    res.setHeader('Accept-CH', 'Width, Viewport-Width, DPR');

    // 如果支持WebP，优先使用WebP
    if (requestedFormat === 'auto' && req.headers.accept?.includes('image/webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }

    next();
  };
};

/**
 * 创建完整的优化中间件
 */
const createOptimizationMiddleware = (options: OptimizationOptions = {}) => {
  const middlewares = [];

  // 添加压缩中间件
  if (options.compression !== false) {
    middlewares.push(createCompressionMiddleware(options.compression));
  }

  // 添加缓存中间件
  if (options.cache !== false) {
    middlewares.push(createCacheMiddleware(options.cache));
  }

  // 添加CDN中间件
  if (options.cdn?.enabled) {
    middlewares.push(createCDNMiddleware(options.cdn));
  }

  // 添加统计中间件
  middlewares.push(compressionStatsMiddleware());
  middlewares.push(cacheStatsMiddleware());

  // 添加图片优化中间件
  if (options.imageOptimization !== false) {
    middlewares.push(imageOptimizationMiddleware());
  }

  return middlewares;
};

/**
 * 获取优化统计
 */
const getOptimizationStats = () => {
  const stats = Array.from(fileStats.values());

  const totalOriginalSize = stats.reduce((sum, stat) => sum + stat.originalSize, 0);
  const totalCompressedSize = stats.reduce((sum, stat) => sum + stat.compressedSize, 0);
  const totalCacheHits = stats.reduce((sum, stat) => sum + stat.cacheHits, 0);
  const totalCacheMisses = stats.reduce((sum, stat) => sum + stat.cacheMisses, 0);

  return {
    files: stats.length,
    totalOriginalSize,
    totalCompressedSize,
    compressionRatio:
      totalOriginalSize > 0
        ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
        : 0,
    cacheHitRate:
      totalCacheHits + totalCacheMisses > 0
        ? (totalCacheHits / (totalCacheHits + totalCacheMisses)) * 100
        : 0,
    totalCacheHits,
    totalCacheMisses,
    bandwidthSaved: totalOriginalSize - totalCompressedSize,
  };
};

/**
 * 清理过期统计
 */
const cleanupStats = (maxAge: number = 7 * 24 * 60 * 60 * 1000) => {
  const cutoffTime = Date.now() - maxAge;
  let cleanedCount = 0;

  for (const [filePath, stats] of fileStats.entries()) {
    if (stats.lastModified.getTime() < cutoffTime) {
      fileStats.delete(filePath);
      cleanedCount++;
    }
  }

  return cleanedCount;
};

export {
  CacheOptions,
  CDNOptions,
  cleanupStats,
  CompressionOptions,
  createCacheMiddleware,
  createCDNMiddleware,
  createCompressionMiddleware,
  createOptimizationMiddleware,
  FileStats,
  getFileStats,
  getOptimizationStats,
  imageOptimizationMiddleware,
  OptimizationOptions,
  updateFileStats,
};

export default createOptimizationMiddleware;
