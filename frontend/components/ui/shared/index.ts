/**
 * 共享组件入口
 */

// 简单的类型定义和导出
export interface ButtonProps     {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface InputProps     {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// 占位符组件 - 使用简单的函数声明避免JSX语法问题
export function Button(props: ButtonProps) {
  return null; // 占位符实现
}

export function Input(props: InputProps) {
  return null; // 占位符实现
}

export function Modal(props: any) {
  return null; // 占位符实现
}

export function Loading() {
  return null; // 占位符实现
}
