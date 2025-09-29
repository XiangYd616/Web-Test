/**
 * 涓氬姟鍒嗘瀽浠〃鏉跨粍浠?
 * 鏄剧ず绯荤粺鐩戞帶銆佷笟鍔℃寚鏍囥€佺敤鎴疯涓虹瓑鍒嗘瀽鏁版嵁
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, 
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
  CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import {TrendingUp, TrendingDown, TrendingFlat, Refresh, Download, Warning, CheckCircle, Error, Speed, People, Assessment, Memory, Timer} from '@mui/icons-material';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell} from 'recharts';

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
    cpu: unknown;
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

  // 鑾峰彇浠〃鏉挎暟鎹?
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${state.auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`鑾峰彇鏁版嵁澶辫触: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || '鑾峰彇鏁版嵁澶辫触');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '鑾峰彇鏁版嵁澶辫触');
      console.error('鑾峰彇浠〃鏉挎暟鎹け璐?', err);
    } finally {
      setLoading(false);
    }
  };

  // 鍒濆鍖栧拰鑷姩鍒锋柊
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // 30绉掑埛鏂颁竴娆?
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 娓呯悊瀹氭椂鍣?
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // 鑾峰彇鍋ュ悍鐘舵€侀鑹?
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  // 鑾峰彇鍛婅绾у埆棰滆壊
  const getAlertSeverity = (level: string) => {
    switch (level) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'info';
    }
  };

  // 鑾峰彇瓒嬪娍鍥炬爣
  const _getTrendIcon = (current: number, previous: number) => {
    if (current > previous * 1.05) return <TrendingUp color="success" />;
    if (current < previous * 0.95) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  // 鏍煎紡鍖栧浘琛ㄦ暟鎹?
  const _formatChartData = (data: unknown[]) => {
    return data.map((item, index) => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      ...item
    }));
  };

  // 鐢熸垚娴嬭瘯绫诲瀷鍥捐〃鏁版嵁
  const testTypeChartData = useMemo(() => {
    if (!dashboardData?.business?.business?.testTypes) return [];
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];
    
    return Object.entries(dashboardData?.business.business?.testTypes).map(([type, count], index) => ({
      name: type,
      value: count,
      color: colors[index % colors.length]
    }));


  /**


   * if功能函数


   * @param {Object} params - 参数对象


   * @returns {Promise<Object>} 返回结果


   */
  }, [dashboardData?.business?.business?.testTypes]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          鍔犺浇鍒嗘瀽鏁版嵁...
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
            閲嶈瘯
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
        鏆傛棤鍒嗘瀽鏁版嵁
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 椤堕儴鎺у埗鏍?*/}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          涓氬姟鍒嗘瀽浠〃鏉?
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>鏃堕棿鑼冨洿</InputLabel>
            <Select
              value={timeRange}
              label="鏃堕棿鑼冨洿"
              onChange={(e) => setTimeRange(e?.target.value)}
            >
              <MenuItem value="1h">1灏忔椂</MenuItem>
              <MenuItem value="6h">6灏忔椂</MenuItem>
              <MenuItem value="24h">24灏忔椂</MenuItem>
              <MenuItem value="7d">7天</MenuItem>
              <MenuItem value="30d">30天</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="鍒锋柊鏁版嵁">
            <IconButton onClick={fetchDashboardData}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="瀵煎嚭鏁版嵁">
            <IconButton>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 绯荤粺姒傝鍗＄墖 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircle sx={{ color: getHealthColor(dashboardData?.summary.systemHealth), mr: 1 }} />
              <Typography variant="subtitle2">绯荤粺鍋ュ悍</Typography>
            </Box>
            <Typography variant="h4" color={getHealthColor(dashboardData?.summary.systemHealth)}>
              {dashboardData?.summary.systemHealth === 'healthy' ? '姝ｅ父' :
               dashboardData?.summary.systemHealth === 'warning' ? '璀﹀憡' : '涓ラ噸'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              杩愯鏃堕棿: {formatDuration(dashboardData?.system?.system?.uptime * 1000 || 0)}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Assessment sx={{ color: '#2196f3', mr: 1 }} />
              <Typography variant="subtitle2">娴嬭瘯鎬绘暟</Typography>
            </Box>
            <Typography variant="h4">
              {formatNumber(dashboardData?.summary.totalTests)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              鎴愬姛鐜? {dashboardData?.summary.successRate.toFixed(1)}%
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Timer sx={{ color: '#ff9800', mr: 1 }} />
              <Typography variant="subtitle2">鍝嶅簲鏃堕棿</Typography>
            </Box>
            <Typography variant="h4">
              {dashboardData?.summary.averageResponseTime}ms
            </Typography>
            <Typography variant="body2" color="textSecondary">
              骞冲潎鍝嶅簲鏃堕棿
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <People sx={{ color: '#4caf50', mr: 1 }} />
              <Typography variant="subtitle2">娲昏穬鐢ㄦ埛</Typography>
            </Box>
            <Typography variant="h4">
              {dashboardData?.summary.activeUsers}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              褰撳墠鍦ㄧ嚎鐢ㄦ埛
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 鏍囩椤?*/}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="绯荤粺鐩戞帶" icon={<Memory />} />
          <Tab label="涓氬姟鎸囨爣" icon={<Assessment />} />
          <Tab label="鐢ㄦ埛鍒嗘瀽" icon={<People />} />
          <Tab label="鍛婅涓績" icon={<Warning />} />
        </Tabs>
      </Paper>

      {/* 绯荤粺鐩戞帶闈㈡澘 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                <Memory sx={{ mr: 1, verticalAlign: 'middle' }} />
                鍐呭瓨浣跨敤鎯呭喌
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">宸茬敤鍐呭瓨</Typography>
                  <Typography variant="body2">
                    {dashboardData?.system?.system?.memoryPercent.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData?.system?.system?.memoryPercent || 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {formatBytes(dashboardData?.system?.system?.memory?.rss || 0)} / 
                {formatBytes(dashboardData?.system?.system?.totalMemory || 0)}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                CPU浣跨敤鐜?
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">CPU璐熻浇</Typography>
                  <Typography variant="body2">
                    {dashboardData?.system?.system?.cpuPercent?.toFixed(1) || 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData?.system?.system?.cpuPercent || 0}
                  color={dashboardData?.system?.system?.cpuPercent > 80 ? 'error' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                璐熻浇骞冲潎鍊? {dashboardData?.system?.system?.loadAverage?.[0]?.toFixed(2) || 'N/A'}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 涓氬姟鎸囨爣闈㈡澘 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>娴嬭瘯鎵ц瓒嬪娍</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#4caf50" name="鎴愬姛" />
                  <Line type="monotone" dataKey="failed" stroke="#f44336" name="澶辫触" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>娴嬭瘯绫诲瀷鍒嗗竷</Typography>
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
              <Typography variant="h6" mb={2}>鍏抽敭涓氬姟鎸囨爣</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {dashboardData?.business?.business?.throughput || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      姣忓皬鏃舵祴璇曟暟
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error">
                      {dashboardData?.business?.business?.errorRate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      閿欒鐜?
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {dashboardData?.business?.business?.userSatisfaction?.toFixed(1) || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      鐢ㄦ埛婊℃剰搴?
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {dashboardData?.business?.business?.activeTests || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      娲昏穬娴嬭瘯
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 鐢ㄦ埛鍒嗘瀽闈㈡澘 */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>鐢ㄦ埛娲诲姩缁熻</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="primary">
                      {dashboardData?.user?.users?.activeUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      娲昏穬鐢ㄦ埛
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="success.main">
                      {dashboardData?.user?.users?.newUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      鏂板鐢ㄦ埛
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>浼氳瘽缁熻</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="info.main">
                      {formatDuration(dashboardData?.user?.users?.userSessions?.averageSessionDuration * 1000 || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      骞冲潎浼氳瘽鏃堕暱
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="warning.main">
                      {(dashboardData?.user?.users?.userSessions?.bounceRate * 100)?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      璺冲嚭鐜?
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>鐑棬鐢ㄦ埛鎿嶄綔</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>鎿嶄綔</TableCell>
                      <TableCell align="right">娆℃暟</TableCell>
                      <TableCell align="right">鍗犳瘮</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.user?.users?.topUserActions?.map((action, index) => {
                      const total = dashboardData?.user?.users?.topUserActions?.reduce((sum, a) => sum + a?.count, 0) || 1;
                      const percentage = (action?.count / total * 100).toFixed(1);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{action?.action}</TableCell>
                          <TableCell align="right">{formatNumber(action?.count)}</TableCell>
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

      {/* 鍛婅涓績闈㈡澘 */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                鏈€鏂板憡璀?({dashboardData?.alerts?.length || 0})
              </Typography>
              
              {dashboardData?.alerts && dashboardData?.alerts.length > 0 ? (
                <Box>
                  {dashboardData?.alerts.slice(0, 10).map((alert) => (
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
                          褰撳墠鍊? {alert.value} | 闃堝€? {alert.threshold}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                </Box>
              ) : (
                <Alert severity="success">
                  鏆傛棤鍛婅锛岀郴缁熻繍琛屾甯?
                </Alert>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 搴曢儴鐘舵€佹爮 */}
      <Box mt={4} pt={2} borderTop="1px solid" borderColor="divider">
        <Typography variant="body2" color="textSecondary" align="center">
          鏈€鍚庢洿鏂? {new Date(dashboardData?.summary.lastUpdated).toLocaleString()} |
          自动刷新: {autoRefresh ? '开启' : '关闭'} |
          鏁版嵁鏉ユ簮: BusinessAnalyticsService
        </Typography>
      </Box>
    </Box>
  );
};

export default BusinessAnalyticsDashboard;

