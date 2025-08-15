import React, { useState, useEffect } from 'react';
import { TestPageTemplate } from '../../../components/testing/UnifiedTestPageTemplate';
import { APITestConfig } from '../../../components/testing/specialized/APITestConfig';
import { testService } from '../../../services/testService';
import { configService } from '../../../services/configService';
import { useAuthCheck } from '../../../hooks/useAuthCheck';
import { useUserStats } from '../../../hooks/useUserStats';

interface APITestRefactoredProps {}

const APITestRefactored: React.FC<APITestRefactoredProps> = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "API测试",
    description: "使用API测试功能"
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
        const defaultConfig = configService.getDefaultConfig('api');
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
      const validation = configService.validateConfig('api', config);
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 启动API测试
      const testId = await testService.startTest('api', config.baseUrl, config, 'API测试');
      
      // 记录测试完成统计
      recordTestCompletion('api');
      
      return testId;
    } catch (error) {
      console.error('API测试启动失败:', error);
      throw error;
    }
  };

  // 处理测试停止
  const handleTestStop = async (testId: string): Promise<void> => {
    try {
      await testService.stopTest(testId);
    } catch (error) {
      console.error('停止API测试失败:', error);
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
        name: `API测试配置 - ${new Date().toLocaleString()}`,
        testType: 'api',
        config,
        description: '自定义API测试配置'
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载API测试配置...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedTestPageTemplate
      testType="api"
      testName="API测试"
      onTestStart={handleTestStart}
      onTestStop={handleTestStop}
      customConfigPanel={
        <APITestConfig
          config={testConfig}
          onConfigChange={handleConfigChange}
          onSaveConfig={handleConfigSave}
        />
      }
    >
      {/* API测试特有的额外内容 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          API测试说明
        </h3>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400">
            API测试可以帮助您验证API端点的功能性、性能和可靠性。支持以下功能：
          </p>
          <ul className="text-gray-600 dark:text-gray-400 mt-2 space-y-1">
            <li>• <strong>端点测试</strong>：验证API端点的响应状态和数据格式</li>
            <li>• <strong>性能测试</strong>：测量API响应时间和吞吐量</li>
            <li>• <strong>安全测试</strong>：检查API的安全配置和漏洞</li>
            <li>• <strong>负载测试</strong>：模拟高并发请求测试API承载能力</li>
            <li>• <strong>模式验证</strong>：验证API响应是否符合预定义的数据模式</li>
            <li>• <strong>自动化测试</strong>：支持批量端点测试和持续集成</li>
          </ul>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">快速开始</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. 在基础配置中输入API的基础URL</li>
              <li>2. 添加要测试的API端点</li>
              <li>3. 配置测试选项（超时、重试等）</li>
              <li>4. 点击"开始测试"按钮启动测试</li>
              <li>5. 在进度页面查看实时测试状态</li>
              <li>6. 在结果页面查看详细的测试报告</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">注意事项</h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• 确保您有权限访问要测试的API端点</li>
              <li>• 某些测试选项可能会对目标API产生负载</li>
              <li>• 建议先在测试环境中验证配置</li>
              <li>• 敏感数据请使用环境变量或安全存储</li>
            </ul>
          </div>
        </div>
      </div>
    </UnifiedTestPageTemplate>
  );
};

export default APITestRefactored;
