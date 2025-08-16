/**
 * 懒加载图片组件
 * 支持渐进式加载和占位符
 */

import React, { useState, useRef, useEffect } from 'react';

export interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
  rootMargin?: string;
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  style,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px',
  blurDataURL,
  quality = 75,
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置Intersection Observer
  useEffect(() => {
    if (priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, priority, isInView]);

  // 处理图片加载
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // 处理图片错误
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // 生成优化的图片URL
  const getOptimizedSrc = (originalSrc: string, quality: number) => {
    // 这里可以集成图片CDN或优化服务
    // 例如：return `${originalSrc}?q=${quality}&auto=format`;
    return originalSrc;
  };

  const optimizedSrc = getOptimizedSrc(src, quality);

  return (
    <div
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* 占位符 */}
      {!isLoaded && !hasError && (
        <div
          className="lazy-image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: blurDataURL ? 'blur(10px)' : undefined
          }}
        >
          {placeholder && !blurDataURL && (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
      )}

      {/* 实际图片 */}
      {isInView && !hasError && (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isLoaded ? 1 : 0
          }}
        />
      )}

      {/* 错误状态 */}
      {hasError && (
        <div
          className="lazy-image-error"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999'
          }}
        >
          <span>图片加载失败</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;