import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Download, Eye, Pause, Trash2 } from 'lucide-react';

interface TestRecord {
  id: string;
  name: string;
  type: 'stress' | 'performance' | 'security' | 'content' | 'compatibility' | 'api';
  status: 'completed' | 'running' | 'failed' | 'cancelled';
  createdAt: string;
  duration: number;
  url: string;
  score?: number;
  errorCount?: number;
}

const TestManagement: FC = () => {
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'stress' | 'content' | 'compatibility' | 'api'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'running' | 'failed'>('all');
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    const fetchTests = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockTests: TestRecord[] = [
          {
            id: '1',
            name: 'Website Performance Test',
            type: 'performance',
            status: 'completed',
            createdAt: '2024-01-15T10:30:00Z',
            duration: 45,
            url: 'https://example.com',
            score: 85,
            errorCount: 2
          },
          {
            id: '2',
            name: 'Security Vulnerability Scan',
            type: 'security',
            status: 'running',
            createdAt: '2024-01-15T11:00:00Z',
            duration: 0,
            url: 'https://test.example.com',
            errorCount: 0
          },
          {
            id: '3',
            name: 'API Load Test',
            type: 'api',
            status: 'failed',
            createdAt: '2024-01-15T09:15:00Z',
            duration: 30,
            url: 'https://api.example.com',
            errorCount: 15
          }
        ];
        
        setTests(mockTests);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch tests:', error);
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'stress': return 'Stress Test';
      case 'performance': return 'Performance Test';
      case 'security': return 'Security Test';
      case 'content': return 'Content Detection';
      case 'compatibility': return 'Compatibility Test';
      case 'api': return 'API Test';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'running': return 'Running';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTests = tests.filter(test => {
    if (selectedType !== 'all' && test.type !== selectedType) return false;
    if (selectedStatus !== 'all' && test.status !== selectedStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Test Management</h2>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.status === 'completed').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Running</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.status === 'running').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.status === 'failed').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-medium text-gray-900">Filter Conditions</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="test-type-select" className="block text-sm font-medium text-gray-700 mb-2">
              Test Type
            </label>
            <select
              id="test-type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="stress">Stress Test</option>
              <option value="content">Content Detection</option>
              <option value="compatibility">Compatibility Test</option>
              <option value="api">API Test</option>
            </select>
          </div>

          <div>
            <label htmlFor="test-status-select" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="test-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label htmlFor="date-range-select" className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              id="date-range-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Test Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{test.name}</div>
                      <div className="text-sm text-gray-500">{test.url}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getTestTypeLabel(test.type)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}>
                      {getStatusLabel(test.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.duration > 0 ? `${test.duration}s` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.score ? `${test.score}/100` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      {test.status === 'running' && (
                        <button className="text-red-600 hover:text-red-900">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestManagement;
