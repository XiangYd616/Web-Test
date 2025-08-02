import React from 'react';
import { ThemeProvider as BaseThemeProvider } from '../../contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
}

/**
 * 主题提供者组件 - 为整个应用提供主题支持
 * 
 * @example
 * ```tsx
 * import { ThemeProvider } from '@/components/ui';
 * 
 * function App() {
 *   return (
 *     <ThemeProvider defaultTheme="dark">
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'dark' 
}) => {
  return (
    <BaseThemeProvider>
      <div className="min-h-screen themed-bg-primary themed-text-primary">
        {children}
      </div>
    </BaseThemeProvider>
  );
};

export default ThemeProvider;
