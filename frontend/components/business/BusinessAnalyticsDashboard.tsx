/**
 * 业务分析仪表板组件
 * 显示系统监控、业务指标、用户行为等分析数据
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Grid, 
  Typography, 
  Box, 
  Chip, 
  LinearProgress, 
  Alert, 
  Tabs, 
  Tab, 
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Download,
  Warning,
  CheckCircle,
  Error,
  Info,
  Speed,
  People,
  Assessment,
  Memory,
  Storage,
  NetworkCheck,
  Timer,
  BugReport,
  Security
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

import { useAppState } from '../../hooks/useAppState';
import { formatBytes, formatDuration, formatNumber } from '../../utils/formatters';

interface DashboardData {
  system: SystemMetrics;
  business: BusinessMetrics;
  user: UserMetrics;
  alerts: Alert[];
  summary: {
    totalTests: number;
    successRate: number;
    averageResponseTime: number;
    activeUsers: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastUpdated: string;
  };
}

interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    cpu: any;
    cpuPercent: number;
    memoryPercent: number;
    loadAverage: number[];
    freeMemory: number;
    totalMemory: number;
  };
}

interface BusinessMetrics {
  timestamp: string;
  business: {
    activeTests: number;
    completedTests: number;
    failedTests: number;
    averageResponseTime: number;
    testTypes: Record<string, number>;
    errorRate: number;
    throughput: number;
    userSatisfaction: number;
  };
}

interface UserMetrics {
  timestamp: string;
  users: {
    activeUsers: number;
    newUsers: number;
    userRetention: number;
    topUserActions: Array<{ action: string; count: number }>;
    userSessions: {
      averageSessionDuration: number;
      totalSessions: number;
      bounceRate: number;
    };
  };
}

interface Alert {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  value?: number;
  threshold?: number;
}

const BusinessAnalyticsDashboard: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 获取仪表板数据
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${state.auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      console.error('获取仪表板数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始化和自动刷新
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // 30秒刷新一次
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // 获取健康状态颜色
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  // 获取告警级别颜色
  const getAlertSeverity = (level: string) => {
    switch (level) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'info';
    }
  };

  // 获取趋势图标
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous * 1.05) return <TrendingUp color="success" />;
    if (current < previous * 0.95) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  // 格式化图表数据
  const formatChartData = (data: any[]) => {
    return data.map((item, index) => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      ...item
    }));
  };

  // 生成测试类型图表数据
  const testTypeChartData = useMemo(() => {
    if (!dashboardData?.business?.business?.testTypes) return [];
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];
    
    return Object.entries(dashboardData.business.business.testTypes).map(([type, count], index) => ({
      name: type,
      value: count,
      color: colors[index % colors.length]
    }));
  }, [dashboardData?.business?.business?.testTypes]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          加载分析数据...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <Button color="inherit" size="small" onClick={fetchDashboardData}>
            重试
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        暂无分析数据
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 顶部控制栏 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          业务分析仪表板
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>时间范围</InputLabel>
            <Select
              value={timeRange}
              label="时间范围"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1h">1小时</MenuItem>
              <MenuItem value="6h">6小时</MenuItem>
              <MenuItem value="24h">24小时</MenuItem>
              <MenuItem value="7d">7天</MenuItem>
              <MenuItem value="30d">30天</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="刷新数据">
            <IconButton onClick={fetchDashboardData}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="导出数据">
            <IconButton>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 系统概览卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircle sx={{ color: getHealthColor(dashboardData.summary.systemHealth), mr: 1 }} />
              <Typography variant="subtitle2">系统健康</Typography>
            </Box>
            <Typography variant="h4" color={getHealthColor(dashboardData.summary.systemHealth)}>
              {dashboardData.summary.systemHealth === 'healthy' ? '正常' :
               dashboardData.summary.systemHealth === 'warning' ? '警告' : '严重'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              运行时间: {formatDuration(dashboardData.system?.system?.uptime * 1000 || 0)}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Assessment sx={{ color: '#2196f3', mr: 1 }} />
              <Typography variant="subtitle2">测试总数</Typography>
            </Box>
            <Typography variant="h4">
              {formatNumber(dashboardData.summary.totalTests)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              成功率: {dashboardData.summary.successRate.toFixed(1)}%
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Timer sx={{ color: '#ff9800', mr: 1 }} />
              <Typography variant="subtitle2">响应时间</Typography>
            </Box>
            <Typography variant="h4">
              {dashboardData.summary.averageResponseTime}ms
            </Typography>
            <Typography variant="body2" color="textSecondary">
              平均响应时间
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <People sx={{ color: '#4caf50', mr: 1 }} />
              <Typography variant="subtitle2">活跃用户</Typography>
            </Box>
            <Typography variant="h4">
              {dashboardData.summary.activeUsers}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              当前在线用户
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 标签页 */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="系统监控" icon={<Memory />} />
          <Tab label="业务指标" icon={<Assessment />} />
          <Tab label="用户分析" icon={<People />} />
          <Tab label="告警中心" icon={<Warning />} />
        </Tabs>
      </Paper>

      {/* 系统监控面板 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                <Memory sx={{ mr: 1, verticalAlign: 'middle' }} />
                内存使用情况
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">已用内存</Typography>
                  <Typography variant="body2">
                    {dashboardData.system?.system?.memoryPercent.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData.system?.system?.memoryPercent || 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {formatBytes(dashboardData.system?.system?.memory?.rss || 0)} / 
                {formatBytes(dashboardData.system?.system?.totalMemory || 0)}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                CPU使用率
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">CPU负载</Typography>
                  <Typography variant="body2">
                    {dashboardData.system?.system?.cpuPercent?.toFixed(1) || 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData.system?.system?.cpuPercent || 0}
                  color={dashboardData.system?.system?.cpuPercent > 80 ? 'error' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                负载平均值: {dashboardData.system?.system?.loadAverage?.[0]?.toFixed(2) || 'N/A'}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 业务指标面板 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>测试执行趋势</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#4caf50" name="成功" />
                  <Line type="monotone" dataKey="failed" stroke="#f44336" name="失败" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>测试类型分布</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={testTypeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {testTypeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>关键业务指标</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {dashboardData.business?.business?.throughput || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      每小时测试数
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error">
                      {dashboardData.business?.business?.errorRate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      错误率
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {dashboardData.business?.business?.userSatisfaction?.toFixed(1) || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      用户满意度
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {dashboardData.business?.business?.activeTests || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      活跃测试
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 用户分析面板 */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>用户活动统计</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="primary">
                      {dashboardData.user?.users?.activeUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      活跃用户
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="success.main">
                      {dashboardData.user?.users?.newUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      新增用户
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>会话统计</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="info.main">
                      {formatDuration(dashboardData.user?.users?.userSessions?.averageSessionDuration * 1000 || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      平均会话时长
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="warning.main">
                      {(dashboardData.user?.users?.userSessions?.bounceRate * 100)?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      跳出率
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>热门用户操作</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>操作</TableCell>
                      <TableCell align="right">次数</TableCell>
                      <TableCell align="right">占比</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.user?.users?.topUserActions?.map((action, index) => {
                      const total = dashboardData.user?.users?.topUserActions?.reduce((sum, a) => sum + a.count, 0) || 1;
                      const percentage = (action.count / total * 100).toFixed(1);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{action.action}</TableCell>
                          <TableCell align="right">{formatNumber(action.count)}</TableCell>
                          <TableCell align="right">{percentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 告警中心面板 */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                最新告警 ({dashboardData.alerts?.length || 0})
              </Typography>
              
              {dashboardData.alerts && dashboardData.alerts.length > 0 ? (
                <Box>
                  {dashboardData.alerts.slice(0, 10).map((alert) => (
                    <Alert
                      key={alert.id}
                      severity={getAlertSeverity(alert.level) as any}
                      sx={{ mb: 1 }}
                      action={
                        <Chip
                          label={new Date(alert.timestamp).toLocaleString()}
                          size="small"
                          variant="outlined"
                        />
                      }
                    >
                      <strong>{alert.type}:</strong> {alert.message}
                      {alert.value && alert.threshold && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          当前值: {alert.value} | 阈值: {alert.threshold}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                </Box>
              ) : (
                <Alert severity="success">
                  暂无告警，系统运行正常
                </Alert>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 底部状态栏 */}
      <Box mt={4} pt={2} borderTop="1px solid" borderColor="divider">
        <Typography variant="body2" color="textSecondary" align="center">
          最后更新: {new Date(dashboardData.summary.lastUpdated).toLocaleString()} |
          自动刷新: {autoRefresh ? '开启' : '关闭'} |
          数据来源: BusinessAnalyticsService
        </Typography>
      </Box>
    </Box>
  );
};

export default BusinessAnalyticsDashboard;
