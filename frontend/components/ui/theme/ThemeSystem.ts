/**
 * 统一主题系统
 * 提供主题变量、工具函数和类型定义
 */

// 主题类型定义
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: {
        primary: string;
        secondary: string;
        tertiary: string;
    };
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        inverse: string;
    };
    border: {
        primary: string;
        secondary: string;
        tertiary: string;
    };
}

export interface ThemeSpacing {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
}

export interface ThemeRadius {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
}

export interface ThemeShadow {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface Theme {
    mode: ThemeMode;
    colors: ThemeColors;
    spacing: ThemeSpacing;
    radius: ThemeRadius;
    shadow: ThemeShadow;
}

// 预定义主题
export const lightTheme: Theme = {
    mode: 'light',
    colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        primaryActive: '#1d4ed8',
        secondary: '#6b7280',
        secondaryHover: '#4b5563',
        secondaryActive: '#374151',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        background: {
            primary: '#ffffff',
            secondary: '#f8fafc',
            tertiary: '#f1f5f9',
        },
        text: {
            primary: '#0f172a',
            secondary: '#475569',
            tertiary: '#64748b',
            inverse: '#ffffff',
        },
        border: {
            primary: '#e2e8f0',
            secondary: '#cbd5e1',
            tertiary: '#94a3b8',
        },
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
    },
    radius: {
        none: '0',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
    },
    shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
};

export const darkTheme: Theme = {
    mode: 'dark',
    colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        primaryActive: '#1d4ed8',
        secondary: '#6b7280',
        secondaryHover: '#4b5563',
        secondaryActive: '#374151',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        background: {
            primary: '#0f172a',
            secondary: '#1e293b',
            tertiary: '#334155',
        },
        text: {
            primary: '#f8fafc',
            secondary: '#e2e8f0',
            tertiary: '#cbd5e1',
            inverse: '#0f172a',
        },
        border: {
            primary: '#334155',
            secondary: '#475569',
            tertiary: '#64748b',
        },
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
    },
    radius: {
        none: '0',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
    },
    shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
};

// 主题工具函数
export const getTheme = (mode: ThemeMode): Theme => {
    return mode === 'light' ? lightTheme : darkTheme;
};

export const createThemeVariables = (theme: Theme): Record<string, string> => {
    return {
        '--color-primary': theme.colors.primary,
        '--color-primary-hover': theme.colors.primaryHover,
        '--color-primary-active': theme.colors.primaryActive,
        '--color-secondary': theme.colors.secondary,
        '--color-secondary-hover': theme.colors.secondaryHover,
        '--color-secondary-active': theme.colors.secondaryActive,
        '--color-success': theme.colors.success,
        '--color-warning': theme.colors.warning,
        '--color-danger': theme.colors.danger,
        '--color-info': theme.colors.info,
        '--bg-primary': theme.colors.background.primary,
        '--bg-secondary': theme.colors.background.secondary,
        '--bg-tertiary': theme.colors.background.tertiary,
        '--text-primary': theme.colors.text.primary,
        '--text-secondary': theme.colors.text.secondary,
        '--text-tertiary': theme.colors.text.tertiary,
        '--text-inverse': theme.colors.text.inverse,
        '--border-primary': theme.colors.border.primary,
        '--border-secondary': theme.colors.border.secondary,
        '--border-tertiary': theme.colors.border.tertiary,
        '--spacing-xs': theme.spacing.xs,
        '--spacing-sm': theme.spacing.sm,
        '--spacing-md': theme.spacing.md,
        '--spacing-lg': theme.spacing.lg,
        '--spacing-xl': theme.spacing.xl,
        '--spacing-2xl': theme.spacing['2xl'],
        '--spacing-3xl': theme.spacing['3xl'],
        '--radius-none': theme.radius.none,
        '--radius-sm': theme.radius.sm,
        '--radius-md': theme.radius.md,
        '--radius-lg': theme.radius.lg,
        '--radius-xl': theme.radius.xl,
        '--radius-2xl': theme.radius['2xl'],
        '--radius-full': theme.radius.full,
        '--shadow-sm': theme.shadow.sm,
        '--shadow-md': theme.shadow.md,
        '--shadow-lg': theme.shadow.lg,
        '--shadow-xl': theme.shadow.xl,
        '--shadow-2xl': theme.shadow['2xl'],
    };
};

// 主题相关的CSS类名生成器
export const themeClasses = {
    button: {
        primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500 active:bg-blue-800',
        secondary: 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-700 focus:ring-gray-500 active:bg-gray-800',
        danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 focus:ring-red-500 active:bg-red-800',
        ghost: 'bg-transparent text-gray-400 border-gray-600 hover:text-white hover:bg-gray-700 hover:border-gray-500 focus:ring-gray-500 active:bg-gray-800',
        outline: 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500 focus:ring-gray-500 active:bg-gray-800',
    },
    input: {
        default: 'bg-gray-700/50 border-gray-600/60 hover:border-gray-500/80 hover:bg-gray-600/50 focus:border-blue-500 focus:bg-gray-700/70 focus:ring-2 focus:ring-blue-500/20',
        filled: 'bg-gray-700 border-gray-700 hover:bg-gray-600 hover:border-gray-600 focus:border-blue-500 focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20',
        outlined: 'bg-transparent border-gray-600 hover:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    },
    card: {
        default: 'bg-gray-800 border-gray-700',
        elevated: 'bg-gray-800 border-gray-700 shadow-xl',
    },
};