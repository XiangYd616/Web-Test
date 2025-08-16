import {useEffect, useState} from 'react';
import {loadCSS, loadPageCSS, loadComponentCSS, preloadPageCSS} from '../utils/cssLoader';

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

export const useRouteCSS = (routeName: string) => {
  const { loading, loaded, error } = usePageCSS(routeName, {
    immediate: true,
    preload: false
  });

  return { loading, loaded, error };
};
