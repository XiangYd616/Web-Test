import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
  icon?: React.ComponentType<any>;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  description,
  className = '',
  compact = true,
  icon: Icon
}) => {
  return (
    <div className={`
      ${compact ? 'compact-layout' : ''}
      min-h-screen
      ${className}
    `}>
      {/* 页面头部 */}
      {(title || description) && (
        <div className="mb-4 lg:mb-6">
          {title && (
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              {Icon && <Icon className="w-8 h-8" />}
              {title}
            </h1>
          )}
          {description && (
            <p className="text-gray-600 text-sm lg:text-base">
              {description}
            </p>
          )}
        </div>
      )}

      {/* 主要内容 */}
      <div className="space-y-4 lg:space-y-6">
        {children}
      </div>
    </div>
  );
};

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  compact?: boolean;
}

export const PageSection: React.FC<SectionProps> = ({
  children,
  title,
  className = '',
  compact = true
}) => {
  return (
    <section className={`
      bg-white rounded-lg shadow-sm border border-gray-200
      ${compact ? 'p-4 lg:p-6' : 'p-6 lg:p-8'}
      ${className}
    `}>
      {title && (
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
};

interface GridLayoutProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GridLayout: React.FC<GridLayoutProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = ''
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 lg:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 lg:grid-cols-2';
    }
  };

  const getGap = () => {
    switch (gap) {
      case 'sm': return 'compact-grid-sm';
      case 'md': return 'compact-grid';
      case 'lg': return 'gap-6 lg:gap-8';
      default: return 'compact-grid';
    }
  };

  return (
    <div className={`
      grid ${getGridCols()} ${getGap()}
      ${className}
    `}>
      {children}
    </div>
  );
};

interface FlexLayoutProps {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

export const FlexLayout: React.FC<FlexLayoutProps> = ({
  children,
  direction = 'row',
  gap = 'md',
  align = 'start',
  justify = 'start',
  className = ''
}) => {
  const getDirection = () => direction === 'row' ? 'flex-row' : 'flex-col';

  const getGap = () => {
    switch (gap) {
      case 'sm': return 'gap-2 lg:gap-3';
      case 'md': return 'gap-3 lg:gap-4';
      case 'lg': return 'gap-4 lg:gap-6';
      default: return 'gap-3 lg:gap-4';
    }
  };

  const getAlign = () => {
    switch (align) {
      case 'start': return 'items-start';
      case 'center': return 'items-center';
      case 'end': return 'items-end';
      case 'stretch': return 'items-stretch';
      default: return 'items-start';
    }
  };

  const getJustify = () => {
    switch (justify) {
      case 'start': return 'justify-start';
      case 'center': return 'justify-center';
      case 'end': return 'justify-end';
      case 'between': return 'justify-between';
      case 'around': return 'justify-around';
      default: return 'justify-start';
    }
  };

  return (
    <div className={`
      flex ${getDirection()} ${getGap()} ${getAlign()} ${getJustify()}
      ${className}
    `}>
      {children}
    </div>
  );
};

interface CompactCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export const CompactCard: React.FC<CompactCardProps> = ({
  children,
  title,
  className = '',
  padding = 'md'
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'sm': return 'p-3 lg:p-4';
      case 'md': return 'p-4 lg:p-5';
      case 'lg': return 'p-5 lg:p-6';
      default: return 'p-4 lg:p-5';
    }
  };

  return (
    <div className={`
      themed-card rounded-lg shadow-sm border themed-border-primary
      ${getPadding()}
      ${className}
    `}>
      {title && (
        <h3 className="text-base lg:text-lg font-medium themed-text-primary mb-2 lg:mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

interface ResponsiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const getVariant = () => {
    switch (variant) {
      case 'primary': return 'themed-button-primary';
      case 'secondary': return 'themed-button-secondary';
      case 'outline': return 'themed-bg-primary themed-text-primary themed-border-primary hover:themed-bg-secondary focus:ring-blue-500';
      case 'danger': return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      default: return 'themed-button-primary';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm': return 'px-3 py-1.5 text-xs lg:text-sm';
      case 'md': return 'px-4 py-2 text-sm lg:text-base';
      case 'lg': return 'px-6 py-3 text-base lg:text-lg';
      default: return 'px-4 py-2 text-sm lg:text-base';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        border border-transparent font-medium rounded-md
        shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors duration-200
        ${getVariant()}
        ${getSize()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
