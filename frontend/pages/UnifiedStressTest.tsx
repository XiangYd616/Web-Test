/**
 * 统一压力测试页面
 * 使用新的通用测试框架的示例实现
 */

import React from 'react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import { UniversalTestPage } from '../components/testing/UniversalTestPage';
import { stressTestConfig } from '../config/testTypes';

/**
 * 统一压力测试页面组件
 * 展示如何使用通用测试框架简化页面实现
 */
const UnifiedStressTest: React.FC = () => {
  // 认证检查
  const authCheck = useAuthCheck();

  // 如果未认证，显示登录提示
  if (!authCheck.isAuthenticated) {
    return authCheck.LoginPromptComponent;
  }

  // 测试完成回调
  const handleTestComplete = (result: any) => {
    console.log('压力测试完成:', result);
    // 可以在这里添加特定的处理逻辑
  };

  // 配置变更回调
  const handleConfigChange = (config: any) => {
    console.log('配置已更新:', config);
    // 可以在这里添加特定的处理逻辑
  };

  return (
    <UniversalTestPage
      testType={stressTestConfig}
      onTestComplete={handleTestComplete}
      onConfigChange={handleConfigChange}
      customActions={
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <h4 className="font-medium mb-2">测试说明：</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>负载测试：测试系统在预期负载下的表现</li>
              <li>压力测试：测试系统的极限承载能力</li>
              <li>峰值测试：测试系统应对突发流量的能力</li>
              <li>容量测试：测试系统的最大处理能力</li>
            </ul>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-400 text-sm">
              <span className="font-medium">⚠️ 注意事项</span>
            </div>
            <p className="text-yellow-300 text-xs mt-1">
              请确保目标服务器能够承受测试负载，避免对生产环境造成影响
            </p>
          </div>
        </div>
      }
    />
  );
};

export default UnifiedStressTest;
