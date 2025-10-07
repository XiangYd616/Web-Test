/**
 * ui.types.ts - UI类型定义
 */

// ThemeMode is defined in theme.types.ts

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface BaseComponentProps {
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

