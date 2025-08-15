import React, { useState, useEffect } from 'react';
import { TestPageTemplate } from '../../../components/testing/UnifiedTestPageTemplate';
import { StressTestConfig } from '../../../components/testing/specialized/StressTestConfig';
import { testService } from '../../../services/testService';
import { configService } from '../../../services/configService';
import { useAuthCheck } from '../../../hooks/useAuthCheck';
import { useUserStats } from '../../../hooks/useUserStats';
import { Activity, Users, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

interface StressTestRefactoredProps {}

const StressTestRefactored: React.FC<StressTestRefactoredProps> = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "压力测试",
    description: "使用压力测试功能"
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
        const defaultConfig = configService.getDefaultConfig('stress');
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
      const validation = configService.validateConfig('stress', config);
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 启动压力测试
      const testId = await testService.startTest('stress', config.url, config, '压力测试');
      
      // 记录测试完成统计
      recordTestCompletion('stress');
      
      return testId;
    } catch (error) {
      console.error('压力测试启动失败:', error);
      throw error;
    }
  };

  // 处理测试停止
  const handleTestStop = async (testId: string): Promise<void> => {
    try {
      await testService.stopTest(testId);
    } catch (error) {
      console.error('停止压力测试失败:', error);
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
        name: `压力测试配置 - ${new Date().toLocaleString()}`,
        testType: 'stress',
        config,
        description: '自定义压力测试配置'
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载压力测试配置...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedTestPageTemplate
      testType="stress"
      testName="压力测试"
      onTestStart={handleTestStart}
      onTestStop={handleTestStop}
      customConfigPanel={
        <StressTestConfig
          config={testConfig}
          onConfigChange={handleConfigChange}
          onSaveConfig={handleConfigSave}
        />
      }
    >
      {/* 压力测试特有的额外内容 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          压力测试说明
        </h3>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400">
            压力测试可以帮助您评估网站在高负载情况下的性能表现，识别性能瓶颈和稳定性问题。
          </p>

          {/* 测试指标说明 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">并发用户</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                同时访问网站的虚拟用户数量
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <h4 className="font-medium text-green-900 dark:text-green-100">响应时间</h4>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                服务器处理请求的平均时间
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
              <BarChart3 className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100">吞吐量</h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                每秒处理的请求数量(RPS)
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <h4 className="font-medium text-red-900 dark:text-red-100">错误率</h4>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                失败请求占总请求的百分比
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">测试阶段</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200">预热阶段</h5>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  逐步增加用户数量，让系统预热
                </p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200">稳定阶段</h5>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  维持最大并发数，测试系统稳定性
                </p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 dark:text-blue-200">冷却阶段</h5>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  逐步减少用户数量，观察系统恢复
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">性能基准</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-green-800 dark:text-green-200">响应时间标准</h5>
                <ul className="text-green-700 dark:text-green-300 mt-1 space-y-1">
                  <li>• 优秀：< 200ms</li>
                  <li>• 良好：200ms - 500ms</li>
                  <li>• 一般：500ms - 1000ms</li>
                  <li>• 较差：> 1000ms</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-green-800 dark:text-green-200">错误率标准</h5>
                <ul className="text-green-700 dark:text-green-300 mt-1 space-y-1">
                  <li>• 优秀：< 0.1%</li>
                  <li>• 良好：0.1% - 1%</li>
                  <li>• 一般：1% - 5%</li>
                  <li>• 较差：> 5%</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              测试注意事项
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• <strong>授权测试</strong>：确保您有权限对目标网站进行压力测试</li>
              <li>• <strong>测试环境</strong>：建议在测试环境中进行，避免影响生产系统</li>
              <li>• <strong>逐步增加</strong>：从小负载开始，逐步增加到目标负载</li>
              <li>• <strong>监控系统</strong>：测试期间密切监控服务器资源使用情况</li>
              <li>• <strong>备份数据</strong>：测试前确保重要数据已备份</li>
              <li>• <strong>网络影响</strong>：高负载测试可能影响网络带宽</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">测试建议</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200">测试策略</h5>
                <ul className="text-gray-700 dark:text-gray-300 mt-1 space-y-1">
                  <li>• 先进行基准测试</li>
                  <li>• 逐步增加负载</li>
                  <li>• 测试不同场景</li>
                  <li>• 记录关键指标</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200">优化方向</h5>
                <ul className="text-gray-700 dark:text-gray-300 mt-1 space-y-1">
                  <li>• 数据库查询优化</li>
                  <li>• 缓存策略改进</li>
                  <li>• 服务器配置调优</li>
                  <li>• 负载均衡配置</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UnifiedTestPageTemplate>
  );
};

export default StressTestRefactored;
