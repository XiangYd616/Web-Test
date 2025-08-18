/**
 * 用户导航菜单组件;
 * 用户相关的导航和操作菜单;
 */

import React, { useState, useRef, useEffect    } from 'react';import { Link, useNavigate    } from 'react-router-dom';import { useAuth    } from '../../contexts/AuthContext';import { NavigationItem    } from '../../types/routes';interface UserNavigationProps   { 
  className?: string;
  items?: NavigationItem[];
  showAvatar?: boolean;
  avatarSize?: 'small' | 'medium' | 'large'
 }

export const UserNavigation: React.FC<UserNavigationProps> = ({
  className ='',;
  items = [],;
  showAvatar = true,;
  avatarSize ='medium'
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 默认用户菜单项
  const defaultItems: NavigationItem[]  = [;
    { label: '个人资料', path: '/profile', icon: '👤' },
    { label: '设置', path: '/settings', icon: '⚙️' },
    { label: '帮助', path: '/help', icon: '❓' },
    { label: '退出登录', action: 'logout', icon: '🚪' }
  ];
  const menuItems = items.length > 0 ? items : defaultItems;

  // 点击外部关闭菜单
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
       }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemClick = (item: NavigationItem) => {
    if (item.action ==='logout') {
      logout();
      navigate('/login");
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const getAvatarSizeClass = () => { switch (avatarSize) {
      case 'small': return 'w-8 h-8'
      case 'large': return 'w-12 h-12'
      default: return 'w-10 h-10'
     }
  };

  if (!user) {
    return (;
      <div className={`user-navigation guest ${className}`}>`
        <Link to="/login' className='login-button'>`'"`
          登录;
        </Link>
        <Link to='/register' className='register-button'>
          注册;
        </Link>
      </div>
    );
  }

  return (;
    <div className={`user-navigation ${className}`} ref={dropdownRef}>`
      <button
        className="user-menu-trigger";`
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup='true'
      >
        {showAvatar && (
          <div className={`user-avatar ${getAvatarSizeClass()}`}>`
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || "用户头像'}'`"`
                className='avatar-image'
              />
            ) : (;
              <div className='avatar-placeholder'>
                {(user.name || user.email || "U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className='user-info'>
          <span className='user-name'>{user.name || user.email}</span>
          {user.role && (
            <span className='user-role'>{user.role}</span>
          )}
        </div>

        <span className={ `dropdown-arrow ${isOpen ? 'open' : '' }`}>`
          ▼;
        </span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown'>`;'"`
          <div className='user-menu-header'>
            <div className='user-details'>
              <div className='user-name'>{user.name || user.email}</div>
              {user.email && user.name && (
                <div className='user-email'>{user.email}</div>
              )}
              {user.role && (
                <div className='user-role-badge'>{user.role}</div>
              )}
            </div>
          </div>

          <div className='user-menu-divider'></div>

          <div className='user-menu-items'>
            {menuItems.map((item, index) => (
              <div key={index} className='user-menu-item'>
                {item.action ? (<button
                    className='user-menu-button'
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon && <span className='menu-icon'>{item.icon}</span>}
                    <span className='menu-label'>{item.label}</span>
                  </button>
                ) : (<Link
                    to={item.path || '#'}
                    className='user-menu-link'
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon && <span className='menu-icon'>{item.icon}</span>}
                    <span className='menu-label'>{item.label}</span>
                    {item.badge && (
                      <span className={`menu-badge menu-badge--${item.badge.variant}`}>`
                        {item.badge.text}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserNavigation;