// 图标类型定义
import React from 'react';// 基础图标属性
export interface IconProps     {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
}

// 图标组件类型
export type IconComponent   = React.FC<IconProps>;// 图标名称类型
export type IconName   = | 'activity'
  | 'alert-circle'
  | 'bar-chart-3'
  | 'bug'
  | 'check-circle'
  | 'clock'
  | 'file-text'
  | 'globe'
  | 'history'
  | 'info'
  | 'loader-2'
  | 'minus'
  | 'moon'
  | 'play'
  | 'settings'
  | 'smartphone'
  | 'sun'
  | 'trash-2'
  | 'trending-up'
  | 'user'
  | 'users'
  | 'x'
  | 'x-circle'
  | 'zap';// 图标尺寸类型
export type IconSize   = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;// 图标颜色类型
export type IconColor   = | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted'
  | 'inherit'
  | 'current'
  | string;// 扩展的图标属性
export interface ExtendedIconProps extends IconProps     {
  name?: IconName;
  spin?: boolean;
  title?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
  onClick?: (event: React.MouseEvent<SVGElement>) => void;
}

// 图标配置类型
export interface IconConfig     {
  defaultSize?: IconSize;
  defaultColor?: IconColor;
  defaultStrokeWidth?: number;
}

// 导出默认图标配置
export const defaultIconConfig: IconConfig = {
  defaultSize: 'md',
  defaultColor: 'current',
  defaultStrokeWidth: 2
};
