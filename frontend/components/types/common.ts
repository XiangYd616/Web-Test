/**
 * common.ts - 组件通用类型定义
 */

export interface BaseComponentProps {
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export interface ModalBaseProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type Status = 'idle' | 'loading' | 'success' | 'error';

