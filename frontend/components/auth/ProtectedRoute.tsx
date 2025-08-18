import React from 'react';import { Navigate, useLocation     } from 'react-router-dom';import { useAuth     } from '../../contexts/AuthContext';import { LoadingSpinner     } from '../ui/index';interface ProtectedRouteProps   { 
  children: React.ReactNode;
 }
const ProtectedRoute: React.FC<ProtectedRouteProps>  = ({ children }) => {
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,;
    style: computedStyle,;
    disabled,;
    'aria-label': ariaLabel,
    'data-testid': testId;
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  const ariaProps = {
    id: componentId,;
    "aria-label': ariaLabel,';
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ['];
      error ? errorId : null,;
      description ? descriptionId : null,;
      ariaDescribedBy;
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,;
    role: role,;
    tabIndex: disabled ? -1 : (tabIndex ?? 0);
  };
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
        return (;
      <div className='min-h-screen flex items-center justify-center bg-gray-900'>;
        <LoadingSpinner size= 'lg' text='验证用户身份...' />
      </div>
    );
      }
  if (!user) { 
        // 保存当前路径，登录后重定向回来
    return <Navigate to= '/login' state={{ from: location
       }} replace    />;
  }
  return <>{children}</>;
};
export default ProtectedRoute;
';