/**
 * 优化的图片组件
 * 支持懒加载、WebP格式、响应式图片等功能
 */

import React, { useEffect, useState } from 'react';
import {useDevicePerformance, useLazyImage, useNetworkStatus} from '../../hooks/usePerformanceOptimization';

interface ImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    sizes?: string;
    priority?: boolean; // 是否优先加载
    placeholder?: string; // 占位图片
    blurDataURL?: string; // 模糊占位图
    quality?: number; // 图片质量 (1-100)
    format?: 'webp' | 'jpg' | 'png' | 'auto';
    responsive?: boolean; // 是否响应式
    loading?: 'lazy' | 'eager';
    onLoad?: () => void;
    onError?: () => void;
}

const Image: React.FC<ImageProps> = ({
    src,
    alt,
    className = '',
    width,
    height,
    sizes,
    priority = false,
    placeholder,
    blurDataURL,
    quality = 75,
    format = 'auto',
    responsive = true,
    loading = 'lazy',
    onLoad,
    onError
}) => {
    const { imgRef, loaded, error } = useLazyImage();
    const { isSlowNetwork } = useNetworkStatus();
    const { performanceLevel } = useDevicePerformance();
    const [currentSrc, setCurrentSrc] = useState<string>('');
    const [showPlaceholder, setShowPlaceholder] = useState(true);

    // 根据网络状况和设备性能调整图片质量
    const getOptimizedQuality = () => {
        if (isSlowNetwork) return Math.min(quality, 50);
        if (performanceLevel === 'low') return Math.min(quality, 60);
        return quality;
    };

    // 生成优化的图片URL
    const generateOptimizedUrl = (originalSrc: string) => {
        const url = new URL(originalSrc, window.location.origin);
        const params = new URLSearchParams();

        // 添加质量参数
        params.set('q', getOptimizedQuality().toString());

        // 添加格式参数
        if (format !== 'auto') {
            params.set('f', format);
        } else {
            // 自动选择最佳格式
            if (supportsWebP()) {
                params.set('f', 'webp');
            }
        }

        // 添加尺寸参数
        if (width) params.set('w', width.toString());
        if (height) params.set('h', height.toString());

        // 如果有参数，添加到URL
        if (params.toString()) {
            url.search = params.toString();
        }

        return url.toString();
    };

    // 检查浏览器是否支持WebP
    const supportsWebP = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    // 生成响应式图片的srcset
    const generateSrcSet = () => {
        if (!responsive || !width) return undefined;

        const breakpoints = [0.5, 1, 1.5, 2]; // 不同像素密度
        return breakpoints
            .map(ratio => {
                const scaledWidth = Math.round(width * ratio);
                const optimizedUrl = generateOptimizedUrl(src);
                const url = new URL(optimizedUrl);
                url.searchParams.set('w', scaledWidth.toString());
                return `${url.toString()} ${ratio}x`;
            })
            .join(', ');
    };

    useEffect(() => {
        if (priority || loading === 'eager') {
            // 优先加载的图片立即设置src
            setCurrentSrc(generateOptimizedUrl(src));
        } else {
            // 懒加载图片使用data-src
            setCurrentSrc('');
        }
    }, [src, priority, loading]);

    useEffect(() => {
        if (loaded) {
            setShowPlaceholder(false);
            onLoad?.();
        }
    }, [loaded, onLoad]);

    useEffect(() => {
        if (error) {
            onError?.();
        }
    }, [error, onError]);

    // 占位符样式
    const placeholderStyle: React.CSSProperties = {
        backgroundColor: '#f3f4f6',
        backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: blurDataURL ? 'blur(10px)' : undefined,
        transition: 'opacity 0.3s ease-in-out'
    };

    // 图片样式
    const imageStyle: React.CSSProperties = {
        transition: 'opacity 0.3s ease-in-out',
        opacity: loaded ? 1 : 0
    };

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* 占位符 */}
            {showPlaceholder && (
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={placeholderStyle}
                >
                    {placeholder ? (
                        <img
                            src={placeholder}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    )}
                </div>
            )}

            {/* 主图片 */}
            <img
                ref={imgRef}
                src={priority || loading === 'eager' ? currentSrc : undefined}
                data-src={priority || loading === 'eager' ? undefined : generateOptimizedUrl(src)}
                srcSet={generateSrcSet()}
                sizes={sizes}
                alt={alt}
                width={width}
                height={height}
                className={`w-full h-full object-cover lazy-loading ${loaded ? 'lazy-loaded' : ''}`}
                style={imageStyle}
                loading={loading}
            />

            {/* 错误状态 */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">图片加载失败</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Image;