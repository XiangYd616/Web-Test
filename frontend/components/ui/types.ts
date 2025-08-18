/**
 * UI组件类型定义
 */

import { ReactNode    } from 'react';// 基础组件属性
export interface BaseComponentProps     {
  className?: string;
  children?: ReactNode;
  id?: string;
}

// 按钮属性
export interface ButtonProps extends BaseComponentProps     {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger
  size?: 'sm' | 'md' | 'lg
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset
}

// 输入框属性
export interface InputProps extends BaseComponentProps     {
  type?: 'text' | 'email' | 'password' | 'number' | 'url
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

// 选择框选项
export interface SelectOption     {
  value: string;
  label: string;
  disabled?: boolean;
}

// 选择框属性
export interface SelectProps extends BaseComponentProps     {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

// 文本域属性
export interface TextareaProps extends BaseComponentProps     {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  rows?: number;
}

// 复选框属性
export interface CheckboxProps extends BaseComponentProps     {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

// 卡片属性
export interface CardProps extends BaseComponentProps     {
  variant?: 'default' | 'outlined' | 'elevated
  padding?: 'none' | 'sm' | 'md' | 'lg
}

// 模态框属性
export interface ModalProps extends BaseComponentProps     {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl
  closable?: boolean;
}

// 表格列定义
export interface TableColumn     {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: any, index: number) => ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right
  sortable?: boolean;
}

// 表格分页
export interface TablePagination     {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  onChange?: (page: number, pageSize: number) => void;
}

// 表格行选择
export interface TableRowSelection     {
  selectedRowKeys: string[];
  onChange: (selectedRowKeys: string[], selectedRows: any[]) => void;
  type?: 'checkbox' | 'radio
}

// 表格属性
export interface TableProps extends BaseComponentProps     {
  columns: TableColumn[];
  dataSource: any[];
  loading?: boolean;
  pagination?: TablePagination | false;
  rowSelection?: TableRowSelection;
  rowKey?: string | ((record: any) => string);
  size?: 'small' | 'middle' | 'large
}

// 徽章属性
export interface BadgeProps extends BaseComponentProps     {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger
  size?: 'sm' | 'md' | 'lg
  dot?: boolean;
  count?: number;
  showZero?: boolean;
}

// 进度条属性
export interface ProgressProps extends BaseComponentProps     {
  percent: number;
  status?: 'normal' | 'active' | 'success' | 'exception
  showInfo?: boolean;
  size?: 'small' | 'default' | 'large
  strokeColor?: string;
}

// 状态指示器属性
export interface StatusIndicatorProps extends BaseComponentProps     {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading
  text?: string;
  size?: 'sm' | 'md' | 'lg
}

// 图表属性
export interface ChartProps extends BaseComponentProps     {
  data: any[];
  type?: 'line' | 'bar' | 'pie' | 'area
  width?: number;
  height?: number;
  loading?: boolean;
}

// 通用类型
export type Size   = 'sm' | 'md' | 'lg';export type Variant   = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';export type Status   = 'success' | 'warning' | 'error' | 'info' | 'loading';export type Position   = 'top' | 'bottom' | 'left' | 'right';export type Alignment   = 'left' | 'center' | 'right';export type ThemeMode   = 'light' | 'dark' | 'auto';// 事件处理器类型
export type ClickHandler   = (event: React.MouseEvent) => void;export type ChangeHandler   = (value: any) => void;export type FocusHandler   = (event: React.FocusEvent) => void;export type BlurHandler   = (event: React.FocusEvent) => void;export type KeyboardHandler   = (event: React.KeyboardEvent) => void;export type EventHandler   = (event: React.SyntheticEvent) => void;// 组件状态类型
export type ComponentState   = 'idle' | 'loading' | 'success' | 'error';// 响应式值类型
export type ResponsiveValue<T>  = T | { xs?: T;sm?: T; md?: T; lg?: T; xl?: T };

// 表单组件属性
export interface FormComponentProps extends BaseComponentProps     {
  name?: string;
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
}

// 交互式组件属性
export interface InteractiveComponentProps extends BaseComponentProps     {
  disabled?: boolean;
  loading?: boolean;
  onClick?: ClickHandler;
  onFocus?: FocusHandler;
  onBlur?: BlurHandler;
}

// 加载相关类型
export type LoadingType   = 'spinner' | 'dots' | 'pulse' | 'skeleton';export type LoadingSize   = 'xs' | 'sm' | 'md' | 'lg' | 'xl';export interface LoadingProps extends BaseComponentProps     {
  type?: LoadingType;
  size?: LoadingSize;
  text?: string;
  overlay?: boolean;
}
