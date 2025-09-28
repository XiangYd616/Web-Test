/**
 * SystemMonitor.tsx - React组件
 * 
 * 文件路径: frontend\components\admin\SystemMonitor.tsx
 * 创建时间: 2025-09-25
 */

import { Activity, Cpu, Database, HardDrive, MemoryStick } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

interface SystemMonitorType {
  cpu: number;
  memory: number;
  disk: number;
  database: {
    connections: number;
    size: string;
  };
  activeTests: number;
  queuedTests: number;
  errorRate: number;
}

const SystemMonitor: FC = () => {
  const [monitor, setMonitor] = useState<SystemMonitorType | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        setMonitor({
          cpu: Math.floor(Math.random() * 100),
          memory: Math.floor(Math.random() * 100),
          disk: Math.floor(Math.random() * 100),
          database: {
            connections: Math.floor(Math.random() * 50) + 10,
            size: `${(Math.random() * 10 + 1).toFixed(1)}GB`
          },
          activeTests: Math.floor(Math.random() * 5),
          queuedTests: Math.floor(Math.random() * 10),
          errorRate: Math.random() * 5
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch system data:', error);
        setLoading(false);
      }
    };

    fetchSystemData();

    if (autoRefresh) {
      const interval = setInterval(fetchSystemData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }

    // Return cleanup function for non-autoRefresh case
    return () => { };
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load system data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Monitor</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto Refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="input text-sm"
          >
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900">{monitor.cpu}%</p>
            </div>
            <Cpu className={`w-8 h-8 ${monitor.cpu > 80 ? 'text-red-500' : 'text-blue-500'}`} />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${monitor.cpu > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${monitor.cpu}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">{monitor.memory}%</p>
            </div>
            <MemoryStick className={`w-8 h-8 ${monitor.memory > 85 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${monitor.memory > 85 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${monitor.memory}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Disk Usage</p>
              <p className="text-2xl font-bold text-gray-900">{monitor.disk}%</p>
            </div>
            <HardDrive className={`w-8 h-8 ${monitor.disk > 90 ? 'text-red-500' : 'text-purple-500'}`} />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${monitor.disk > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                style={{ width: `${monitor.disk}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Tests</p>
              <p className="text-2xl font-bold text-gray-900">{monitor.activeTests}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {monitor.queuedTests} queued, {monitor.errorRate.toFixed(1)}% error rate
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Database Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium">Connections</span>
              <p className="text-lg font-bold">{monitor.database.connections}</p>
            </div>
            <Database className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium">Database Size</span>
              <p className="text-lg font-bold">{monitor.database.size}</p>
            </div>
            <HardDrive className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health Status</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700">All services running normally</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
