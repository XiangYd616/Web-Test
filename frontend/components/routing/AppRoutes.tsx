import React, { Suspense    } from 'react';import { Routes, Route, Navigate    } from 'react-router-dom';import { LoadingSpinner    } from '../ui/LoadingSpinner';import { ProtectedRoute    } from '../auth/ProtectedRoute';export interface AppRoutesProps     { 
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
  size?: 'small' | 'medium' | 'large
  variant?: 'primary' | 'secondary' | 'outline
  // 可访问性
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
 }


// Lazy load pages
const Dashboard = React.lazy(() => import('../../pages/core/dashboard/Dashboard'));
const Login = React.lazy(() => import('../../pages/core/auth/Login'));
const Register = React.lazy(() => import('../../pages/core/auth/Register'));
const APITest = React.lazy(() => import('../../pages/core/testing/APITest'));
const SecurityTest = React.lazy(() => import('../../pages/core/testing/SecurityTest'));
const StressTest = React.lazy(() => import('../../pages/core/testing/StressTest'));
const Settings = React.lazy(() => import('../../pages/management/settings/Settings'));
const UserProfile = React.lazy(() => import('../../pages/user/profile/UserProfile'));
const AppRoutes: React.FC<AppRoutesProps>  = (props) => { const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
   }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',;
    medium: 'px-4 py-2 text-base',;
    large: 'px-6 py-3 text-lg
  };
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',;
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',;
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
  };
  const stateClasses = {
    disabled: 'opacity-50 cursor-not-allowed',;
    loading: 'cursor-wait',;
    error: 'border-red-500 text-red-600
  };
  
  const componentClasses = cn(;
    baseClasses,;
    sizeClasses[size],;
    variantClasses[variant],;
    {
      [stateClasses.disabled]: disabled,;
      [stateClasses.loading]: loading,;
      [stateClasses.error]: !!error;
    },
    className;)
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,;
    "aria-label': ariaLabel,';
    'aria-labelledby': ariaLabelledBy,;
    'aria-describedby': ['];
      error ? errorId : null,;
      description ? descriptionId : null,;
      ariaDescribedBy;
    ].filter(Boolean).join(' ') || undefined,;
    'aria-invalid': !!error,;
    'aria-disabled': disabled,;
    'aria-busy': loading,;
    'aria-expanded': expanded,;
    'aria-selected': selected,;
    role: role,;
    tabIndex: disabled ? -1 : (tabIndex ?? 0);
  };
  return (;
    <Suspense fallback={<LoadingSpinner    />}>
      <Routes>;
        {/* Public routes */}
        <Route path= '/login' element={<Login    />} />
        <Route path= '/register' element={<Register    />} />
        
        {/* Protected routes */}
        <Route path= '/' element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
        <Route path= '/dashboard' element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
        
        {/* Testing routes */}
        <Route path= '/test/api' element={<ProtectedRoute><APITest  /></ProtectedRoute>} />
        <Route path= '/test/security' element={<ProtectedRoute><SecurityTest  /></ProtectedRoute>} />
        <Route path= '/test/stress' element={<ProtectedRoute><StressTest  /></ProtectedRoute>} />
        
        {/* Management routes */}
        <Route path= '/settings' element={<ProtectedRoute><Settings  /></ProtectedRoute>} />
        
        {/* User routes */}
        <Route path= '/profile' element={<ProtectedRoute><UserProfile  /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path= '*' element={<Navigate to= '/dashboard' replace    />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
