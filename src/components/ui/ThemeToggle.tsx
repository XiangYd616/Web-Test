import { Moon, Sun } from 'lucide-react';
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md'
}) => {
  const { theme, setTheme, actualTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className={`${getSizeClass()} text-yellow-500`} />;
      case 'dark':
        return <Moon className={`${getSizeClass()} text-blue-400`} />;
      default:
        return <Moon className={`${getSizeClass()} text-blue-400`} />;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-5 h-5';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getButtonSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'p-2';
      case 'md':
        return 'p-2.5';
      case 'lg':
        return 'p-3';
      default:
        return 'p-2.5';
    }
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark'> = ['light', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return '浅色主题';
      case 'dark':
        return '深色主题';
      default:
        return '深色主题';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={cycleTheme}
        className={`
          ${getButtonSizeClass()}
          themed-button-secondary
          rounded-full
          transition-all duration-200
          hover:scale-105
          active:scale-95
          focus:outline-none
          focus:ring-2
          focus:ring-offset-2
          focus:ring-blue-500
          ${actualTheme === 'light'
            ? 'bg-white border-gray-300 hover:bg-gray-50 focus:ring-offset-white'
            : 'bg-gray-800 border-gray-600 hover:bg-gray-700 focus:ring-offset-gray-900'
          }
        `}
        title={`当前: ${getThemeLabel()}, 点击切换`}
        aria-label={`主题切换按钮，当前: ${getThemeLabel()}`}
      >
        {getIcon()}
      </button>

      {showLabel && (
        <span className={`text-sm font-medium ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
          }`}>
          {getThemeLabel()}
        </span>
      )}
    </div>
  );
};

// 下拉选择器版本的主题切换
export const ThemeSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme, actualTheme } = useTheme();

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="theme-select" className={`block text-sm font-medium ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
        }`}>
        主题模式
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
        aria-label="选择主题模式"
        className={`
          w-full px-3 py-2 rounded-lg border transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${actualTheme === 'light'
            ? 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
            : 'bg-gray-800 border-gray-600 text-white hover:border-gray-500'
          }
        `}
      >
        <option value="light">浅色主题</option>
        <option value="dark">深色主题</option>
      </select>
    </div>
  );
};

// 切换开关版本的主题切换
export const ThemeSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(actualTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Sun className={`w-4 h-4 ${actualTheme === 'light' ? 'text-yellow-500' : 'text-gray-400'}`} />

      <button
        onClick={toggleTheme}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${actualTheme === 'light'
            ? 'bg-gray-200 focus:ring-offset-white'
            : 'bg-blue-600 focus:ring-offset-gray-900'
          }
        `}
        role="switch"
        aria-checked={actualTheme === 'dark' ? 'true' : 'false'}
        aria-label="切换深色/浅色主题"
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
            ${actualTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>

      <Moon className={`w-4 h-4 ${actualTheme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`} />
    </div>
  );
};

export default ThemeToggle;
