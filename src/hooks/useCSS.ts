import { useEffect, useState } from 'react';
import { loadCSS, loadPageCSS, loadComponentCSS, preloadPageCSS } from '../utils/cssLoader';

/**
 * 用于动态加载CSS的React Hook
 * @param cssPath CSS文件路径
 * @param options 加载选项
 * @returns 加载状态
 */
export const useCSS = (
  cssPath: string,
  options: {
    immediate?: boolean;
    id?: string;
  } = {}
) => {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.immediate) return;

    const loadCSSFile = async () => {
      setLoading(true);
      setError(null);

      try {
        await loadCSS(cssPath, options.id);
        setLoaded(true);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadCSSFile();
  }, [cssPath, options.immediate, options.id]);

  const load = async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      await loadCSS(cssPath, options.id);
      setLoaded(true);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, loaded, error, load };
};

/**
 * 用于加载页面特定CSS的Hook
 * @param pageName 页面名称
 * @param options 加载选项
 * @returns 加载状态和控制函数
 */
export const usePageCSS = (
  pageName: string,
  options: {
    immediate?: boolean;
    preload?: boolean;
  } = {}
) => {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options.preload) {
      preloadPageCSS(pageName);
    }

    if (!options.immediate) return;

    const loadPageCSSFiles = async () => {
      setLoading(true);
      setError(null);

      try {
        await loadPageCSS(pageName);
        setLoaded(true);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadPageCSSFiles();
  }, [pageName, options.immediate, options.preload]);

  const load = async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      await loadPageCSS(pageName);
      setLoaded(true);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, loaded, error, load };
};

/**
 * 用于加载组件特定CSS的Hook
 * @param componentName 组件名称
 * @param options 加载选项
 * @returns 加载状态和控制函数
 */
export const useComponentCSS = (
  componentName: string,
  options: {
    immediate?: boolean;
  } = {}
) => {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.immediate) return;

    const loadComponentCSSFile = async () => {
      setLoading(true);
      setError(null);

      try {
        await loadComponentCSS(componentName);
        setLoaded(true);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadComponentCSSFile();
  }, [componentName, options.immediate]);

  const load = async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      await loadComponentCSS(componentName);
      setLoaded(true);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, loaded, error, load };
};

/**
 * 用于路由级别CSS加载的Hook
 * @param routeName 路由名称
 * @returns 加载状态
 */
export const useRouteCSS = (routeName: string) => {
  const { loading, loaded, error } = usePageCSS(routeName, {
    immediate: true,
    preload: false
  });

  return { loading, loaded, error };
};
