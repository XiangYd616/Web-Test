/**
 * UI组件相关类型定义
 * 统一管理所有UI组件的Props、State和相关类型
 */

import { ComponentType, ReactNode } from 'react';
import { TestStatus, TestType } from '../unified/testTypes';

// ==================== 基础UI类型 ====================

/** 组件尺寸 */
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** 组件颜色主题 */
export type ComponentColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'disabled'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'white'
  | 'black'
  | 'current';

/** 组件变体 */
export type ComponentVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'solid';

/** 反馈类型 */
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/** 反馈位置 */
export type FeedbackPosition =
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

// ==================== 图标组件类型 ====================

/** 图标属性接口 */
export interface IconProps {
  /** 图标组件 */
  icon: ComponentType<any>;
  /** 图标尺寸 */
  size?: ComponentSize;
  /** 图标颜色 */
  color?: ComponentColor;
  /** 自定义类名 */
  className?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 无障碍标签 */
  'aria-label'?: string;
  /** 是否隐藏（无障碍） */
  'aria-hidden'?: boolean;
}

/** 测试类型图标属性 */
export interface TestTypeIconProps {
  /** 测试类型 */
  testType: TestType;
  /** 图标尺寸 */
  size?: ComponentSize;
  /** 图标颜色 */
  color?: ComponentColor;
  /** 自定义类名 */
  className?: string;
}

/** 测试状态图标属性 */
export interface TestStatusIconProps {
  /** 测试状态 */
  status: TestStatus;
  /** 图标尺寸 */
  size?: ComponentSize;
  /** 自定义类名 */
  className?: string;
  /** 是否显示动画 */
  animated?: boolean;
}

// ==================== 反馈组件类型 ====================

/** 基础反馈属性 */
export interface BaseFeedbackProps {
  /** 反馈类型 */
  type: FeedbackType;
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 组件尺寸 */
  size?: ComponentSize;
  /** 自定义类名 */
  className?: string;
  /** 关闭回调 */
  onClose?: () => void;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否显示图标 */
  icon?: boolean;
}

/** 通知组件属性 */
export interface NotificationProps extends BaseFeedbackProps {
  /** 显示时长（毫秒） */
  duration?: number;
  /** 显示位置 */
  position?: FeedbackPosition;
  /** 是否持久显示 */
  persistent?: boolean;
}

/** 状态指示器属性 */
export interface StatusIndicatorProps {
  /** 状态 */
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  /** 状态文本 */
  text?: string;
  /** 组件尺寸 */
  size?: ComponentSize;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 自定义类名 */
  className?: string;
}

/** 进度反馈属性 */
export interface ProgressFeedbackProps {
  /** 进度值（0-100） */
  progress: number;
  /** 进度状态 */
  status: 'running' | 'completed' | 'failed';
  /** 当前步骤 */
  currentStep?: string;
  /** 是否显示百分比 */
  showPercentage?: boolean;
  /** 组件尺寸 */
  size?: ComponentSize;
  /** 自定义类名 */
  className?: string;
}

/** 加载反馈属性 */
export interface LoadingFeedbackProps {
  /** 加载消息 */
  message?: string;
  /** 组件尺寸 */
  size?: ComponentSize;
  /** 自定义类名 */
  className?: string;
}

/** 空状态属性 */
export interface EmptyStateProps {
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 操作按钮 */
  action?: ReactNode;
  /** 图标组件 */
  icon?: ComponentType<any>;
  /** 自定义类名 */
  className?: string;
}

// ==================== 增强组件类型 ====================

/** 可折叠面板属性 */
export interface CollapsiblePanelProps {
  /** 面板标题 */
  title: string;
  /** 面板内容 */
  children: ReactNode;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 标题图标 */
  icon?: ComponentType<any>;
  /** 自定义类名 */
  className?: string;
  /** 头部自定义类名 */
  headerClassName?: string;
  /** 内容自定义类名 */
  contentClassName?: string;
  /** 切换回调 */
  onToggle?: (expanded: boolean) => void;
}

/** 代码块属性 */
export interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 编程语言 */
  language?: string;
  /** 代码块标题 */
  title?: string;
  /** 是否可复制 */
  copyable?: boolean;
  /** 最大高度 */
  maxHeight?: string;
  /** 自定义类名 */
  className?: string;
}

/** 统计卡片属性 */
export interface StatsCardProps {
  /** 卡片标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 变化信息 */
  change?: {
    /** 变化值 */
    value: number;
    /** 变化类型 */
    type: 'increase' | 'decrease' | 'neutral';
  };
  /** 图标组件 */
  icon?: ComponentType<any>;
  /** 颜色主题 */
  color?: ComponentColor;
  /** 自定义类名 */
  className?: string;
}

/** 快速操作按钮属性 */
export interface QuickActionProps {
  /** 按钮标签 */
  label: string;
  /** 按钮图标 */
  icon: ComponentType<any>;
  /** 点击回调 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 按钮变体 */
  variant?: ComponentVariant;
  /** 按钮尺寸 */
  size?: ComponentSize;
  /** 自定义类名 */
  className?: string;
}

/** 全屏包装器属性 */
export interface FullscreenWrapperProps {
  /** 子组件 */
  children: ReactNode;
  /** 是否启用全屏功能 */
  enabled?: boolean;
  /** 全屏切换回调 */
  onToggle?: (fullscreen: boolean) => void;
  /** 自定义类名 */
  className?: string;
}

/** 链接预览属性 */
export interface LinkPreviewProps {
  /** 链接URL */
  url: string;
  /** 链接标题 */
  title?: string;
  /** 链接描述 */
  description?: string;
  /** 自定义类名 */
  className?: string;
}

// ==================== 表单组件类型 ====================

/** 输入框属性 */
export interface InputProps {
  /** 输入类型 */
  type?: 'text' | 'email' | 'password' | 'url' | 'number';
  /** 输入值 */
  value?: string;
  /** 默认值 */
  defaultValue?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 最大长度 */
  maxLength?: number;
  /** 输入变化回调 */
  onChange?: (value: string) => void;
  /** 失焦回调 */
  onBlur?: () => void;
  /** 获焦回调 */
  onFocus?: () => void;
  /** 自定义类名 */
  className?: string;
}

/** 选择框属性 */
export interface SelectProps {
  /** 选项列表 */
  options: SelectOption[];
  /** 选中值 */
  value?: string | string[];
  /** 默认值 */
  defaultValue?: string | string[];
  /** 占位符 */
  placeholder?: string;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 选择变化回调 */
  onChange?: (value: string | string[]) => void;
  /** 自定义类名 */
  className?: string;
}

/** 选择选项 */
export interface SelectOption {
  /** 选项值 */
  value: string;
  /** 选项标签 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 选项图标 */
  icon?: ComponentType<any>;
}

/** 按钮属性 */
export interface ButtonProps {
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset';
  /** 按钮变体 */
  variant?: ComponentVariant;
  /** 按钮尺寸 */
  size?: ComponentSize;
  /** 按钮颜色 */
  color?: ComponentColor;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 按钮图标 */
  icon?: ComponentType<any>;
  /** 图标位置 */
  iconPosition?: 'left' | 'right';
  /** 按钮内容 */
  children: ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 布局组件类型 ====================

/** 卡片属性 */
export interface CardProps {
  /** 卡片标题 */
  title?: string;
  /** 卡片内容 */
  children: ReactNode;
  /** 卡片操作 */
  actions?: ReactNode;
  /** 是否有边框 */
  bordered?: boolean;
  /** 是否有阴影 */
  shadow?: boolean;
  /** 自定义类名 */
  className?: string;
}

/** 模态框属性 */
export interface ModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 模态框标题 */
  title?: string;
  /** 模态框内容 */
  children: ReactNode;
  /** 模态框宽度 */
  width?: string | number;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否点击遮罩关闭 */
  maskClosable?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 确认回调 */
  onOk?: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 自定义类名 */
  className?: string;
}

/** 抽屉属性 */
export interface DrawerProps {
  /** 是否显示 */
  visible: boolean;
  /** 抽屉标题 */
  title?: string;
  /** 抽屉内容 */
  children: ReactNode;
  /** 抽屉位置 */
  placement?: 'left' | 'right' | 'top' | 'bottom';
  /** 抽屉宽度/高度 */
  size?: string | number;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否点击遮罩关闭 */
  maskClosable?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 数据展示组件类型 ====================

/** 表格列定义 */
export interface TableColumn<T = any> {
  /** 列键 */
  key: string;
  /** 列标题 */
  title: string;
  /** 数据索引 */
  dataIndex?: keyof T;
  /** 列宽 */
  width?: string | number;
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义渲染 */
  render?: (value: any, record: T, index: number) => ReactNode;
}

/** 表格属性 */
export interface TableProps<T = any> {
  /** 表格数据 */
  data: T[];
  /** 表格列定义 */
  columns: TableColumn<T>[];
  /** 行键 */
  rowKey?: string | ((record: T) => string);
  /** 是否加载中 */
  loading?: boolean;
  /** 分页配置 */
  pagination?: PaginationProps;
  /** 行选择配置 */
  rowSelection?: RowSelectionProps<T>;
  /** 自定义类名 */
  className?: string;
}

/** 分页属性 */
export interface PaginationProps {
  /** 当前页 */
  current: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 页码变化回调 */
  onChange?: (page: number, pageSize: number) => void;
}

/** 行选择属性 */
export interface RowSelectionProps<T = any> {
  /** 选中的行键 */
  selectedRowKeys: string[];
  /** 选择变化回调 */
  onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
}

// ==================== 主题相关类型 ====================

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/** 主题配置 */
export interface ThemeConfig {
  /** 主题模式 */
  mode: ThemeMode;
  /** 主色调 */
  primaryColor?: string;
  /** 圆角大小 */
  borderRadius?: number;
  /** 字体大小 */
  fontSize?: number;
}

/** 主题上下文 */
export interface ThemeContext {
  /** 当前主题配置 */
  theme: ThemeConfig;
  /** 切换主题模式 */
  setThemeMode: (mode: ThemeMode) => void;
  /** 更新主题配置 */
  updateTheme: (config: Partial<ThemeConfig>) => void;
}
