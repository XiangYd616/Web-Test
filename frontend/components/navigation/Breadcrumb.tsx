/**
 * 面包屑导航组件
 * 显示当前页面的导航路径
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BreadcrumbItem } from '../../types/routes';
import { generateBreadcrumbs } from '../../utils/routeUtils';

interface BreadcrumbProps {
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
  items?: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className = '',
  separator = '/',
  maxItems = 5,
  showHome = true,
  homeLabel = '首页',
  homePath = '/',
  items: customItems
}) => {
  const location = useLocation();

  // 生成面包屑项目
  const breadcrumbItems = customItems || generateBreadcrumbs(location.pathname, []);

  // 添加首页项目
  const allItems = showHome
    ? [{ label: homeLabel, path: homePath }, ...breadcrumbItems]
    : breadcrumbItems;

  // 限制显示的项目数量
  const displayItems = allItems.length > maxItems
    ? [
        allItems[0],
        { label: '...', path: undefined },
        ...allItems.slice(-maxItems + 2)
      ]
    : allItems;

  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <nav className={`breadcrumb ${className}`} aria-label="面包屑导航">
      <ol className="breadcrumb-list">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li
              key={index}
              className={`breadcrumb-item ${isLast ? 'active' : ''} ${isEllipsis ? 'ellipsis' : ''}`}
            >
              {!isLast && !isEllipsis && item.path ? (
                <Link
                  to={item.path}
                  className="breadcrumb-link"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-text">{item.label}</span>
                </Link>
              ) : (
                <span className="breadcrumb-text">
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * 面包屑Hook
 */
export const useBreadcrumb = () => {
  const location = useLocation();

  const setBreadcrumb = (items: BreadcrumbItem[]) => {
    // 可以通过Context或状态管理来设置自定义面包屑
  };

  const addBreadcrumbItem = (item: BreadcrumbItem) => {
    // 添加面包屑项目
  };

  return {
    currentPath: location.pathname,
    setBreadcrumb,
    addBreadcrumbItem
  };
};

export default Breadcrumb;