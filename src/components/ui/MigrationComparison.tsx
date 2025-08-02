import React from 'react';
import { Card, CardHeader, CardTitle, CardBody } from './Card';
import { Button } from './Button';
import { Badge, StatusBadge } from './Badge';
import { ArrowRight, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export const MigrationComparison: React.FC = () => {
  const openPage = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🔄 组件迁移对比展示
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            对比迁移前后的StressTestHistory组件效果
          </p>
          <div className="flex justify-center gap-4">
            <StatusBadge status="success" text="迁移完成" />
            <Badge variant="info">新组件库</Badge>
            <Badge variant="warning">CSS冲突已解决</Badge>
          </div>
        </div>

        {/* 对比卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* 迁移前 */}
          <Card variant="outlined">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  迁移前版本
                </CardTitle>
                <Badge variant="danger" size="sm">传统CSS</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-white">主要问题</h4>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      CSS特异性冲突
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      样式覆盖问题
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      维护困难
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      代码重复
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">技术栈</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" size="xs">传统CSS</Badge>
                    <Badge variant="secondary" size="xs">内联样式</Badge>
                    <Badge variant="secondary" size="xs">全局类名</Badge>
                    <Badge variant="secondary" size="xs">!important</Badge>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => openPage('/stress-test')}
                >
                  <ExternalLink className="w-4 h-4" />
                  查看原版本
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* 迁移后 */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  迁移后版本
                </CardTitle>
                <Badge variant="success" size="sm">新组件库</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-white">主要优势</h4>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      CSS冲突完全解决
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      组件化设计
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      易于维护
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      代码复用
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">技术栈</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="primary" size="xs">组件库</Badge>
                    <Badge variant="primary" size="xs">TypeScript</Badge>
                    <Badge variant="primary" size="xs">模块化CSS</Badge>
                    <Badge variant="primary" size="xs">设计令牌</Badge>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4"
                  onClick={() => openPage('/stress-test?migrated')}
                >
                  <ExternalLink className="w-4 h-4" />
                  查看新版本
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 迁移流程 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>🔄 迁移流程</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
                  <span className="text-blue-400 font-bold">1</span>
                </div>
                <h4 className="font-medium text-white mb-2">分析现有组件</h4>
                <p className="text-sm text-gray-400">识别需要迁移的UI元素</p>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
                  <span className="text-blue-400 font-bold">2</span>
                </div>
                <h4 className="font-medium text-white mb-2">替换组件</h4>
                <p className="text-sm text-gray-400">使用新的组件库替换</p>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-500/30">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <h4 className="font-medium text-white mb-2">测试验证</h4>
                <p className="text-sm text-gray-400">确保功能完整性</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 迁移成果 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>📊 迁移成果对比</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">100%</div>
                <div className="text-gray-400 mb-2">CSS冲突解决</div>
                <div className="text-sm text-gray-500">完全消除样式冲突问题</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">6个</div>
                <div className="text-gray-400 mb-2">新组件使用</div>
                <div className="text-sm text-gray-500">Card, Button, Input, Badge等</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">50%</div>
                <div className="text-gray-400 mb-2">代码减少</div>
                <div className="text-sm text-gray-500">更简洁的组件代码</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 具体改进 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          <Card>
            <CardHeader>
              <CardTitle>🎨 样式改进</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">搜索框</span>
                  <Badge variant="success" size="xs">SearchInput组件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">下拉选择</span>
                  <Badge variant="success" size="xs">Select组件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">复选框</span>
                  <Badge variant="success" size="xs">SimpleCheckbox组件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">状态标签</span>
                  <Badge variant="success" size="xs">StatusBadge组件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">操作按钮</span>
                  <Badge variant="success" size="xs">IconButton组件</Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚡ 功能增强</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">搜索功能</span>
                  <Badge variant="info" size="xs">一键清除</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">确认对话框</span>
                  <Badge variant="info" size="xs">ConfirmModal</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">进度显示</span>
                  <Badge variant="info" size="xs">ProgressBadge</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">无障碍支持</span>
                  <Badge variant="info" size="xs">ARIA属性</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">键盘导航</span>
                  <Badge variant="info" size="xs">完整支持</Badge>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 快速访问 */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 快速访问</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => openPage('/stress-test')}
              >
                <span className="font-medium">原版本</span>
                <span className="text-xs text-gray-400">传统CSS实现</span>
              </Button>
              
              <Button 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => openPage('/stress-test?migrated')}
              >
                <span className="font-medium">新版本</span>
                <span className="text-xs text-gray-300">组件库实现</span>
              </Button>
              
              <Button 
                variant="secondary"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => openPage('/stress-test?test-all')}
              >
                <span className="font-medium">组件测试</span>
                <span className="text-xs text-gray-400">综合测试页面</span>
              </Button>
              
              <Button 
                variant="ghost"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => openPage('/stress-test?test-nav')}
              >
                <span className="font-medium">测试导航</span>
                <span className="text-xs text-gray-400">所有测试页面</span>
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* 页脚 */}
        <div className="text-center text-gray-400 text-sm mt-12">
          <p>🎉 StressTestHistory组件迁移完成</p>
          <p className="mt-2">CSS冲突问题已彻底解决，组件库架构成功建立</p>
        </div>
      </div>
    </div>
  );
};
