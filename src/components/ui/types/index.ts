/**
 * UI组件库的TypeScript类型定义
 */

import React from 'react';

// 基础尺寸类型
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// 基础变体类型
export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

// 基础状态类型
export type Status = 'default' | 'success' | 'warning' | 'error' | 'info';

// 对齐方式类型
export type Alignment = 'left' | 'center' | 'right';

// 位置类型
export type Position = 'top' | 'bottom' | 'left' | 'right';

// 基础组件属性接口
export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
    id?: string;
    'data-testid'?: string;
}

// 可交互组件属性接口
export interface InteractiveComponentProps extends BaseComponentProps {
    disabled?: boolean;
    loading?: boolean;
    onClick?: (event: React.MouseEvent) => void;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
}

// 表单组件属性接口
export interface FormComponentProps extends BaseComponentProps {
    name?: string;
    value?: any;
    defaultValue?: any;
    onChange?: (value: any, event?: React.ChangeEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
    onFocus?: (event: React.FocusEvent) => void;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    error?: string;
    success?: string;
    label?: string;
    description?: string;
}

// 按钮组件属性
export interface ButtonProps extends InteractiveComponentProps {
    variant?: Variant;
    size?: Size;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    type?: 'button' | 'submit' | 'reset';
    href?: string;
    target?: string;
    rel?: string;
}

// 输入框组件属性
export interface InputProps extends FormComponentProps {
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
    variant?: 'default' | 'filled' | 'outlined';
    size?: Size;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    autoComplete?: string;
    autoFocus?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    step?: number;
    min?: number;
    max?: number;
}

// 选择框组件属性
export interface SelectProps extends FormComponentProps {
    variant?: 'default' | 'filled' | 'outlined';
    size?: Size;
    options: SelectOption[];
    multiple?: boolean;
    searchable?: boolean;
    clearable?: boolean;
    loading?: boolean;
    onSearch?: (query: string) => void;
    onClear?: () => void;
}

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
    group?: string;
    icon?: React.ReactNode;
}

// 文本域组件属性
export interface TextareaProps extends FormComponentProps {
    variant?: 'default' | 'filled' | 'outlined';
    resize?: 'none' | 'vertical' | 'horizontal' | 'both';
    rows?: number;
    cols?: number;
    maxLength?: number;
    minLength?: number;
    autoResize?: boolean;
}

// 复选框组件属性
export interface CheckboxProps extends FormComponentProps {
    checked?: boolean;
    indeterminate?: boolean;
    size?: Size;
    variant?: 'default' | 'filled';
}

// 单选框组件属性
export interface RadioProps extends FormComponentProps {
    checked?: boolean;
    size?: Size;
    variant?: 'default' | 'filled';
}

// 开关组件属性
export interface SwitchProps extends FormComponentProps {
    checked?: boolean;
    size?: Size;
    variant?: 'default' | 'filled';
    showLabels?: boolean;
    onLabel?: string;
    offLabel?: string;
}

// 卡片组件属性
export interface CardProps extends BaseComponentProps {
    variant?: 'default' | 'elevated' | 'outlined';
    padding?: Size;
    hoverable?: boolean;
    clickable?: boolean;
    onClick?: (event: React.MouseEvent) => void;
}

// 模态框组件属性
export interface ModalProps extends BaseComponentProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: Size | 'full';
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    centered?: boolean;
    scrollable?: boolean;
}

// 表格组件属性
export interface TableColumn<T = any> {
    key: string;
    title: string;
    dataIndex?: string;
    width?: string | number;
    align?: Alignment;
    sortable?: boolean;
    filterable?: boolean;
    fixed?: 'left' | 'right';
    render?: (value: any, record: T, index: number) => React.ReactNode;
    className?: string;
    headerClassName?: string;
}

export interface TableProps<T = any> extends BaseComponentProps {
    columns: TableColumn<T>[];
    data: T[];
    loading?: boolean;
    size?: 'small' | 'middle' | 'large';
    bordered?: boolean;
    striped?: boolean;
    hoverable?: boolean;
    showHeader?: boolean;
    sticky?: boolean;
    emptyText?: React.ReactNode;
    rowKey?: string | ((record: T) => string);
    rowSelection?: TableRowSelection<T>;
    pagination?: TablePagination;
    scroll?: {
        x?: number | string;
        y?: number | string;
    };
    onRow?: (record: T, index: number) => TableRowEventHandlers;
    onChange?: (pagination: TablePagination, filters: Record<string, any>, sorter: TableSorter) => void;
}

export interface TableRowSelection<T = any> {
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
    type?: 'checkbox' | 'radio';
    fixed?: boolean;
    columnWidth?: string | number;
    columnTitle?: React.ReactNode;
}

export interface TablePagination {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: (total: number, range: [number, number]) => React.ReactNode;
    pageSizeOptions?: string[];
    onChange?: (page: number, pageSize: number) => void;
    onShowSizeChange?: (current: number, size: number) => void;
}

export interface TableRowEventHandlers {
    onClick?: (event: React.MouseEvent) => void;
    onDoubleClick?: (event: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    className?: string;
    style?: React.CSSProperties;
}

export interface TableSorter {
    field?: string;
    order?: 'ascend' | 'descend' | null;
    column?: TableColumn;
}

// 徽章组件属性
export interface BadgeProps extends BaseComponentProps {
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    size?: Size;
    dot?: boolean;
    count?: number;
    showZero?: boolean;
    overflowCount?: number;
    offset?: [number, number];
    title?: string;
}

// 进度条组件属性
export interface ProgressProps extends BaseComponentProps {
    value: number;
    max?: number;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: Size;
    showText?: boolean;
    format?: (percent: number) => React.ReactNode;
    strokeWidth?: number;
    strokeColor?: string;
    trailColor?: string;
    type?: 'line' | 'circle' | 'dashboard';
    steps?: number;
    strokeLinecap?: 'round' | 'square';
}

// 状态指示器组件属性
export interface StatusIndicatorProps extends BaseComponentProps {
    status: 'online' | 'offline' | 'busy' | 'away' | 'idle';
    size?: Size;
    showText?: boolean;
    text?: string;
    pulse?: boolean;
}

// 加载组件属性
export interface LoadingProps extends BaseComponentProps {
    size?: Size;
    type?: 'spinner' | 'dots' | 'bars' | 'pulse' | 'skeleton';
    text?: string;
    overlay?: boolean;
    spinning?: boolean;
    delay?: number;
}

// 图表组件属性
export interface ChartProps extends BaseComponentProps {
    type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
    data: any;
    options?: any;
    width?: number;
    height?: number;
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    loading?: boolean;
    error?: string;
    onChartReady?: (chart: any) => void;
    onDataPointClick?: (point: any, event: any) => void;
}

// 通知组件属性
export interface NotificationProps {
    id?: string;
    type?: 'success' | 'warning' | 'error' | 'info';
    title?: string;
    message: string;
    duration?: number;
    closable?: boolean;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'bottom';
    onClose?: () => void;
    onClick?: () => void;
}

// 工具提示组件属性
export interface TooltipProps extends BaseComponentProps {
    title: React.ReactNode;
    placement?: Position;
    trigger?: 'hover' | 'focus' | 'click' | 'contextMenu';
    visible?: boolean;
    defaultVisible?: boolean;
    onVisibleChange?: (visible: boolean) => void;
    overlayClassName?: string;
    overlayStyle?: React.CSSProperties;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    getPopupContainer?: () => HTMLElement;
}

// 弹出框组件属性
export interface PopoverProps extends BaseComponentProps {
    content: React.ReactNode;
    title?: React.ReactNode;
    placement?: Position;
    trigger?: 'hover' | 'focus' | 'click' | 'contextMenu';
    visible?: boolean;
    defaultVisible?: boolean;
    onVisibleChange?: (visible: boolean) => void;
    overlayClassName?: string;
    overlayStyle?: React.CSSProperties;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    getPopupContainer?: () => HTMLElement;
}

// 下拉菜单组件属性
export interface DropdownProps extends BaseComponentProps {
    menu: DropdownMenu;
    placement?: Position;
    trigger?: 'hover' | 'focus' | 'click' | 'contextMenu';
    visible?: boolean;
    defaultVisible?: boolean;
    onVisibleChange?: (visible: boolean) => void;
    overlayClassName?: string;
    overlayStyle?: React.CSSProperties;
    getPopupContainer?: () => HTMLElement;
    disabled?: boolean;
}

export interface DropdownMenu {
    items: DropdownMenuItem[];
    onClick?: (key: string, item: DropdownMenuItem) => void;
}

export interface DropdownMenuItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
    children?: DropdownMenuItem[];
}

// 面包屑组件属性
export interface BreadcrumbProps extends BaseComponentProps {
    items: BreadcrumbItem[];
    separator?: React.ReactNode;
    maxItems?: number;
    itemRender?: (item: BreadcrumbItem, index: number) => React.ReactNode;
}

export interface BreadcrumbItem {
    title: React.ReactNode;
    href?: string;
    onClick?: (event: React.MouseEvent) => void;
    icon?: React.ReactNode;
    menu?: DropdownMenu;
}

// 步骤条组件属性
export interface StepsProps extends BaseComponentProps {
    current?: number;
    direction?: 'horizontal' | 'vertical';
    size?: 'default' | 'small';
    status?: 'wait' | 'process' | 'finish' | 'error';
    type?: 'default' | 'navigation';
    onChange?: (current: number) => void;
    items: StepItem[];
}

export interface StepItem {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    status?: 'wait' | 'process' | 'finish' | 'error';
    disabled?: boolean;
    subTitle?: React.ReactNode;
}

// 标签页组件属性
export interface TabsProps extends BaseComponentProps {
    activeKey?: string;
    defaultActiveKey?: string;
    items: TabItem[];
    type?: 'line' | 'card' | 'editable-card';
    size?: Size;
    position?: 'top' | 'bottom' | 'left' | 'right';
    centered?: boolean;
    onChange?: (activeKey: string) => void;
    onEdit?: (targetKey: string, action: 'add' | 'remove') => void;
    addIcon?: React.ReactNode;
    moreIcon?: React.ReactNode;
}

export interface TabItem {
    key: string;
    label: React.ReactNode;
    children: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
    closable?: boolean;
    forceRender?: boolean;
}

// 折叠面板组件属性
export interface CollapseProps extends BaseComponentProps {
    activeKey?: string | string[];
    defaultActiveKey?: string | string[];
    items: CollapseItem[];
    accordion?: boolean;
    bordered?: boolean;
    expandIcon?: (panelProps: any) => React.ReactNode;
    expandIconPosition?: 'left' | 'right';
    ghost?: boolean;
    size?: Size;
    onChange?: (key: string | string[]) => void;
}

export interface CollapseItem {
    key: string;
    label: React.ReactNode;
    children: React.ReactNode;
    disabled?: boolean;
    forceRender?: boolean;
    showArrow?: boolean;
    extra?: React.ReactNode;
    collapsible?: 'header' | 'disabled';
}

// 事件处理器类型
export type EventHandler<T = any> = (event: T) => void;
export type ChangeHandler<T = any> = (value: T, event?: React.ChangeEvent) => void;
export type ClickHandler = EventHandler<React.MouseEvent>;
export type FocusHandler = EventHandler<React.FocusEvent>;
export type BlurHandler = EventHandler<React.FocusEvent>;
export type KeyboardHandler = EventHandler<React.KeyboardEvent>;

// 响应式断点类型
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// 响应式值类型
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// 主题相关类型
export type ThemeMode = 'light' | 'dark' | 'auto';

// 组件状态类型
export type ComponentState = 'idle' | 'loading' | 'success' | 'error';

// 验证规则类型
export interface ValidationRule {
    required?: boolean;
    message?: string;
    pattern?: RegExp;
    min?: number;
    max?: number;
    validator?: (value: any) => boolean | string | Promise<boolean | string>;
}

// 表单字段类型
export interface FormField {
    name: string;
    label?: string;
    type?: string;
    value?: any;
    defaultValue?: any;
    rules?: ValidationRule[];
    dependencies?: string[];
    hidden?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
}

// 表单配置类型
export interface FormConfig {
    fields: FormField[];
    layout?: 'horizontal' | 'vertical' | 'inline';
    labelCol?: { span?: number; offset?: number };
    wrapperCol?: { span?: number; offset?: number };
    validateTrigger?: 'onChange' | 'onBlur' | 'onSubmit';
    preserve?: boolean;
    scrollToFirstError?: boolean;
}