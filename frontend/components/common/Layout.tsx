/**
 * Layout.tsx - Common layout component
 *
 * Provides a reusable layout wrapper with configurable background and max width
 */

import React, { ReactNode } from 'react';

export interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: React.ComponentType<any>;
  background?: 'default' | 'dark' | 'light' | 'gradient';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const backgroundClasses = {
  default: 'bg-gray-50',
  dark: 'bg-gray-900',
  light: 'bg-white',
  gradient: 'bg-gradient-to-br from-blue-50 via-white to-purple-50',
};

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  background = 'default',
  maxWidth = 'full',
  className = '',
}) => {
  return (
    <div className={`${backgroundClasses[background]} ${className}`}>
      <div className={`${maxWidthClasses[maxWidth]} mx-auto h-full`}>{children}</div>
    </div>
  );
};

export default PageLayout;
