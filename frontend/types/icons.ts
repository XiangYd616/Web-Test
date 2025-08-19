import React from "react";

export interface IconProps {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
}

export type IconComponent = React.FC<IconProps>;

export type IconName = 
  | "activity"
  | "alert-circle"
  | "bar-chart-3"
  | "bug"
  | "check-circle"
  | "clock"
  | "file-text"
  | "globe"
  | "history"
  | "info"
  | "loader-2"
  | "minus"
  | "moon"
  | "play"
  | "settings"
  | "smartphone"
  | "sun"
  | "trash-2"
  | "trending-up"
  | "user"
  | "users"
  | "x"
  | "x-circle"
  | "zap";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

export type IconColor = 
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted"
  | "inherit"
  | "current";

export interface ExtendedIconProps extends IconProps {
  name: IconName;
  variant?: "outline" | "filled" | "duotone";
  rotation?: 0 | 90 | 180 | 270;
  flip?: "horizontal" | "vertical" | "both";
  spin?: boolean;
  pulse?: boolean;
}

export interface IconConfig {
  defaultSize: IconSize;
  defaultColor: IconColor;
  defaultStrokeWidth: number;
}

export const defaultIconConfig: IconConfig = {
  defaultSize: "md",
  defaultColor: "current",
  defaultStrokeWidth: 2
};

export const ICON_SIZES: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};

export const ICON_COLORS: Record<IconColor, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  info: "var(--color-info)",
  muted: "var(--color-muted)",
  inherit: "inherit",
  current: "currentColor"
};

export function getIconSize(size: IconSize | number | string): number {
  if (typeof size === "number") return size;
  if (typeof size === "string" && !isNaN(Number(size))) return Number(size);
  return ICON_SIZES[size as IconSize] || ICON_SIZES.md;
}

export function getIconColor(color: IconColor | string): string {
  return ICON_COLORS[color as IconColor] || color || ICON_COLORS.current;
}

// 类型不需要默认导出
