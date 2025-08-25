import React from 'react';
import type { ReactNode, FC } from 'react';
import { ThemeProvider as BaseThemeProvider } from '../../contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
}

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
