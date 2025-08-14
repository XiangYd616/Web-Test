import React, { useState, useEffect } from 'react';
import { UnifiedTestPageTemplate } from '../../../components/testing/UnifiedTestPageTemplate';
import { SecurityTestConfig } from '../../../components/testing/specialized/SecurityTestConfig';
import { testService } from '../../../services/testService';
import { configService } from '../../../services/configService';
import { useAuthCheck } from '../../../hooks/useAuthCheck';
import { useUserStats } from '../../../hooks/useUserStats';
import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';

interface SecurityTestRefactoredProps {}

const SecurityTestRefactored: React.FC<SecurityTestRefactoredProps> = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "安全测试",
    description: "使用安全测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [testConfig, setTestConfig] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // 加载默认配置
  useEffect(() => {
    const loadDefaultConfig = async () => {
      try {
        setIsLoading(true);
        const defaultConfig = configService.getDefaultConfig('security');
        setTestConfig(defaultConfig);
      } catch (error) {
        console.error('加载默认配置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadDefaultConfig();
    }
  }, [isAuthenticated]);

  // 处理测试开始
  const handleTestStart = async (config: any): Promise<string> => {
    try {
      // 验证配置
      const validation = configService.validateConfig('security', config);
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 启动安全测试
      const testId = await testService.startTest('security', config.url, config, '安全测试');
      
      // 记录测试完成统计
      recordTestCompletion('security');
      
      return testId;
    } catch (error) {
      console.error('安全测试启动失败:', error);
      throw error;
    }
  };

  // 处理测试停止
  const handleTestStop = async (testId: string): Promise<void> => {
    try {
      await testService.stopTest(testId);
    } catch (error) {
      console.error('停止安全测试失败:', error);
      throw error;
    }
  };

  // 处理配置变更
  const handleConfigChange = (newConfig: any) => {
    setTestConfig(newConfig);
  };

  // 处理配置保存
  const handleConfigSave = async (config: any) => {
    try {
      await configService.saveConfigTemplate({
        name: `安全测试配置 - ${new Date().toLocaleString()}`,
        testType: 'security',
        config,
        description: '自定义安全测试配置'
      });
      console.log('配置保存成功');
    } catch (error) {
      console.error('配置保存失败:', error);
    }
  };

  // 如果未登录，显示登录提示
  if (!isAuthenticated) {
    return <LoginPromptComponent />;
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载安全测试配置...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedTestPageTemplate
      testType="security"
      testName="安全测试"
      onTestStart={handleTestStart}
      onTestStop={handleTestStop}
      customConfigPanel={
        <SecurityTestConfig
          config={testConfig}
          onConfigChange={handleConfigChange}
          onSaveConfig={handleConfigSave}
        />
      }
    >
      {/* 安全测试特有的额外内容 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-600" />
          安全测试说明
        </h3>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400">
            安全测试可以帮助您识别网站的安全漏洞和配置问题，提高网站的整体安全性。
          </p>

          {/* 测试类型说明 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center mb-2">
                <Lock className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                <h4 className="font-medium text-green-900 dark:text-green-100">被动检测</h4>
              </div>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• SSL/TLS证书检查</li>
                <li>• HTTP安全头分析</li>
                <li>• Cookie安全属性</li>
                <li>• 混合内容检测</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100">主动检测</h4>
              </div>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• XSS漏洞扫描</li>
                <li>• SQL注入检测</li>
                <li>• 命令注入测试</li>
                <li>• 目录遍历检查</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              测试流程
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. <strong>配置检查项目</strong>：选择要执行的安全检查</li>
              <li>2. <strong>设置扫描参数</strong>：配置扫描深度和超时时间</li>
              <li>3. <strong>启动安全扫描</strong>：开始执行安全测试</li>
              <li>4. <strong>实时监控进度</strong>：查看测试进度和发现的问题</li>
              <li>5. <strong>分析测试结果</strong>：查看详细的安全报告</li>
              <li>6. <strong>修复安全问题</strong>：根据建议修复发现的漏洞</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="font-medium text-red-900 dark:text-red-100 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              重要提醒
            </h4>
            <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
              <li>• <strong>授权测试</strong>：确保您有权限对目标网站进行安全测试</li>
              <li>• <strong>测试环境</strong>：建议在测试环境中进行，避免影响生产系统</li>
              <li>• <strong>日志记录</strong>：主动检测可能在服务器日志中留下记录</li>
              <li>• <strong>负责使用</strong>：请负责任地使用安全测试功能</li>
              <li>• <strong>法律合规</strong>：确保测试活动符合相关法律法规</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">安全等级说明</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">高风险：需要立即修复</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">中风险：建议尽快修复</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">低风险：可选择性修复</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UnifiedTestPageTemplate>
  );
};

export default SecurityTestRefactored;
