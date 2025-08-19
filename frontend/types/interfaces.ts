import React from "react";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface LoadingProps extends BaseComponentProps {
  size?: "small" | "medium" | "large";
  text?: string;
  overlay?: boolean;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export interface InputProps extends BaseComponentProps {
  type: "text" | "email" | "password" | "number" | "select" | "textarea";
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large";
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: number;
}

export interface TableProps<T = any> extends BaseComponentProps {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationParams;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    pattern?: RegExp;
    message?: string;
  };
}

export interface FormProps extends BaseComponentProps {
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  loading?: boolean;
}

export interface TestConfig {
  id?: string;
  name: string;
  type: "performance" | "seo" | "security" | "api" | "stress";
  url: string;
  settings: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestResult {
  id: string;
  testId: string;
  status: "pending" | "running" | "completed" | "failed";
  score: number;
  grade: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  details: Record<string, any>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user" | "tester";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  lastLoginAt?: string;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// 类型不需要默认导出
