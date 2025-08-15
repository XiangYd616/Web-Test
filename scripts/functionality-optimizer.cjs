#!/usr/bin/env node

/**
 * 功能优化脚本
 * 自动修复项目中发现的关键问题
 */

const fs = require('fs');
const path = require('path');

class FunctionalityOptimizer {
  constructor() {
    this.fixes = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 执行所有优化
   */
  async optimize() {
    console.log('🚀 开始功能优化...\n');

    try {
      // 1. 修复数据管理页面
      await this.fixDataManagementPage();
      
      // 2. 移除硬编码URL
      await this.removeHardcodedUrls();
      
      // 3. 统一错误处理
      await this.unifyErrorHandling();
      
      // 4. 修复配置管理
      await this.fixConfigManagement();
      
      // 5. 优化测试引擎管理
      await this.optimizeTestEngineManagement();

      this.printSummary();
    } catch (error) {
      console.error('❌ 优化过程中发生错误:', error);
    }
  }

  /**
   * 修复数据管理页面
   */
  async fixDataManagementPage() {
    console.log('🔧 修复数据管理页面...');
    
    const filePath = 'frontend/pages/management/admin/DataManagement.tsx';
    
    if (!fs.existsSync(filePath)) {
      this.warnings.push('数据管理页面文件不存在');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否是占位符
    if (content.includes('数据管理功能正在开发中...')) {
      const newContent = `import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Filter, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthCheck } from '../../../components/auth/WithAuthCheck.tsx';

/**
 * 数据管理页面 - 完整实现版
 */
const DataManagement: React.FC = () => {
  useAuthCheck();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data-management/list');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 导出数据
  const handleExport = async () => {
    try {
      const response = await fetch('/api/data-management/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter, selectedItems })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`data-export-\${new Date().toISOString().split('T')[0]}.csv\`;
        a.click();
      }
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 删除数据
  const handleDelete = async () => {
    if (!selectedItems.length) return;
    
    if (confirm(\`确定要删除 \${selectedItems.length} 项数据吗？\`)) {
      try {
        const response = await fetch('/api/data-management/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedItems })
        });
        
        if (response.ok) {
          setSelectedItems([]);
          loadData();
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6" />
            数据管理
          </h1>
          <p className="text-gray-400 mt-1">管理测试数据、导入导出和批量操作</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={\`w-4 h-4 \${loading ? 'animate-spin' : ''}\`} />
            刷新
          </button>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          
          {selectedItems.length > 0 && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除 ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索数据..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <Filter className="w-5 h-5 text-gray-400" />
      </div>

      {/* 数据表格 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            加载中...
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === data.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(data.map((item: any) => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300">ID</th>
                  <th className="px-4 py-3 text-left text-gray-300">类型</th>
                  <th className="px-4 py-3 text-left text-gray-300">URL</th>
                  <th className="px-4 py-3 text-left text-gray-300">状态</th>
                  <th className="px-4 py-3 text-left text-gray-300">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.id}</td>
                    <td className="px-4 py-3 text-gray-300">{item.type}</td>
                    <td className="px-4 py-3 text-gray-300">{item.url}</td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-1 rounded-full text-xs \${
                        item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }\`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;`;

      fs.writeFileSync(filePath, newContent, 'utf8');
      this.fixes.push('✅ 修复了数据管理页面占位符问题');
    } else {
      this.warnings.push('数据管理页面已经有实现，跳过修复');
    }
  }

  /**
   * 移除硬编码URL
   */
  async removeHardcodedUrls() {
    console.log('🔧 移除硬编码URL...');
    
    // 创建API配置文件
    const apiConfigPath = 'frontend/config/api.ts';
    const apiConfigDir = path.dirname(apiConfigPath);
    
    if (!fs.existsSync(apiConfigDir)) {
      fs.mkdirSync(apiConfigDir, { recursive: true });
    }

    const apiConfigContent = `/**
 * API配置
 */

// 获取API基础URL
export const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 开发环境默认值
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  // 生产环境使用相对路径
  return '';
};

// API端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh'
  },
  
  // 测试相关
  TEST: {
    HISTORY: '/api/test/history',
    START: '/api/test/start',
    STOP: '/api/test/stop',
    RESULTS: '/api/test/results'
  },
  
  // 数据管理
  DATA: {
    LIST: '/api/data-management/list',
    EXPORT: '/api/data-management/export',
    DELETE: '/api/data-management/delete'
  },
  
  // 用户相关
  USER: {
    PROFILE: '/api/user/profile',
    STATS: '/api/user/stats',
    PREFERENCES: '/api/user/preferences'
  }
};

// 创建完整的API URL
export const createApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  return \`\${baseUrl}\${endpoint}\`;
};

// API请求配置
export const getApiConfig = () => ({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});`;

    fs.writeFileSync(apiConfigPath, apiConfigContent, 'utf8');
    this.fixes.push('✅ 创建了API配置文件');

    // 更新环境变量示例
    const envExamplePath = '.env.example';
    if (fs.existsSync(envExamplePath)) {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      if (!envContent.includes('VITE_API_URL')) {
        envContent += '\n# API配置\nVITE_API_URL=http://localhost:3001\n';
        fs.writeFileSync(envExamplePath, envContent, 'utf8');
        this.fixes.push('✅ 更新了环境变量示例');
      }
    }
  }

  /**
   * 统一错误处理
   */
  async unifyErrorHandling() {
    console.log('🔧 统一错误处理...');
    
    const errorHandlerPath = 'frontend/utils/errorHandler.ts';
    const errorHandlerContent = `/**
 * 统一错误处理工具
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class ErrorHandler {
  /**
   * 处理API错误
   */
  static handleApiError(error: any): AppError {
    const timestamp = new Date().toISOString();
    
    if (error.response) {
      // HTTP错误响应
      return {
        code: \`HTTP_\${error.response.status}\`,
        message: error.response.data?.message || '请求失败',
        details: error.response.data,
        timestamp
      };
    } else if (error.request) {
      // 网络错误
      return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        timestamp
      };
    } else {
      // 其他错误
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || '未知错误',
        timestamp
      };
    }
  }

  /**
   * 显示错误消息
   */
  static showError(error: AppError) {
    console.error('应用错误:', error);
    
    // 这里可以集成通知组件
    if (typeof window !== 'undefined') {
      // 简单的错误提示
      alert(\`错误: \${error.message}\`);
    }
  }

  /**
   * 记录错误
   */
  static logError(error: AppError) {
    // 发送错误到监控服务
    if (import.meta.env.PROD) {
      fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      }).catch(console.error);
    }
  }
}`;

    fs.writeFileSync(errorHandlerPath, errorHandlerContent, 'utf8');
    this.fixes.push('✅ 创建了统一错误处理工具');
  }

  /**
   * 修复配置管理
   */
  async fixConfigManagement() {
    console.log('🔧 修复配置管理...');
    
    const configPath = 'frontend/config/index.ts';
    const configContent = `/**
 * 应用配置管理
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    realTimeUpdates: boolean;
    advancedAnalytics: boolean;
    batchOperations: boolean;
  };
  ui: {
    theme: 'dark' | 'light';
    language: string;
    pageSize: number;
  };
}

// 默认配置
const defaultConfig: AppConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    timeout: 30000
  },
  features: {
    realTimeUpdates: true,
    advancedAnalytics: true,
    batchOperations: true
  },
  ui: {
    theme: 'dark',
    language: 'zh-CN',
    pageSize: 20
  }
};

// 配置管理器
class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): AppConfig {
    try {
      const saved = localStorage.getItem('app-config');
      if (saved) {
        return { ...defaultConfig, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('加载配置失败，使用默认配置:', error);
    }
    return defaultConfig;
  }

  /**
   * 保存配置
   */
  private saveConfig() {
    try {
      localStorage.setItem('app-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  /**
   * 获取配置
   */
  get(): AppConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  update(updates: Partial<AppConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * 重置配置
   */
  reset() {
    this.config = defaultConfig;
    this.saveConfig();
  }
}

export const configManager = new ConfigManager();
export default configManager;`;

    fs.writeFileSync(configPath, configContent, 'utf8');
    this.fixes.push('✅ 创建了配置管理系统');
  }

  /**
   * 优化测试引擎管理
   */
  async optimizeTestEngineManagement() {
    console.log('🔧 优化测试引擎管理...');
    
    // 这里可以添加测试引擎管理的优化逻辑
    this.warnings.push('测试引擎管理优化需要手动处理');
  }

  /**
   * 打印优化摘要
   */
  printSummary() {
    console.log('\n📊 优化摘要');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      console.log('\n✅ 已修复的问题:');
      this.fixes.forEach(fix => console.log(`  ${fix}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ 警告信息:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误信息:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    console.log(`\n🎉 优化完成！修复了 ${this.fixes.length} 个问题`);
    console.log('\n💡 建议下一步操作:');
    console.log('  1. 运行 npm run build 验证构建');
    console.log('  2. 运行 npm run test 执行测试');
    console.log('  3. 检查应用功能是否正常');
  }
}

// 执行优化
if (require.main === module) {
  const optimizer = new FunctionalityOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = FunctionalityOptimizer;
