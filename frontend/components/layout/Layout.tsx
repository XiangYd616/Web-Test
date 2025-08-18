import React, { useState    } from 'react';import { Outlet    } from 'react-router-dom';import { useTheme    } from '../../contexts/ThemeContext';import Sidebar from './Sidebar';import TopNavbar from './TopNavbar';export interface LayoutProps     { 
  // 基础属性
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (value: any) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  
  // 状态属性
  disabled?: boolean;
  loading?: boolean;
  error?: string | boolean;
  
  // 数据属性
  value?: any;
  defaultValue?: any;
  
  // 配置属性
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'outline'
  // 可访问性
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
 }


const Layout: React.FC<LayoutProps>  = (props) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,;
    style: computedStyle,;
    disabled,;
    'aria-label': ariaLabel,;
    'data-testid': testId;
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,;
    "aria-label': ariaLabel,'`;"`
    'aria-labelledby': ariaLabelledBy,;
    'aria-describedby': [''];
      error ? errorId : null,;
      description ? descriptionId : null,;
      ariaDescribedBy;
    ].filter(Boolean).join(' ') || undefined,;
    'aria-invalid': !!error,;
    'aria-disabled': disabled,;
    'aria-busy': loading,;
    'aria-expanded': expanded,;
    "aria-selected': selected,';"
    role: role,;
    tabIndex: disabled ? -1 : (tabIndex ?? 0);
  };
  const { actualTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (;
    <div className={ `h-screen flex flex-col theme-transition ${actualTheme === 'light' ? 'light-theme-wrapper' : 'dark-theme-wrapper' }`}>``
      {/* 顶部导航�?*/}
      <TopNavbar sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
         />

      <div className= "flex flex-1 overflow-hidden'>`;'"`
        {/* 侧边�?*/}
        <Sidebar collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
           />

        {/* 主内容区�?*/}
        <div className= 'flex-1 flex flex-col overflow-hidden'>;
          {/* 主内�?*/}
          <main className= 'flex-1 overflow-y-auto dark-page-scrollbar'>;
            <div className= 'p-0'>;
              <Outlet  />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
