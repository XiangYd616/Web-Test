/**
 * 页面标题管理Hook
 * 动态设置和管理页面标题
 */

import { useEffect, useRef    } from 'react';import { useLocation    } from 'react-router-dom';interface PageTitleOptions   {'
  suffix?: string;
  separator?: string;
  template?: string;
}

export const usePageTitle = (title?: string,
  options: PageTitleOptions = {}
) => {
  const location = useLocation();
  const previousTitle = useRef<string>('');'
  const {
    suffix = 'Test Web','
    separator = ' - ','
    template = '{title}{separator}{suffix}';
  } = options;

  useEffect(() => {
    if (title) {
      // 保存之前的标题
      previousTitle.current = document.title;

      // 设置新标题
      const newTitle = template
        .replace('{title}', title)'
        .replace('{separator}', separator)'
        .replace('{suffix}', suffix);'
      document.title = newTitle;
    }

    // 清理函数：恢复之前的标题
    return () => {
      if (previousTitle.current) {
        document.title = previousTitle.current;
      }
    };
  }, [title, suffix, separator, template]);

  // 动态设置标题的函数
  const setTitle = (newTitle: string) => {
    const formattedTitle = template
      .replace('{title}', newTitle)'
      .replace('{separator}', separator)'
      .replace('{suffix}', suffix);'
    document.title = formattedTitle;
  };

  // 重置为默认标题
  const resetTitle = () => {
    document.title = suffix;
  };

  return {
    setTitle,
    resetTitle,
    currentTitle: document.title
  };
};

/**
 * 页面元数据管理Hook
 */
export const usePageMeta = () => {
  const setMetaTag = (name: string, content: string) => {
    let metaTag = document.querySelector(`meta[name= '${name}']`) as HTMLMetaElement;'`

    if (!metaTag) {
      metaTag = document.createElement("meta');'`
      metaTag.name = name;
      document.head.appendChild(metaTag);
    }

    metaTag.content = content;
  };

  const setDescription = (description: string) => {
    setMetaTag('description', description);'
  };

  const setKeywords = (keywords: string[]) => {
    setMetaTag('keywords', keywords.join(', '));'
  };

  const setOGTitle = (title: string) => {
    setMetaTag('og:title', title);'
  };

  const setOGDescription = (description: string) => {
    setMetaTag('og:description', description);'
  };

  const setOGImage = (imageUrl: string) => {
    setMetaTag('og:image', imageUrl);'
  };

  return {
    setMetaTag,
    setDescription,
    setKeywords,
    setOGTitle,
    setOGDescription,
    setOGImage
  };
};

export default usePageTitle;