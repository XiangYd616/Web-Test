/**
 * 侧边栏导航组件
 * 应用的侧边栏导航菜单
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { NavigationItem } from '../../types/routes';

interface SidebarNavigationProps {
  className?: string;
  items: NavigationItem[];
  collapsed?: boolean;
  onToggle?: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  className = '',
  items,
  collapsed = false,
  onToggle
}) => {
  const location = useLocation();
  const { getAccessibleMenuItems } = usePermissions();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 过滤可访问的导航项
  const accessibleItems = getAccessibleMenuItems(items);

  const isActiveItem = (item: NavigationItem): boolean => {
    if (!item.path) return false;

    if (item.children && item.children.length > 0) {
      return item.children.some(child =>
        child.path && location.pathname.startsWith(child.path)
      );
    }

    return location.pathname === item.path ||
           location.pathname.startsWith(item.path + '/');
  };

  const toggleExpanded = (itemLabel: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemLabel)) {
      newExpanded.delete(itemLabel);
    } else {
      newExpanded.add(itemLabel);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = isActiveItem(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);

    if (hasChildren) {
      return (
        <div key={item.label} className={`sidebar-item sidebar-group level-${level}`}>
          <button
            className={`sidebar-group-toggle ${isActive ? 'active' : ''}`}
            onClick={() => toggleExpanded(item.label)}
            aria-expanded={isExpanded}
          >
            {item.icon && <span className="sidebar-icon">{item.icon}</span>}
            {!collapsed && (
              <>
                <span className="sidebar-label">{item.label}</span>
                <span className={`sidebar-arrow ${isExpanded ? 'expanded' : ''}`}>
                  ▼
                </span>
              </>
            )}
          </button>

          {isExpanded && !collapsed && (
            <div className="sidebar-submenu">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.path || '#'}
        className={`sidebar-item sidebar-link level-${level} ${isActive ? 'active' : ''}`}
        title={collapsed ? item.label : undefined}
      >
        {item.icon && <span className="sidebar-icon">{item.icon}</span>}
        {!collapsed && (
          <>
            <span className="sidebar-label">{item.label}</span>
            {item.badge && (
              <span className={`sidebar-badge sidebar-badge--${item.badge.variant}`}>
                {item.badge.text}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside className={`sidebar-navigation ${collapsed ? 'collapsed' : ''} ${className}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-menu">
        {accessibleItems.map(item => renderNavigationItem(item))}
      </nav>
    </aside>
  );
};

export default SidebarNavigation;