import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusIndicator } from '../components/ui/StatusIndicator';

// 监控站点接口
interface MonitoringSite {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'warning';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  interval: number;
}

const MonitoringDashboard: React.FC = () => {
  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [addingSite, setAddingSite] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    interval: 5
  });

  // 模拟数据
  useEffect(() => {
    setSites([
      {
        id: '1',
        name: '主站点',
        url: 'https://example.com',
        status: 'online',
        responseTime: 245,
        uptime: 99.9,
        lastCheck: new Date(),
        interval: 5
      },
      {
        id: '2',
        name: 'API服务',
        url: 'https://api.example.com',
        status: 'offline',
        responseTime: 0,
        uptime: 98.5,
        lastCheck: new Date(),
        interval: 3
      }
    ]);
  }, []);

  const handleAddSite = async () => {
    setAddingSite(true);
    // 模拟添加延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    const site: MonitoringSite = {
      id: Date.now().toString(),
      name: newSite.name,
      url: newSite.url,
      status: 'online',
      responseTime: Math.floor(Math.random() * 500) + 100,
      uptime: 99.0 + Math.random(),
      lastCheck: new Date(),
      interval: newSite.interval
    };

    setSites(prev => [...prev, site]);
    setNewSite({ name: '', url: '', interval: 5 });
    setShowAddSiteModal(false);
    setAddingSite(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">监控面板</h1>
          <p className="text-gray-400">实时监控网站状态和性能</p>
        </div>

        {/* 快速操作 */}
        <div className="mb-8">
          <Card className="bg-gray-800/50 border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">快速操作</h2>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowAddSiteModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                添加新监控
              </Button>
              <Button variant="outline" className="border-gray-600 text-gray-300">
                导出报告
              </Button>
            </div>
          </Card>
        </div>

        {/* 监控站点列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map(site => (
            <Card key={site.id} className="bg-gray-800/50 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{site.name}</h3>
                <StatusIndicator
                  status={site.status === 'online' ? 'success' : 'error'}
                  size="sm"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">URL:</span>
                  <span className="text-gray-300">{site.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">响应时间:</span>
                  <span className="text-gray-300">{site.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">可用性:</span>
                  <span className="text-gray-300">{site.uptime.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">最后检查:</span>
                  <span className="text-gray-300">
                    {site.lastCheck.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 添加站点模态框 */}
        <Modal
          isOpen={showAddSiteModal}
          onClose={() => setShowAddSiteModal(false)}
          title="添加监控站点"
        >
          <div className="space-y-4">
            <Input
              label="站点名称"
              value={newSite.name}
              onChange={(e) => setNewSite(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入站点名称"
            />
            <Input
              label="URL地址"
              value={newSite.url}
              onChange={(e) => setNewSite(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://example.com"
            />
            <Input
              label="检查间隔(分钟)"
              type="number"
              value={newSite.interval.toString()}
              onChange={(e) => setNewSite(prev => ({ ...prev, interval: parseInt(e.target.value) || 5 }))}
              min="1"
              max="60"
            />
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddSite}
                disabled={!newSite.name || !newSite.url || addingSite}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addingSite ? '添加中...' : '添加监控'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddSiteModal(false)}
                className="border-gray-600 text-gray-300"
              >
                取消
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
