import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DeleteButton,
  IconButton,
  GhostButton,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  SearchInput,
  Select,
  Badge,
  StatusBadge,
  ProgressBadge,
  SimpleCheckbox,
  ConfirmModal
} from '../ui';
import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// 测试记录接口
interface TestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  overallScore?: number;
  performanceGrade?: string;
  config: any;
  results?: any;
  errorMessage?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  averageResponseTime?: number;
  peakTps?: number;
  errorRate?: number;
  tags?: string[];
  environment?: string;
}

interface StressTestHistoryMigratedProps {
  className?: string;
}

const StressTestHistoryMigrated: React.FC<StressTestHistoryMigratedProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // 状态管理
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockData: TestRecord[] = [
      {
        id: '1',
        testName: '百度首页压力测试',
        testType: 'stress',
        url: 'https://www.baidu.com',
        status: 'completed',
        createdAt: '2025-08-02T09:13:00Z',
        updatedAt: '2025-08-02T09:15:30Z',
        duration: 150,
        overallScore: 88.6,
        performanceGrade: 'A',
        config: {},
        totalRequests: 1000,
        successfulRequests: 998,
        failedRequests: 2,
        averageResponseTime: 245,
        peakTps: 156,
        errorRate: 0.2,
        tags: ['生产环境', '首页'],
        environment: 'production'
      },
      {
        id: '2',
        testName: 'API接口性能测试',
        testType: 'performance',
        url: 'https://api.example.com/v1/users',
        status: 'failed',
        createdAt: '2025-08-02T08:30:00Z',
        updatedAt: '2025-08-02T08:32:15Z',
        duration: 135,
        overallScore: 45.2,
        performanceGrade: 'D',
        config: {},
        totalRequests: 500,
        successfulRequests: 234,
        failedRequests: 266,
        averageResponseTime: 1250,
        peakTps: 23,
        errorRate: 53.2,
        tags: ['API', '测试环境'],
        environment: 'testing',
        errorMessage: '连接超时'
      },
      {
        id: '3',
        testName: '电商网站负载测试',
        testType: 'load',
        url: 'https://shop.example.com',
        status: 'running',
        createdAt: '2025-08-02T10:00:00Z',
        updatedAt: '2025-08-02T10:05:00Z',
        config: {},
        tags: ['电商', '负载测试'],
        environment: 'staging'
      }
    ];

    setTimeout(() => {
      setRecords(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  // 筛选选项
  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'completed', label: '已完成' },
    { value: 'running', label: '运行中' },
    { value: 'failed', label: '已失败' },
    { value: 'pending', label: '等待中' },
    { value: 'cancelled', label: '已取消' }
  ];

  // 筛选记录
  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      record.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 格式化时间
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化持续时间
  const formatDuration = (record: TestRecord) => {
    if (!record.duration) return '-';
    const minutes = Math.floor(record.duration / 60);
    const seconds = record.duration % 60;
    return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
  };

  // 格式化评分
  const formatScore = (record: TestRecord) => {
    return record.overallScore ? `${record.overallScore.toFixed(1)}分` : '-';
  };

  // 格式化错误率
  const formatErrorRate = (record: TestRecord) => {
    return record.errorRate !== undefined ? `${record.errorRate.toFixed(1)}%` : '-';
  };

  // 获取状态配置
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { status: 'success' as const, text: '已完成' };
      case 'running':
        return { status: 'loading' as const, text: '运行中' };
      case 'failed':
        return { status: 'error' as const, text: '已失败' };
      case 'pending':
        return { status: 'pending' as const, text: '等待中' };
      case 'cancelled':
        return { status: 'warning' as const, text: '已取消' };
      default:
        return { status: 'info' as const, text: '未知' };
    }
  };

  // 选择记录
  const toggleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // 删除记录
  const handleDeleteRecord = (recordId: string) => {
    setRecordToDelete(recordId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      setRecords(prev => prev.filter(r => r.id !== recordToDelete));
      setSelectedRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordToDelete);
        return newSet;
      });
    }
    setShowDeleteConfirm(false);
    setRecordToDelete(null);
  };

  // 批量删除
  const handleBatchDelete = () => {
    setRecords(prev => prev.filter(r => !selectedRecords.has(r.id)));
    setSelectedRecords(new Set());
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <Card className={`max-w-md mx-auto mt-12 ${className}`}>
        <CardBody className="text-center p-8">
          <Activity className="w-16 h-16 mx-auto mb-6 text-blue-400" />
          <CardTitle className="mb-4">需要登录</CardTitle>
          <p className="text-gray-300 mb-6">
            请登录以查看您的压力测试历史记录
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            立即登录
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <CardTitle>测试历史记录</CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  查看和管理压力测试记录 (使用新组件库)
                </p>
              </div>
            </div>
            <Badge variant="success">已迁移</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 筛选和搜索 */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* 搜索框 - 使用新的SearchInput组件 */}
            <div className="md:col-span-2">
              <SearchInput
                label="搜索测试记录"
                placeholder="输入测试名称或URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={(value) => console.log('搜索:', value)}
                onClear={() => setSearchTerm('')}
              />
            </div>

            {/* 状态筛选 - 使用新的Select组件 */}
            <div>
              <Select
                label="状态筛选"
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          </div>

          {/* 批量操作 */}
          {selectedRecords.size > 0 && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SimpleCheckbox
                    checked={selectedRecords.size === filteredRecords.length}
                    indeterminate={selectedRecords.size > 0 && selectedRecords.size < filteredRecords.length}
                    onChange={toggleSelectAll}
                    aria-label="全选/取消全选"
                  />
                  <span className="text-sm text-gray-300">
                    已选择 {selectedRecords.size} 条记录
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRecords(new Set())}>
                    取消选择
                  </Button>
                  <DeleteButton size="sm" onClick={handleBatchDelete}>
                    批量删除
                  </DeleteButton>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 测试记录列表 */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardBody className="text-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <span className="text-gray-400">加载中...</span>
            </CardBody>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">暂无测试记录</h3>
              <p className="text-gray-400">
                {searchTerm || statusFilter !== 'all'
                  ? '没有找到符合条件的测试记录'
                  : '开始您的第一次压力测试吧'}
              </p>
            </CardBody>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const statusConfig = getStatusConfig(record.status);
            return (
              <Card key={record.id} hover>
                <CardBody>
                  <div className="flex items-start gap-4">
                    {/* 复选框 - 使用新的SimpleCheckbox组件 */}
                    <div className="pt-1">
                      <SimpleCheckbox
                        checked={selectedRecords.has(record.id)}
                        onChange={() => toggleSelectRecord(record.id)}
                        aria-label={`选择测试记录: ${record.testName}`}
                      />
                    </div>

                    {/* 记录内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 第一行：标题和状态 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {record.testName}
                          </h3>
                          <p className="text-sm text-gray-400 truncate mt-1">
                            {record.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <StatusBadge 
                            status={statusConfig.status} 
                            text={statusConfig.text}
                          />
                          {record.tags && record.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" size="xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* 第二行：关键指标 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-400">创建时间</span>
                          <p className="font-medium text-white">{formatTime(record.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">测试时长</span>
                          <p className="font-medium text-white">{formatDuration(record)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">性能评分</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{formatScore(record)}</span>
                            {record.overallScore && (
                              <ProgressBadge value={record.overallScore} />
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">错误率</span>
                          <p className="font-medium text-white">{formatErrorRate(record)}</p>
                        </div>
                      </div>

                      {/* 错误信息 */}
                      {record.errorMessage && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400">{record.errorMessage}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <IconButton
                        icon={<Eye className="w-4 h-4" />}
                        variant="ghost"
                        size="sm"
                        aria-label="查看详情"
                        onClick={() => console.log('查看详情:', record.id)}
                      />
                      <IconButton
                        icon={<Download className="w-4 h-4" />}
                        variant="ghost"
                        size="sm"
                        aria-label="下载报告"
                        onClick={() => console.log('下载报告:', record.id)}
                      />
                      <IconButton
                        icon={<Trash2 className="w-4 h-4" />}
                        variant="danger"
                        size="sm"
                        aria-label="删除记录"
                        onClick={() => handleDeleteRecord(record.id)}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {/* 确认删除对话框 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="确认删除"
        message="您确定要删除这条测试记录吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
};

export default StressTestHistoryMigrated;
