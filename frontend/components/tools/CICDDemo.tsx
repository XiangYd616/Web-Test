import React, { useState } from 'react';
import {Play, GitBranch, CheckCircle, XCircle, Clock, Code} from 'lucide-react';

interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
  logs?: string[];
}

const CICDDemo: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: '1', name: '代码检出', status: 'pending' },
    { id: '2', name: '依赖安装', status: 'pending' },
    { id: '3', name: '代码构建', status: 'pending' },
    { id: '4', name: '运行测试', status: 'pending' },
    { id: '5', name: '压力测试', status: 'pending' },
    { id: '6', name: '部署应用', status: 'pending' },
  ]);

  const runPipeline = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    // 重置所有步骤
    const resetSteps = steps.map(step => ({ ...step, status: 'pending' as const, duration: undefined as number | undefined, logs: undefined as string[] | undefined }));
    setSteps(resetSteps);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);

      // 更新当前步骤为运行中
      setSteps(prev => prev.map((step, index) =>
        index === i ? { ...step, status: 'running' } : step
      ));

      // 模拟步骤执行时间
      const duration = Math.random() * 3000 + 1000; // 1-4秒
      await new Promise(resolve => setTimeout(resolve, duration));

      // 模拟成功/失败（90%成功率）
      const success = Math.random() > 0.1;

      // 模拟日志
      const logs = [
        `开始执行 ${steps[i].name}...`,
        `执行时间: ${(duration / 1000).toFixed(1)}秒`,
        success ? `✓ ${steps[i].name} 执行成功` : `✗ ${steps[i].name} 执行失败`
      ];

      setSteps(prev => prev.map((step, index) =>
        index === i ? {
          ...step,
          status: success ? 'success' : 'failed',
          duration: Math.round(duration),
          logs
        } : step
      ));

      if (!success) {
        
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50';
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">CI/CD 流水线演示</h2>
            <p className="text-gray-600 mt-1">模拟完整的持续集成和部署流程</p>
          </div>
          <button
            onClick={runPipeline}
            disabled={isRunning}
            className={`btn btn-primary flex items-center space-x-2 ${
              isRunning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
           type="button">
            <Play className="w-4 h-4" />
            <span>{isRunning ? '运行中...' : '开始流水线'}</span>
          </button>
        </div>
      </div>

      {/* 流水线状态 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-6">
          <GitBranch className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">流水线状态</h3>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(step.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(step.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">{step.name}</h4>
                    {step.duration && (
                      <p className="text-sm text-gray-500">
                        耗时: {(step.duration / 1000).toFixed(1)}秒
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    step.status === 'success' ? 'bg-green-100 text-green-800' :
                    step.status === 'failed' ? 'bg-red-100 text-red-800' :
                    step.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {step.status === 'pending' ? '等待中' :
                     step.status === 'running' ? '运行中' :
                     step.status === 'success' ? '成功' : '失败'}
                  </span>
                </div>
              </div>

              {/* 日志输出 */}
              {step.logs && (
                <div className="mt-3 p-3 bg-gray-900 rounded text-green-400 font-mono text-sm">
                  {step.logs.map((log, logIndex) => (
                    <div key={logIndex}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 配置示例 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Code className="w-6 h-6 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">配置示例</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">GitHub Actions</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-800 overflow-x-auto">
{`name: CI/CD Pipeline
on: [push, pull_request]
jobs: undefined, // 已修复
  test: undefined, // 已修复
    runs-on: ubuntu-latest
    steps: undefined, // 已修复
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with: undefined, // 已修复
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Run stress tests
        run: npm run test:stress
      - name: Deploy
        run: npm run deploy`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">GitLab CI</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-800 overflow-x-auto">
{`stages: undefined, // 已修复
  - build
  - test
  - deploy

build: undefined, // 已修复
  stage: build
  script: undefined, // 已修复
    - npm install
    - npm run build

test: undefined, // 已修复
  stage: test
  script: undefined, // 已修复
    - npm test
    - npm run test:stress

deploy: undefined, // 已修复
  stage: deploy
  script: undefined, // 已修复
    - npm run deploy
  only: undefined, // 已修复
    - main`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* 集成说明 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">集成说明</h3>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900">自动化测试</h4>
            <p>每次代码提交都会自动触发完整的测试流程，包括单元测试、集成测试和压力测试。</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">质量门禁</h4>
            <p>只有通过所有测试的代码才能部署到生产环境，确保代码质量。</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">快速反馈</h4>
            <p>测试结果会立即反馈给开发团队，帮助快速定位和修复问题。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CICDDemo;
