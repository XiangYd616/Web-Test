import type { ReactNode, createContext, useContext, useEffect, useState, FC } from 'react';

// 主题类型定义
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  actualTheme: 'light' | 'dark'; // 实际应用的主题
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 从localStorage获取保存的主题，默认为dark
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme');
    // 如果保存的主题是 'auto'，则转换为 'dark'
    if (savedTheme === 'auto' || !savedTheme || (savedTheme !== 'light' && savedTheme !== 'dark')) {
      return 'dark';
    }
    return savedTheme as ThemeMode;
  });

  // 计算实际应用的主题
  const getActualTheme = (currentTheme: ThemeMode): 'light' | 'dark' => {
    return currentTheme;
  };

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() =>
    getActualTheme(theme)
  );

  // 设置主题
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    setActualTheme(getActualTheme(newTheme));
  };

  // 切换主题（在light和dark之间切换）
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // 应用主题到document
  useEffect(() => {
    const root = document.documentElement;

    // 移除之前的主题类
    root.classList.remove('light-theme', 'dark-theme', 'light', 'dark');

    // 添加当前主题类
    root.classList.add(`${actualTheme}-theme`);
    // 同时添加 Tailwind CSS 需要的类
    root.classList.add(actualTheme);

    // 设置CSS变量
    if (actualTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#1f2937');
      root.style.setProperty('--bg-secondary', '#374151');
      root.style.setProperty('--bg-tertiary', '#4b5563');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#d1d5db');
      root.style.setProperty('--text-tertiary', '#9ca3af');
      root.style.setProperty('--border-primary', '#4b5563');
      root.style.setProperty('--border-secondary', '#6b7280');
      root.style.setProperty('--accent-primary', '#3b82f6');
      root.style.setProperty('--accent-secondary', '#1d4ed8');
      root.style.setProperty('--success-color', '#10b981');
      root.style.setProperty('--warning-color', '#f59e0b');
      root.style.setProperty('--error-color', '#ef4444');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');

      // 登录页面专用变量
      root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #1f2937 0%, #111827 100%)');
      root.style.setProperty('--card-background', 'rgba(31, 41, 55, 0.95)');
      root.style.setProperty('--input-background', 'rgba(55, 65, 81, 0.8)');
      root.style.setProperty('--input-border', '#4b5563');
      root.style.setProperty('--border-color', '#4b5563');
      root.style.setProperty('--secondary-button-background', 'rgba(55, 65, 81, 0.6)');
      root.style.setProperty('--error-background', 'rgba(127, 29, 29, 0.3)');
      root.style.setProperty('--error-border', '#f87171');
      root.style.setProperty('--error-text', '#fca5a5');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--bg-tertiary', '#f1f5f9');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-tertiary', '#64748b');
      root.style.setProperty('--border-primary', '#e2e8f0');
      root.style.setProperty('--border-secondary', '#cbd5e1');
      root.style.setProperty('--accent-primary', '#3b82f6');
      root.style.setProperty('--accent-secondary', '#1d4ed8');
      root.style.setProperty('--success-color', '#059669');
      root.style.setProperty('--warning-color', '#d97706');
      root.style.setProperty('--error-color', '#dc2626');
      root.style.setProperty('--shadow-color', 'rgba(15, 23, 42, 0.08)');

      // 登录页面专用变量 - 优化配色
      root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #f1f5f9 70%, #fdf2f8 100%)');
      root.style.setProperty('--card-background', 'rgba(255, 255, 255, 0.90)');
      root.style.setProperty('--input-background', 'rgba(255, 255, 255, 0.98)');
      root.style.setProperty('--input-border', '#cbd5e1');
      root.style.setProperty('--border-color', '#cbd5e1');
      root.style.setProperty('--secondary-button-background', 'rgba(248, 250, 252, 0.95)');
      root.style.setProperty('--error-background', 'rgba(254, 242, 242, 0.98)');
      root.style.setProperty('--error-border', '#f87171');
      root.style.setProperty('--error-text', '#dc2626');

      // 新增变量
      root.style.setProperty('--card-shadow', '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)');
      root.style.setProperty('--input-focus-ring', 'rgba(59, 130, 246, 0.20)');
      root.style.setProperty('--button-shadow', '0 10px 25px -5px rgba(59, 130, 246, 0.25)');
      root.style.setProperty('--text-gradient', 'linear-gradient(135deg, #1e293b 0%, #475569 100%)');
      root.style.setProperty('--link-gradient', 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)');
    }
  }, [actualTheme]);

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义Hook
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
