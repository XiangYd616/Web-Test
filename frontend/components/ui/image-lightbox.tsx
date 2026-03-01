import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailClassName?: string;
}

/**
 * 可点击放大的图片组件。
 * 缩略图点击后弹出全屏 Lightbox，支持 ESC / 点击遮罩关闭。
 */
const ImageLightbox = ({ src, alt = '', className, thumbnailClassName }: ImageLightboxProps) => {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // 阻止滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [open]);

  return (
    <>
      {/* 缩略图 */}
      <div
        className={cn('relative group cursor-zoom-in', className)}
        role='button'
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <img
          src={src}
          alt={alt}
          className={cn('rounded border object-contain', thumbnailClassName)}
        />
        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center pointer-events-none'>
          <svg
            className='w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-md'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6'
            />
          </svg>
        </div>
      </div>

      {/* Lightbox 遮罩 */}
      {open && (
        <div
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out'
          role='dialog'
          aria-modal='true'
          aria-label={alt || 'Image preview'}
          onClick={close}
          onKeyDown={e => {
            if (e.key === 'Escape') close();
          }}
        >
          {/* 关闭按钮 */}
          <button
            className='absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors'
            onClick={close}
            aria-label='Close'
          >
            <svg
              className='w-5 h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={2}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>

          {/* 图片信息 */}
          {alt && (
            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-black/50 text-white text-sm max-w-lg truncate'>
              {alt}
            </div>
          )}

          {/* 大图 */}
          <img
            src={src}
            alt={alt}
            className='max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl'
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export { ImageLightbox };
