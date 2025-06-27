import React, { useState } from 'react';
import { Link, Globe, AlertCircle, CheckCircle } from 'lucide-react';

interface URLInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

const URLInput: React.FC<URLInputProps> = ({
  value,
  onChange,
  placeholder = "输入网站URL...",
  className = "",
  disabled = false,
  required = false,
  autoFocus = false
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");

  const validateURL = (url: string): boolean => {
    if (!url) {
      setError("");
      setIsValid(null);
      return false;
    }

    try {
      const urlObj = new URL(url);
      const isValidProtocol = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      
      if (!isValidProtocol) {
        setError("URL必须以http://或https://开头");
        setIsValid(false);
        return false;
      }

      if (!urlObj.hostname) {
        setError("请输入有效的域名");
        setIsValid(false);
        return false;
      }

      setError("");
      setIsValid(true);
      return true;
    } catch {
      setError("请输入有效的URL格式");
      setIsValid(false);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // 延迟验证以避免输入时频繁验证
    setTimeout(() => validateURL(newValue), 300);
  };

  const handleBlur = () => {
    validateURL(value);
  };

  const getIconColor = () => {
    if (isValid === true) return "text-green-400";
    if (isValid === false) return "text-red-400";
    return "text-gray-400";
  };

  const getBorderColor = () => {
    if (isValid === true) return "border-green-500 focus:ring-green-500";
    if (isValid === false) return "border-red-500 focus:ring-red-500";
    return "border-gray-600 focus:ring-blue-500";
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className={`
            themed-input pl-12 pr-12
            ${getBorderColor()}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        
        {/* 左侧图标 */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Globe className={`w-5 h-5 ${getIconColor()}`} />
        </div>
        
        {/* 右侧状态图标 */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isValid === true && (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          {isValid === false && (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          {isValid === null && value && (
            <Link className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* 错误信息 */}
      {error && (
        <div className="mt-2 text-sm text-red-400 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
      
      {/* 成功信息 */}
      {isValid === true && !error && (
        <div className="mt-2 text-sm text-green-400 flex items-center">
          <CheckCircle className="w-4 h-4 mr-1" />
          URL格式正确
        </div>
      )}
    </div>
  );
};

export default URLInput;
