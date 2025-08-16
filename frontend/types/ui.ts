// UI组件相关类型定义
import React from 'react';

// 基础UI属性
export interface BaseUIProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

// 尺寸类型
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoadingSize = Size;

// 颜色变体
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// 按钮属性
export interface ButtonProps extends BaseUIProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

// 输入框属性
export interface InputProps extends BaseUIProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'search';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  label?: string;
  size?: Size;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

// 选择选项
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

// 导出SelectOption作为独立类型
export type { SelectOption as SelectOptionType };

// 选择框属性
export interface SelectProps extends BaseUIProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  size?: Size;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  onChange?: (value: string | string[]) => void;
}

// 模态框属性
export interface ModalProps extends BaseUIProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  centered?: boolean;
}

// 表格列定义
export interface Column<T = any> {
  key: keyof T | string;
  title: string;
  dataIndex?: keyof T;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: (a: T, b: T) => number;
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
}

// 表格属性
export interface TableProps<T = any> extends BaseUIProps {
  columns: Column<T>[];
  dataSource: T[];
  loading?: boolean;
  pagination?: PaginationProps | false;
  rowKey?: keyof T | ((record: T) => string);
  size?: Size;
  bordered?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  sticky?: boolean;
  scroll?: { x?: number | string; y?: number | string };
  expandable?: {
    expandedRowRender?: (record: T) => React.ReactNode;
    rowExpandable?: (record: T) => boolean;
  };
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
}

// 分页属性
export interface PaginationProps extends BaseUIProps {
  current?: number;
  total: number;
  pageSize?: number;
  pageSizeOptions?: string[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  size?: Size;
  simple?: boolean;
  disabled?: boolean;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
}

// 标签属性
export interface BadgeProps extends BaseUIProps {
  count?: number;
  text?: string;
  color?: ColorVariant | string;
  size?: Size;
  dot?: boolean;
  showZero?: boolean;
  overflowCount?: number;
  offset?: [number, number];
}

// 提示框属性
export interface TooltipProps extends BaseUIProps {
  title: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  trigger?: 'hover' | 'focus' | 'click' | 'contextMenu';
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
}

// 加载状态属性
export interface LoadingProps extends BaseUIProps {
  spinning?: boolean;
  size?: LoadingSize;
  tip?: string;
  delay?: number;
  indicator?: React.ReactNode;
  wrapperClassName?: string;
}

// 警告框属性
export interface AlertProps extends BaseUIProps {
  type?: 'success' | 'info' | 'warning' | 'error';
  message: React.ReactNode;
  description?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  closeText?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  afterClose?: () => void;
  banner?: boolean;
}

// 卡片属性
export interface CardProps extends BaseUIProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  cover?: React.ReactNode;
  actions?: React.ReactNode[];
  bordered?: boolean;
  hoverable?: boolean;
  loading?: boolean;
  size?: Size;
  type?: 'inner';
  bodyStyle?: React.CSSProperties;
  headStyle?: React.CSSProperties;
}

// 抽屉属性
export interface DrawerProps extends BaseUIProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  size?: Size | number;
  mask?: boolean;
  maskClosable?: boolean;
  closable?: boolean;
  destroyOnClose?: boolean;
  forceRender?: boolean;
  getContainer?: string | HTMLElement | (() => HTMLElement) | false;
  style?: React.CSSProperties;
  drawerStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  footer?: React.ReactNode;
  footerStyle?: React.CSSProperties;
  zIndex?: number;
  push?: boolean;
  extra?: React.ReactNode;
}

// 步骤条属性
export interface StepsProps extends BaseUIProps {
  current?: number;
  direction?: 'horizontal' | 'vertical';
  labelPlacement?: 'horizontal' | 'vertical';
  progressDot?: boolean | ((iconDot: React.ReactNode, { index, status, title, description }: any) => React.ReactNode);
  size?: 'default' | 'small';
  status?: 'wait' | 'process' | 'finish' | 'error';
  type?: 'default' | 'navigation';
  onChange?: (current: number) => void;
  items?: StepItem[];
}

export interface StepItem {
  title: React.ReactNode;
  subTitle?: React.ReactNode;
  description?: React.ReactNode;
  status?: 'wait' | 'process' | 'finish' | 'error';
  icon?: React.ReactNode;
  disabled?: boolean;
}

// 标签页属性
export interface TabsProps extends BaseUIProps {
  activeKey?: string;
  defaultActiveKey?: string;
  type?: 'line' | 'card' | 'editable-card';
  size?: Size;
  tabPosition?: 'top' | 'right' | 'bottom' | 'left';
  tabBarGutter?: number;
  tabBarStyle?: React.CSSProperties;
  animated?: boolean | { inkBar: boolean; tabPane: boolean };
  renderTabBar?: (props: any, DefaultTabBar: React.ComponentType<any>) => React.ReactElement;
  onChange?: (activeKey: string) => void;
  onTabClick?: (key: string, event: React.MouseEvent) => void;
  onEdit?: (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => void;
  hideAdd?: boolean;
  centered?: boolean;
  items?: TabItem[];
}

export interface TabItem {
  key: string;
  label: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  closable?: boolean;
  icon?: React.ReactNode;
}

// 通用事件处理器类型
export type EventHandler<T = HTMLElement> = (event: React.SyntheticEvent<T>) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;
export type KeyboardHandler<T = HTMLElement> = (event: React.KeyboardEvent<T>) => void;

// 响应式断点
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

// 栅格系统
export interface ColProps extends BaseUIProps {
  span?: number;
  offset?: number;
  push?: number;
  pull?: number;
  order?: number;
  xs?: number | ColSize;
  sm?: number | ColSize;
  md?: number | ColSize;
  lg?: number | ColSize;
  xl?: number | ColSize;
  xxl?: number | ColSize;
}

export interface ColSize {
  span?: number;
  offset?: number;
  push?: number;
  pull?: number;
  order?: number;
}

export interface RowProps extends BaseUIProps {
  gutter?: number | [number, number] | Partial<Record<Breakpoint, number>>;
  align?: 'top' | 'middle' | 'bottom' | 'stretch';
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly';
  wrap?: boolean;
}

// 主题相关
export interface ThemeConfig {
  primaryColor?: string;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
}

// CSS类名工具类型
export type ClassValue = string | number | boolean | undefined | null | ClassValue[] | { [key: string]: any };

// 组件引用类型
export type ComponentRef<T = HTMLElement> = React.RefObject<T> | ((instance: T | null) => void) | null;
