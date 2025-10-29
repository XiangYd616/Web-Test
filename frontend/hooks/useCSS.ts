/**
 * useCSS.ts - 鏍稿績鍔熻兘妯″潡
 * 
 * 鏂囦欢璺緞: frontend\hooks\useCSS.ts
 * 鍒涘缓鏃堕棿: 2025-09-25
 */

import { useEffect, useState } from 'react';
import { loadCSS, _loadPageCSS as loadPageCSS, _loadComponentCSS as loadComponentCSS, _preloadPageCSS as preloadPageCSS } from '../utils/cssLoader';

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

  /**

   * 鑾峰彇load鏁版嵁

   * @param {string} id - 瀵硅薄ID

   * @returns {Promise<Object|null>} 鑾峰彇鐨勬暟鎹?
   */
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

const useComponentCSS = (
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

const useRouteCSS = (routeName: string) => {
  const { loading, loaded, error } = usePageCSS(routeName, {
    immediate: true,
    preload: false
  });

  return { loading, loaded, error };
};

