/**
 * 测试数据生成器组件
 * 帮助用户生成各种类型的测试数据
 */

import React, { useState, useCallback } from 'react';
import {
  Database,
  Download,
  Copy,
  RefreshCw,
  FileText,
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Hash,
  Key,
  Shuffle,
  Settings,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DataType {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  generator: (count: number, options?: any) => any[];
}

interface GeneratedData {
  type: string;
  data: any[];
  count: number;
  timestamp: Date;
}

const TestDataGenerator: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('users');
  const [count, setCount] = useState<number>(10);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // 数据生成选项
  const [options, setOptions] = useState({
    users: {
      includeEmail: true,
      includePhone: true,
      includeAddress: true,
      locale: 'zh-CN'
    },
    urls: {
      includeDomains: ['example.com', 'test.org', 'demo.net'],
      includeSubdomains: true,
      includeParams: true,
      protocols: ['http', 'https']
    },
    api: {
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      includeHeaders: true,
      includeBody: true,
      responseFormat: 'json'
    }
  });

  // 数据类型定义
  const dataTypes: DataType[] = [
    {
      id: 'users',
      name: '用户数据',
      icon: User,
      description: '生成用户信息，包括姓名、邮箱、电话等',
      generator: (count, opts) => generateUsers(count, opts)
    },
    {
      id: 'emails',
      name: '邮箱地址',
      icon: Mail,
      description: '生成各种格式的邮箱地址',
      generator: (count, opts) => generateEmails(count, opts)
    },
    {
      id: 'phones',
      name: '电话号码',
      icon: Phone,
      description: '生成手机号码和电话号码',
      generator: (count, opts) => generatePhones(count, opts)
    },
    {
      id: 'urls',
      name: 'URL链接',
      icon: Globe,
      description: '生成各种URL链接用于测试',
      generator: (count, opts) => generateUrls(count, opts)
    },
    {
      id: 'dates',
      name: '日期时间',
      icon: Calendar,
      description: '生成各种格式的日期时间数据',
      generator: (count, opts) => generateDates(count, opts)
    },
    {
      id: 'numbers',
      name: '数字数据',
      icon: Hash,
      description: '生成整数、小数、ID等数字数据',
      generator: (count, opts) => generateNumbers(count, opts)
    },
    {
      id: 'passwords',
      name: '密码字符串',
      icon: Key,
      description: '生成各种强度的密码字符串',
      generator: (count, opts) => generatePasswords(count, opts)
    },
    {
      id: 'api',
      name: 'API数据',
      icon: Database,
      description: '生成API测试数据，包括请求和响应',
      generator: (count, opts) => generateApiData(count, opts)
    }
  ];

  // 用户数据生成器
  function generateUsers(count: number, opts: any = {}) {
    const users = [];
    const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋'];
    const domains = ['qq.com', '163.com', 'gmail.com', 'hotmail.com'];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = firstName + lastName;
      
      const user: any = {
        id: 10000 + i,
        name: name,
        username: `user${1000 + i}`
      };

      if (opts.includeEmail) {
        const domain = domains[Math.floor(Math.random() * domains.length)];
        user.email = `${user.username}@${domain}`;
      }

      if (opts.includePhone) {
        user.phone = `1${Math.floor(Math.random() * 10)}${Math.random().toString().substr(2, 9)}`;
      }

      if (opts.includeAddress) {
        const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京'];
        const city = cities[Math.floor(Math.random() * cities.length)];
        user.address = `${city}市某某区某某街道${Math.floor(Math.random() * 999) + 1}号`;
      }

      user.age = Math.floor(Math.random() * 50) + 18;
      user.createdAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);

      users.push(user);
    }

    return users;
  }

  // 邮箱地址生成器
  function generateEmails(count: number, opts: any = {}) {
    const emails = [];
    const prefixes = ['user', 'test', 'demo', 'admin', 'info', 'contact'];
    const domains = ['example.com', 'test.org', 'demo.net', 'gmail.com', 'qq.com'];

    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const suffix = Math.random().toString(36).substr(2, 5);
      
      emails.push(`${prefix}${suffix}@${domain}`);
    }

    return emails;
  }

  // 电话号码生成器
  function generatePhones(count: number, opts: any = {}) {
    const phones = [];
    const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139'];

    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.random().toString().substr(2, 8);
      phones.push(`${prefix}${suffix}`);
    }

    return phones;
  }

  // URL生成器
  function generateUrls(count: number, opts: any = {}) {
    const urls = [];
    const { includeDomains, includeSubdomains, includeParams, protocols } = opts;
    const domains = includeDomains || ['example.com', 'test.org', 'demo.net'];
    const paths = ['', '/api', '/admin', '/user', '/docs', '/help'];
    const subdomains = ['www', 'api', 'admin', 'test', 'dev'];

    for (let i = 0; i < count; i++) {
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const path = paths[Math.floor(Math.random() * paths.length)];
      
      let url = `${protocol}://`;
      
      if (includeSubdomains && Math.random() > 0.5) {
        const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
        url += `${subdomain}.`;
      }
      
      url += domain + path;
      
      if (includeParams && Math.random() > 0.5) {
        const paramCount = Math.floor(Math.random() * 3) + 1;
        const params = [];
        for (let j = 0; j < paramCount; j++) {
          params.push(`param${j}=value${j}`);
        }
        url += '?' + params.join('&');
      }

      urls.push(url);
    }

    return urls;
  }

  // 日期生成器
  function generateDates(count: number, opts: any = {}) {
    const dates = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (let i = 0; i < count; i++) {
      const randomDays = Math.floor(Math.random() * 365) - 180; // 前后180天
      const date = new Date(now + randomDays * oneDay);
      
      dates.push({
        iso: date.toISOString(),
        formatted: date.toLocaleDateString('zh-CN'),
        timestamp: date.getTime(),
        relative: getRelativeTime(date)
      });
    }

    return dates;
  }

  // 数字生成器
  function generateNumbers(count: number, opts: any = {}) {
    const numbers = [];

    for (let i = 0; i < count; i++) {
      numbers.push({
        integer: Math.floor(Math.random() * 1000000),
        decimal: parseFloat((Math.random() * 1000).toFixed(2)),
        id: Math.random().toString(36).substr(2, 9),
        hex: Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        percentage: Math.floor(Math.random() * 101)
      });
    }

    return numbers;
  }

  // 密码生成器
  function generatePasswords(count: number, opts: any = {}) {
    const passwords = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

    for (let i = 0; i < count; i++) {
      const length = 8 + Math.floor(Math.random() * 8); // 8-15位
      let password = '';
      for (let j = 0; j < length; j++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      passwords.push({
        password,
        length,
        strength: getPasswordStrength(password)
      });
    }

    return passwords;
  }

  // API数据生成器
  function generateApiData(count: number, opts: any = {}) {
    const apiData = [];
    const { methods, includeHeaders, includeBody } = opts;
    const endpoints = ['/users', '/products', '/orders', '/auth/login', '/api/data'];

    for (let i = 0; i < count; i++) {
      const method = methods[Math.floor(Math.random() * methods.length)];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      
      const request: any = {
        method,
        url: `https://api.example.com${endpoint}`,
        id: i + 1
      };

      if (includeHeaders) {
        request.headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Math.random().toString(36).substr(2, 32)}`,
          'User-Agent': 'TestDataGenerator/1.0'
        };
      }

      if (includeBody && ['POST', 'PUT'].includes(method)) {
        request.body = {
          id: i + 1,
          name: `Test Item ${i + 1}`,
          data: Math.random().toString(36).substr(2, 10),
          timestamp: new Date().toISOString()
        };
      }

      apiData.push(request);
    }

    return apiData;
  }

  // 获取相对时间
  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) return '今天';
    if (days === 1) return date < now ? '昨天' : '明天';
    if (days < 7) return `${days}天${date < now ? '前' : '后'}`;
    if (days < 30) return `${Math.floor(days / 7)}周${date < now ? '前' : '后'}`;
    return `${Math.floor(days / 30)}月${date < now ? '前' : '后'}`;
  }

  // 获取密码强度
  function getPasswordStrength(password: string): string {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return '弱';
    if (score <= 3) return '中';
    if (score <= 4) return '强';
    return '非常强';
  }

  // 生成数据
  const generateData = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const selectedDataType = dataTypes.find(type => type.id === selectedType);
      if (!selectedDataType) {
        throw new Error('未找到选择的数据类型');
      }

      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 500));

      const data = selectedDataType.generator(count, options[selectedType] || {});
      
      setGeneratedData({
        type: selectedType,
        data,
        count: data.length,
        timestamp: new Date()
      });

      toast.success(`成功生成 ${data.length} 条${selectedDataType.name}`);
    } catch (error) {
      toast.error('生成数据失败: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedType, count, options]);

  // 复制数据
  const copyData = useCallback((format: 'json' | 'csv' | 'text') => {
    if (!generatedData) return;

    let textData = '';
    
    switch (format) {
      case 'json':
        textData = JSON.stringify(generatedData.data, null, 2);
        break;
      case 'csv':
        if (generatedData.data.length > 0) {
          const headers = Object.keys(generatedData.data[0]);
          const csvRows = [headers.join(',')];
          generatedData.data.forEach(item => {
            const values = headers.map(header => {
              const value = item[header];
              return typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            csvRows.push(values.join(','));
          });
          textData = csvRows.join('\n');
        }
        break;
      case 'text':
        textData = generatedData.data.map(item => 
          typeof item === 'object' ? JSON.stringify(item) : String(item)
        ).join('\n');
        break;
    }

    navigator.clipboard.writeText(textData).then(() => {
      toast.success(`已复制${format.toUpperCase()}格式数据到剪贴板`);
    }).catch(() => {
      toast.error('复制失败');
    });
  }, [generatedData]);

  // 下载数据
  const downloadData = useCallback((format: 'json' | 'csv' | 'txt') => {
    if (!generatedData) return;

    let content = '';
    let mimeType = '';
    let extension = '';

    switch (format) {
      case 'json':
        content = JSON.stringify(generatedData.data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        if (generatedData.data.length > 0) {
          const headers = Object.keys(generatedData.data[0]);
          const csvRows = [headers.join(',')];
          generatedData.data.forEach(item => {
            const values = headers.map(header => {
              const value = item[header];
              return typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            csvRows.push(values.join(','));
          });
          content = csvRows.join('\n');
        }
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'txt':
        content = generatedData.data.map(item => 
          typeof item === 'object' ? JSON.stringify(item) : String(item)
        ).join('\n');
        mimeType = 'text/plain';
        extension = 'txt';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-data-${selectedType}-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`已下载${format.toUpperCase()}文件`);
  }, [generatedData, selectedType]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">测试数据生成器</h1>
              <p className="text-gray-600">快速生成各种类型的测试数据</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>选项</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：数据类型选择 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">数据类型</h2>
            
            <div className="space-y-2">
              {dataTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedType === type.id
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <type.icon className={`w-5 h-5 ${
                      selectedType === type.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {type.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                生成数量
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={count}
                onChange={(e) => setCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">最多1000条</p>
            </div>

            <button
              onClick={generateData}
              disabled={isGenerating}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
              <span>{isGenerating ? '生成中...' : '生成数据'}</span>
            </button>
          </div>
        </div>

        {/* 右侧：生成的数据显示 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            {generatedData ? (
              <>
                {/* 数据头部 */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        生成完成 - {generatedData.count} 条数据
                      </h3>
                      <p className="text-sm text-gray-500">
                        {generatedData.timestamp.toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 复制按钮 */}
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        onClick={() => copyData('json')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                        title="复制JSON格式"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => copyData('csv')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-l border-gray-300 transition-colors"
                        title="复制CSV格式"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => copyData('text')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-l border-gray-300 transition-colors"
                        title="复制文本格式"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 下载按钮 */}
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        onClick={() => downloadData('json')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                        title="下载JSON文件"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => downloadData('csv')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-l border-gray-300 transition-colors"
                        title="下载CSV文件"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => downloadData('txt')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-l border-gray-300 transition-colors"
                        title="下载文本文件"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 数据预览 */}
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(generatedData.data.slice(0, 10), null, 2)}
                      {generatedData.data.length > 10 && (
                        <div className="text-gray-500 mt-2 italic">
                          ... 还有 {generatedData.data.length - 10} 条数据
                        </div>
                      )}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  选择数据类型并生成
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  在左侧选择要生成的数据类型，设置数量，然后点击生成按钮开始创建测试数据。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 生成选项面板 */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">生成选项</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                根据不同的数据类型配置生成选项，可以让生成的数据更符合您的测试需求。
              </p>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  选项配置将在后续版本中开放，敬请期待。
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowOptions(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDataGenerator;
