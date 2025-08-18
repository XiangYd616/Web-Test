/**
 * 主导航组件;
 * 应用的顶部导航栏;
 */

import React, { useState    } from 'react';import { Link, useLocation    } from 'react-router-dom';import { useAuth    } from '../../contexts/AuthContext';import { usePermissions    } from '../../hooks/usePermissions';import { NavigationItem    } from '../../types/routes';interface MainNavigationProps   { 
  className?: string;
  items: NavigationItem[];
  logo?: React.ReactNode;
  onMenuToggle?: () => void;
 }

export const MainNavigation: React.FC<MainNavigationProps> = ({
  className ='',;
  items,;
  logo,;
  onMenuToggle;
}) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { getAccessibleMenuItems } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 过滤可访问的导航项
  const accessibleItems = getAccessibleMenuItems(items);

  const isActiveItem = (item: NavigationItem): boolean  => {
    if (!item.path) return false;

    if (item.children && item.children.length > 0) {
      return item.children.some(child =>;)
        child.path && location.pathname.startsWith(child.path);
      );
    }

    return location.pathname === item.path ||;
           location.pathname.startsWith(item.path + "/");
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    onMenuToggle?.();
  };

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const isActive = isActiveItem(item);
    const hasChildren = item.children && item.children.length > 0;

    if (item.action) {
      return (<button
          key={index}
          onClick={() => {
            // 处理特殊操作，如登出
            if (item.action ==='logout') {
              // 调用登出逻辑
            }
          }}
          className={ `nav-item nav-button ${isActive ? 'active' : "' }`}'`"`
        >
          {item.icon && <span className="nav-icon'>{item.icon}</span>}'`"`
          <span className='nav-label'>{item.label}</span>
          {item.badge && (
            <span className={`nav-badge nav-badge--${item.badge.variant}`}>`
              {item.badge.text}
            </span>
          )}
        </button>
      );
    }

    if (hasChildren) {
      return (<div key={index} className={ `nav-item nav-dropdown ${isActive ? 'active' : "' }`}>`'"`
          <button className="nav-dropdown-toggle'>`;'"`
            {item.icon && <span className='nav-icon'>{item.icon}</span>}
            <span className='nav-label'>{item.label}</span>
            <span className='nav-arrow'>▼</span>
          </button>
          <div className='nav-dropdown-menu'>
            {item.children?.map((child, childIndex) => (
              <Link
                key={childIndex}
                to={child.path || '#'}
                className={`nav-dropdown-item ${`}
                  location.pathname === child.path ? "active' : "";`'"`
                }`}`
                target={ child.external ? child.target : undefined }
              >
                {child.icon && <span className="nav-icon'>{child.icon}</span>}'`"`
                <span className='nav-label'>{child.label}</span>
                {child.badge && (
                  <span className={`nav-badge nav-badge--${child.badge.variant}`}>`
                    {child.badge.text}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return (;
      <Link
        key={index}
        to={item.path || "#'}'`"`
        className={ `nav-item nav-link ${isActive ? 'active' : '' }`}'`'`
        target={ item.external ? item.target : undefined }
      >
        {item.icon && <span className="nav-icon'>{item.icon}</span>}'`"`
        <span className='nav-label'>{item.label}</span>
        {item.badge && (
          <span className={`nav-badge nav-badge--${item.badge.variant}`}>`
            {item.badge.text}
          </span>
        )}
      </Link>
    );
  };

  return (;
    <nav className={`main-navigation ${className}`}>`
      <div className="nav-container'>`;'"`
        {/* Logo */}
        <div className='nav-brand'>
          {logo || (
            <Link to='/' className='nav-logo'>
              <span className='nav-logo-text'>Test Web</span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className='nav-menu'>
          {accessibleItems.map(renderNavigationItem)}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className='nav-mobile-toggle'
          onClick={handleMobileMenuToggle}
          aria-label='Toggle mobile menu'
        >
          <span className='hamburger-line'></span>
          <span className='hamburger-line'></span>
          <span className='hamburger-line'></span>
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className='nav-mobile-menu'>
          {accessibleItems.map(renderNavigationItem)}
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;