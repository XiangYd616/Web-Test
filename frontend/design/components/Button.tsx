/**
 * 设计系统按钮组件
 * 基于设计令牌的统一按钮组件
 */

import React, { forwardRef } from 'react';
import { styled } from 'styled-components';

// 按钮变体类型
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// 按钮属性接口
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

// 样式化按钮组件
const StyledButton = styled.button<ButtonProps>`
  /* 基础样式 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition-all);
  position: relative;
  overflow: hidden;

  /* 禁用状态 */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* 加载状态 */
  ${props => props.loading && `
    pointer-events: none;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid currentColor;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `}

  /* 全宽样式 */
  ${props => props.fullWidth && `
    width: 100%;
  `}

  /* 尺寸变体 */
  ${props => {
    switch (props.size) {
      case 'xs':
        return `
          padding: var(--spacing-1) var(--spacing-2);
          font-size: var(--font-size-xs);
          min-height: 24px;
        `;
      case 'sm':
        return `
          padding: var(--spacing-2) var(--spacing-3);
          font-size: var(--font-size-sm);
          min-height: 32px;
        `;
      case 'lg':
        return `
          padding: var(--spacing-3) var(--spacing-6);
          font-size: var(--font-size-lg);
          min-height: 48px;
        `;
      case 'xl':
        return `
          padding: var(--spacing-4) var(--spacing-8);
          font-size: var(--font-size-xl);
          min-height: 56px;
        `;
      default: // md
        return `
          padding: var(--spacing-2) var(--spacing-4);
          font-size: var(--font-size-base);
          min-height: 40px;
        `;
    }
  }}

  /* 颜色变体 */
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: var(--color-primary-500);
          color: white;
          border-color: var(--color-primary-500);

          &:hover:not(:disabled) {
            background-color: var(--color-primary-600);
            border-color: var(--color-primary-600);
          }

          &:active:not(:disabled) {
            background-color: var(--color-primary-700);
            border-color: var(--color-primary-700);
          }
        `;
      case 'secondary':
        return `
          background-color: var(--color-secondary-500);
          color: white;
          border-color: var(--color-secondary-500);

          &:hover:not(:disabled) {
            background-color: var(--color-secondary-600);
            border-color: var(--color-secondary-600);
          }
        `;
      case 'success':
        return `
          background-color: var(--color-success-500);
          color: white;
          border-color: var(--color-success-500);

          &:hover:not(:disabled) {
            background-color: var(--color-success-600);
            border-color: var(--color-success-600);
          }
        `;
      case 'warning':
        return `
          background-color: var(--color-warning-500);
          color: white;
          border-color: var(--color-warning-500);

          &:hover:not(:disabled) {
            background-color: var(--color-warning-600);
            border-color: var(--color-warning-600);
          }
        `;
      case 'error':
        return `
          background-color: var(--color-error-500);
          color: white;
          border-color: var(--color-error-500);

          &:hover:not(:disabled) {
            background-color: var(--color-error-600);
            border-color: var(--color-error-600);
          }
        `;
      case 'ghost':
        return `
          background-color: transparent;
          color: var(--color-primary-500);
          border-color: var(--color-primary-500);

          &:hover:not(:disabled) {
            background-color: var(--color-primary-50);
          }
        `;
      case 'link':
        return `
          background-color: transparent;
          color: var(--color-primary-500);
          border-color: transparent;
          padding: 0;
          min-height: auto;

          &:hover:not(:disabled) {
            text-decoration: underline;
          }
        `;
      default:
        return `
          background-color: var(--color-gray-100);
          color: var(--color-gray-700);
          border-color: var(--color-gray-300);

          &:hover:not(:disabled) {
            background-color: var(--color-gray-200);
            border-color: var(--color-gray-400);
          }
        `;
    }
  }}
`;

// 按钮组件
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    return (
      <StyledButton
        ref={ref}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        loading={loading}
        disabled={disabled || loading}
        {...props}
      >
        {!loading && leftIcon && <span className="button-left-icon">{leftIcon}</span>}
        {!loading && <span className="button-content">{children}</span>}
        {!loading && rightIcon && <span className="button-right-icon">{rightIcon}</span>}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;