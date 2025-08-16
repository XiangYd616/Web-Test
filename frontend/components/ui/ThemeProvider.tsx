import React from 'react';
import { ThemeProvider as BaseThemeProvider } from '../../contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark'
}) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,
    'data-testid': testId
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  
  // 变体和主题支持
  const variantStyles = useMemo(() => {
    const styles = {
      primary: {
        backgroundColor: '#007bff',
        color: '#ffffff',
        border: '1px solid #007bff'
      },
      secondary: {
        backgroundColor: '#6c757d',
        color: '#ffffff',
        border: '1px solid #6c757d'
      },
      outline: {
        backgroundColor: 'transparent',
        color: '#007bff',
        border: '1px solid #007bff'
      }
    };

    return styles[variant] || styles.primary;
  }, [variant]);

  const sizeStyles = useMemo(() => {
    const styles = {
      small: {
        padding: '0.25rem 0.5rem',
        fontSize: '0.875rem'
      },
      medium: {
        padding: '0.5rem 1rem',
        fontSize: '1rem'
      },
      large: {
        padding: '0.75rem 1.5rem',
        fontSize: '1.125rem'
      }
    };

    return styles[size] || styles.medium;
  }, [size]);

  const computedStyle = useMemo(() => ({
    ...variantStyles,
    ...sizeStyles,
    ...style
  }), [variantStyles, sizeStyles, style]);
  
  // 可访问性支持
  const {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    tabIndex = 0,
    'data-testid': testId
  } = props;

  const accessibilityProps = {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    tabIndex: disabled ? -1 : tabIndex,
    'data-testid': testId
  };

  // 键盘导航支持
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as any);
    }
  }, [onClick]);
  return (
    <BaseThemeProvider>
      <div className="min-h-screen themed-bg-primary themed-text-primary">
        {children}
      </div>
    </BaseThemeProvider>
  );
};

export default ThemeProvider;
