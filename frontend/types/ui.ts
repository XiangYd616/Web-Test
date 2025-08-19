import React from "react";

export interface BaseUIProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  "data-testid"?: string;
}

export type Size = "xs" | "sm" | "md" | "lg" | "xl";
export type LoadingSize = Size;
export type ColorVariant = "primary" | "secondary" | "success" | "warning" | "error" | "info";

export interface ButtonProps extends BaseUIProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
}

export interface InputProps extends BaseUIProps {
  type?: "text" | "email" | "password" | "number" | "url" | "tel" | "search";
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends BaseUIProps {
  options: SelectOption[];
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  error?: string;
  onChange?: (value: string | number | Array<string | number>) => void;
}

export interface CheckboxProps extends BaseUIProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: string;
  error?: string;
  onChange?: (checked: boolean) => void;
}

export interface RadioProps extends BaseUIProps {
  value: string | number;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  label?: string;
  onChange?: (value: string | number) => void;
}

export interface TextareaProps extends BaseUIProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  rows?: number;
  cols?: number;
  resize?: "none" | "both" | "horizontal" | "vertical";
  error?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export interface ModalProps extends BaseUIProps {
  open: boolean;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}

export interface TooltipProps extends BaseUIProps {
  content: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  trigger?: "hover" | "click" | "focus";
  delay?: number;
  disabled?: boolean;
}

export interface PopoverProps extends BaseUIProps {
  content: React.ReactNode;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right";
  trigger?: "hover" | "click" | "focus";
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}

export interface DrawerProps extends BaseUIProps {
  open: boolean;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right";
  size?: number | string;
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  onClose?: () => void;
}

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  closable?: boolean;
}

export interface TabsProps extends BaseUIProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  type?: "line" | "card" | "editable-card";
  size?: Size;
  tabPosition?: "top" | "bottom" | "left" | "right";
  onChange?: (activeKey: string) => void;
  onEdit?: (targetKey: string, action: "add" | "remove") => void;
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: number | string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  filterable?: boolean;
  fixed?: "left" | "right";
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface TableProps<T = any> extends BaseUIProps {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    onChange?: (page: number, pageSize: number) => void;
  };
  rowKey?: string | ((record: T) => string);
  rowSelection?: {
    type?: "checkbox" | "radio";
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  expandable?: {
    expandedRowKeys?: string[];
    expandedRowRender?: (record: T) => React.ReactNode;
    onExpand?: (expanded: boolean, record: T) => void;
  };
  scroll?: {
    x?: number | string;
    y?: number | string;
  };
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
}

export interface FormItemProps extends BaseUIProps {
  label?: string;
  name?: string;
  required?: boolean;
  error?: string;
  help?: string;
  labelCol?: { span?: number; offset?: number };
  wrapperCol?: { span?: number; offset?: number };
  rules?: Array<{
    required?: boolean;
    message?: string;
    pattern?: RegExp;
    validator?: (value: any) => Promise<void> | void;
  }>;
}

export interface FormProps extends BaseUIProps {
  layout?: "horizontal" | "vertical" | "inline";
  labelCol?: { span?: number; offset?: number };
  wrapperCol?: { span?: number; offset?: number };
  initialValues?: Record<string, any>;
  onFinish?: (values: Record<string, any>) => void;
  onFinishFailed?: (errorInfo: any) => void;
  onValuesChange?: (changedValues: Record<string, any>, allValues: Record<string, any>) => void;
}

export interface LoadingProps extends BaseUIProps {
  spinning?: boolean;
  size?: LoadingSize;
  tip?: string;
  delay?: number;
}

export interface AlertProps extends BaseUIProps {
  type?: "success" | "info" | "warning" | "error";
  message: React.ReactNode;
  description?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  banner?: boolean;
  onClose?: () => void;
}

export interface NotificationProps {
  type?: "success" | "info" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
  placement?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  onClose?: () => void;
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps extends BaseUIProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

export interface StepsItem {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  status?: "wait" | "process" | "finish" | "error";
}

export interface StepsProps extends BaseUIProps {
  items: StepsItem[];
  current?: number;
  direction?: "horizontal" | "vertical";
  size?: "default" | "small";
  status?: "wait" | "process" | "finish" | "error";
  onChange?: (current: number) => void;
}

export interface ProgressProps extends BaseUIProps {
  percent: number;
  type?: "line" | "circle" | "dashboard";
  status?: "normal" | "exception" | "active" | "success";
  strokeColor?: string;
  strokeWidth?: number;
  showInfo?: boolean;
  format?: (percent: number) => React.ReactNode;
}

export interface AvatarProps extends BaseUIProps {
  src?: string;
  alt?: string;
  size?: Size | number;
  shape?: "circle" | "square";
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BadgeProps extends BaseUIProps {
  count?: number;
  dot?: boolean;
  showZero?: boolean;
  overflowCount?: number;
  color?: string;
  text?: string;
  status?: "success" | "processing" | "default" | "error" | "warning";
}

export interface TagProps extends BaseUIProps {
  color?: string;
  closable?: boolean;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export interface CardProps extends BaseUIProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  cover?: React.ReactNode;
  actions?: React.ReactNode[];
  bordered?: boolean;
  hoverable?: boolean;
  loading?: boolean;
  size?: "default" | "small";
}

export interface CollapseItem {
  key: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  extra?: React.ReactNode;
}

export interface CollapseProps extends BaseUIProps {
  items: CollapseItem[];
  activeKey?: string | string[];
  defaultActiveKey?: string | string[];
  accordion?: boolean;
  bordered?: boolean;
  ghost?: boolean;
  size?: "large" | "middle" | "small";
  onChange?: (key: string | string[]) => void;
}

export interface MenuItemType {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  children?: MenuItemType[];
  onClick?: () => void;
}

export interface MenuProps extends BaseUIProps {
  items: MenuItemType[];
  mode?: "horizontal" | "vertical" | "inline";
  theme?: "light" | "dark";
  selectedKeys?: string[];
  openKeys?: string[];
  inlineCollapsed?: boolean;
  onSelect?: (selectedKeys: string[]) => void;
  onOpenChange?: (openKeys: string[]) => void;
}

// 类型不需要默认导出
