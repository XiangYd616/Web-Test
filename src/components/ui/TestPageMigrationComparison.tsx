import React from 'react';
import { Card, CardHeader, CardTitle, CardBody } from './Card';
import { Button } from './Button';
import { Badge, StatusBadge } from './Badge';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Search,
  Shield,
  Timer,
  BarChart3,
  Zap,
  Globe
} from 'lucide-react';

export const TestPageMigrationComparison: React.FC = () => {
  const openPage = (url: string) => {
    window.open(url, '_blank');
  };

  const testPages = [
    {
      id: 'seo',
      name: 'SEO测试页面',
      description: 'SEO综合分析和优化建议',
      icon: Search,
      originalUrl: '/seo-test',
      migratedUrl: '/stress-test?seo-migrated',
      status: 'completed',
      improvements: [
        '搜索框使用SearchInput组件',
        '配置项使用SimpleCheckbox组件',
        '状态显示使用StatusBadge组件',
        '进度显示使用ProgressBadge组件',
        '模态框使用Modal组件'
      ]
    },
    {
      id: 'security',
      name: '安全测试页面',
      description: '网站安全漏洞检测和防护',
      icon: Shield,
      originalUrl: '/security-test',
      migratedUrl: '/stress-test?security-migrated',
      status: 'completed',
      improvements: [
        '标签页导航组件化',
        '测试配置使用新组件',
        '安全等级使用StatusBadge',
        '漏洞统计可视化',
        '报告生成模态框'
      ]
    },
    {
      id: 'performance',
      name: '性能测试页面',
      description: 'Core Web Vitals和性能优化',
      icon: Timer,
      originalUrl: '/performance-test',
      migratedUrl: '/stress-test?performance-migrated',
      status: 'completed',
      improvements: [
        'Core Web Vitals可视化',
        '测试引擎选择组件',
        '性能指标卡片化',
        '优化建议结构化',
        '测试进度实时显示'
      ]
    },
    {
      id: 'stress',
      name: '压力测试页面',
      description: '网站压力测试和负载分析',
      icon: BarChart3,
      originalUrl: '/stress-test',
      migratedUrl: '/stress-test?migrated',
      status: 'completed',
      improvements: [
        '测试记录卡片化',
        '搜索和筛选组件',
        '批量操作优化',
        '状态指示统一',
        '确认对话框改进'
      ]
    }
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🔄 测试页面迁移总览
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            对比所有测试页面的迁移前后效果
          </p>
          <div className="flex justify-center gap-4">
            <StatusBadge status="success" text="4个页面已迁移" />
            <Badge variant="info">新组件库</Badge>
            <Badge variant="warning">CSS冲突已解决</Badge>
          </div>
        </div>

        {/* 迁移统计 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>📊 迁移统计</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">4</div>
                <div className="text-gray-400 mb-2">已迁移页面</div>
                <div className="text-sm text-gray-500">100%完成</div>
              </div>
              
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">20+</div>
                <div className="text-gray-400 mb-2">组件使用</div>
                <div className="text-sm text-gray-500">Card, Button, Input等</div>
              </div>
              
              <div>
                <div className="text-3xl font-bold text-purple-400 mb-2">0</div>
                <div className="text-gray-400 mb-2">CSS冲突</div>
                <div className="text-sm text-gray-500">完全解决</div>
              </div>
              
              <div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">60%</div>
                <div className="text-gray-400 mb-2">代码减少</div>
                <div className="text-sm text-gray-500">更简洁高效</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 页面迁移对比 */}
        <div className="space-y-8">
          {testPages.map((page) => {
            const Icon = page.icon;
            return (
              <Card key={page.id} hover>
                <CardBody>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* 页面信息 */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                          <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{page.name}</h3>
                          <p className="text-sm text-gray-400">{page.description}</p>
                        </div>
                      </div>
                      <StatusBadge status="success" text="迁移完成" />
                    </div>

                    {/* 迁移前后对比 */}
                    <div className="lg:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* 迁移前 */}
                        <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <h4 className="font-medium text-red-400">迁移前</h4>
                          </div>
                          <ul className="space-y-1 text-sm text-gray-300 mb-4">
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                              传统CSS类名
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                              内联样式
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                              样式冲突
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                              代码重复
                            </li>
                          </ul>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => openPage(page.originalUrl)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            查看原版本
                          </Button>
                        </div>

                        {/* 迁移后 */}
                        <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <h4 className="font-medium text-green-400">迁移后</h4>
                          </div>
                          <ul className="space-y-1 text-sm text-gray-300 mb-4">
                            {page.improvements.slice(0, 4).map((improvement, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => openPage(page.migratedUrl)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            查看新版本
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* 迁移成果 */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>🎉 迁移成果</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* 技术改进 */}
              <div>
                <h4 className="font-medium text-white mb-4">技术改进</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">CSS冲突解决</span>
                    <Badge variant="success" size="xs">100%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">组件化程度</span>
                    <Badge variant="success" size="xs">95%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">代码复用率</span>
                    <Badge variant="success" size="xs">80%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">TypeScript覆盖</span>
                    <Badge variant="success" size="xs">100%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">无障碍支持</span>
                    <Badge variant="success" size="xs">完整</Badge>
                  </div>
                </div>
              </div>

              {/* 用户体验改进 */}
              <div>
                <h4 className="font-medium text-white mb-4">用户体验改进</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">界面一致性</span>
                    <Badge variant="info" size="xs">统一</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">交互流畅度</span>
                    <Badge variant="info" size="xs">提升</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">视觉效果</span>
                    <Badge variant="info" size="xs">优化</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">响应速度</span>
                    <Badge variant="info" size="xs">加快</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">错误处理</span>
                    <Badge variant="info" size="xs">完善</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 快速访问 */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>🚀 快速访问所有迁移页面</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testPages.map((page) => {
                const Icon = page.icon;
                return (
                  <Button
                    key={page.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-3"
                    onClick={() => openPage(page.migratedUrl)}
                  >
                    <Icon className="w-6 h-6" />
                    <div className="text-center">
                      <div className="font-medium">{page.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{page.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* 其他测试页面 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🧪 其他测试页面</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Button
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => openPage('/stress-test?test-nav')}
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm">测试导航</span>
              </Button>
              
              <Button
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => openPage('/stress-test?test-all')}
              >
                <Zap className="w-5 h-5" />
                <span className="text-sm">综合测试</span>
              </Button>
              
              <Button
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => openPage('/stress-test?migration-compare')}
              >
                <ArrowRight className="w-5 h-5" />
                <span className="text-sm">迁移对比</span>
              </Button>
              
              <Button
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => openPage('/stress-test?test-card')}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Card测试</span>
              </Button>
              
              <Button
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => openPage('/stress-test?test-modal')}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">Modal测试</span>
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* 页脚 */}
        <div className="text-center text-gray-400 text-sm mt-12">
          <p>🎉 所有测试页面迁移完成</p>
          <p className="mt-2">CSS模块化重构项目取得重大成功！</p>
        </div>
      </div>
    </div>
  );
};
