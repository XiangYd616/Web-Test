/**
 * 监控仪表板组件
 * 集成实时监控功能，提供统一的监控界面
 */

import { Activity, AlertTriangle, Bell, CheckCircle, Clock, Edit, Eye, EyeOff, Globe, Pause, Play, Plus, Trash2, TrendingUp, Wifi, // Zap   } from 'lucide-react';// 已修复'
import React, { useCallback, useEffect, useState    } from 'react';import { useNotification    } from '../../hooks/useNotification';import { useRealTimeData    } from '../../hooks/useWebSocket';import { Badge, Button, Card, Input, Modal, Select, // Table   } from '../ui/index';// 已修复'
// SelectOption and TableColumn types will be defined locally

// 监控目标接口
export interface MonitorTarget     {
    id: string;
    name: string;
    url: string;
    type: 'website' | 'api' | 'database' | 'service';
    status: 'online' | 'offline' | 'warning' | 'error';
    enabled: boolean;
    interval: number; // 检查间隔（秒）
    timeout: number; // 超时时间（秒）
    lastChecked?: string;
    responseTime?: number;
    uptime?: number;
    errorCount?: number;
    tags?: string[];
}

// 监控统计接口
export interface MonitorStats     {
    totalTargets: number;
    activeTargets: number;
    onlineTargets: number;
    offlineTargets: number;
    warningTargets: number;
    overallUptime: number;
    averageResponseTime: number;
    totalChecks: number;
    failedChecks: number;
}

// 告警接口
export interface Alert     {
    id: string;
    targetId: string;
    targetName: string;
    type: 'down' | 'slow' | 'error' | 'timeout';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
}

// 组件属性接口
export interface MonitorDashboardProps     {
    className?: string;
}

// 监控类型选项
const monitorTypeOptions: SelectOption[]  = [
    { value: 'website', label: '网站' },'
    { value: 'api', label: 'API' },'
    { value: 'database', label: '数据库' },'
    { value: 'service', label: '服务' }'
];
// 检查间隔选项
const intervalOptions: SelectOption[]  = [
    { value: '30', label: '30秒' },'
    { value: '60', label: '1分钟' },'
    { value: '300', label: '5分钟' },'
    { value: '600', label: '10分钟' },'
    { value: '1800', label: '30分钟' },'
    { value: '3600', label: '1小时' }'
];
export const MonitorDashboard: React.FC<MonitorDashboardProps> = ({
    className = '';
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  
  // 图表和数据可视化
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('line');'
  const processChartData = useCallback((rawData) => {
    if (!rawData) return null;

    // 处理数据为图表格式
    return {
      labels: rawData.map(item => item.label),
      datasets: [{
        label: '数据','
        data: rawData.map(item => item.value),
        borderColor: 'rgb(75, 192, 192)','
        backgroundColor: 'rgba(75, 192, 192, 0.2)','
      }]
    };
  }, []);

  useEffect(() => {
    if (data) {
      const processed = processChartData(data);
      setChartData(processed);
    }
  }, [data, processChartData]);
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    "aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
    // 状态管理
    const [targets, setTargets] = useState<MonitorTarget[]>([]);
    const [stats, setStats] = useState<MonitorStats | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<MonitorTarget | null>(null);
    const [newTarget, setNewTarget] = useState<Partial<MonitorTarget>>({
        name: '','
        url: '','
        type: 'website','
        interval: 60,
        timeout: 30,
        enabled: true,
        tags: []
    });

    // 自定义钩子
    const { showNotification } = useNotification();
    const { data: realTimeData, isConnected }  = useRealTimeData('monitoring');'
    // 初始化数据
    useEffect(() => {
        loadInitialData();
    }, []);

    // 实时数据更新
    useEffect(() => {
        if (realTimeData) {
            handleRealTimeUpdate(realTimeData);
        }
    }, [realTimeData]);

    // 加载初始数据
    const loadInitialData = useCallback(async () => {
        try {
            // 模拟加载监控目标
            const mockTargets: MonitorTarget[]  = [
                {
                    id: '1','
                    name: '主网站','
                    url: 'https://example.com','
                    type: 'website','
                    status: 'online','
                    enabled: true,
                    interval: 60,
                    timeout: 30,
                    lastChecked: new Date().toISOString(),
                    responseTime: 150,
                    uptime: 99.9,
                    errorCount: 0,
                    tags: ['production', 'critical']'
                },
                {
                    id: '2','
                    name: 'API服务','
                    url: 'https://api.example.com','
                    type: 'api','
                    status: 'warning','
                    enabled: true,
                    interval: 30,
                    timeout: 10,
                    lastChecked: new Date().toISOString(),
                    responseTime: 800,
                    uptime: 98.5,
                    errorCount: 2,
                    tags: ['api', "backend']'
                }
            ];
            setTargets(mockTargets);

            // 模拟统计数据
            const mockStats: MonitorStats  = {
                totalTargets: mockTargets.length,
                activeTargets: mockTargets.filter(t => t.enabled).length,
                onlineTargets: mockTargets.filter(t => t.status === 'online').length,'
                offlineTargets: mockTargets.filter(t => t.status === 'offline').length,'
                warningTargets: mockTargets.filter(t => t.status === 'warning').length,'
                overallUptime: 99.2,
                averageResponseTime: 475,
                totalChecks: 1000,
                failedChecks: 8
            };
            setStats(mockStats);

            // 模拟告警数据
            const mockAlerts: Alert[]  = [
                {
                    id: '1','
                    targetId: '2','
                    targetName: 'API服务','
                    type: 'slow','
                    severity: 'medium','
                    message: '响应时间超过阈值 (800ms > 500ms)','
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    resolved: false
                }
            ];
            setAlerts(mockAlerts);

        } catch (error) {
            console.error('Failed to load monitoring data: ', error);'
            showNotification('加载监控数据失败', "error');'
        }
    }, [showNotification]);

    // 处理实时数据更新
    const handleRealTimeUpdate = useCallback((data: any) => {
        if (data.type === 'target_update') {'
            setTargets(prev => prev.map(target =>
                target.id === data.targetId
                    ? { ...target, ...data.updates }
                    : target
            ));
        } else if (data.type === 'new_alert') {'
            setAlerts(prev => [data.alert, ...prev]);
            showNotification(`新告警: ${data.alert.message}`, 'warning');'`
        } else if (data.type === "stats_update') {'`
            setStats(data.stats);
        }
    }, [showNotification]);

    // 开始/停止监控
    const toggleMonitoring = useCallback(async () => {
        try {
            if (isMonitoring) {
                // 停止监控
                setIsMonitoring(false);
                showNotification('监控已停止', "info');'
            } else {
                // 开始监控
                setIsMonitoring(true);
                showNotification('监控已启动', 'success');'
            }
        } catch (error) {
            showNotification('操作失败', "error');'
        }
    }, [isMonitoring, showNotification]);

    // 添加监控目标
    const handleAddTarget = useCallback(async () => {
        try {
            if (!newTarget.name || !newTarget.url) {
                
        showNotification('请填写完整信息', 'error');'
                return;
      }

            const target: MonitorTarget  = {
                id: Date.now().toString(),
                name: newTarget.name!,
                url: newTarget.url!,
                type: newTarget.type || 'website','
                status: 'offline','
                enabled: newTarget.enabled || true,
                interval: newTarget.interval || 60,
                timeout: newTarget.timeout || 30,
                tags: newTarget.tags || []
            };
            setTargets(prev => [...prev, target]);
            setNewTarget({
                name: '','
                url: '','
                type: 'website','
                interval: 60,
                timeout: 30,
                enabled: true,
                tags: []
            });
            setShowAddModal(false);
            showNotification('监控目标已添加', 'success');'
        } catch (error) {
            showNotification('添加失败', "error');'
        }
    }, [newTarget, showNotification]);

    // 编辑监控目标
    const handleEditTarget = useCallback(async () => {
        try {
            if (!selectedTarget) return;

            setTargets(prev => prev.map(target =>
                target.id === selectedTarget.id ? selectedTarget : target
            ));
            setShowEditModal(false);
            setSelectedTarget(null);
            showNotification('监控目标已更新', 'success');'
        } catch (error) {
            showNotification('更新失败', "error');'
        }
    }, [selectedTarget, showNotification]);

    // 删除监控目标
    const handleDeleteTarget = useCallback(async (targetId: string) => {
        try {
            if (!confirm('确定要删除这个监控目标吗？')) return;'
            setTargets(prev => prev.filter(target => target.id !== targetId));
            showNotification('监控目标已删除', 'success');'
        } catch (error) {
            showNotification('删除失败', "error');'
        }
    }, [showNotification]);

    // 切换目标启用状态
    const toggleTargetEnabled = useCallback(async (targetId: string) => {
        try {
            setTargets(prev => prev.map(target =>
                target.id === targetId
                    ? { ...target, enabled: !target.enabled }
                    : target
            ));
            showNotification('状态已更新', 'success');'
        } catch (error) {
            showNotification('操作失败', "error');'
        }
    }, [showNotification]);

    // 手动检查目标
    const handleManualCheck = useCallback(async (targetId: string) => {
        try {
            // 模拟检查过程
            setTargets(prev => prev.map(target =>
                target.id === targetId
                    ? { ...target, lastChecked: new Date().toISOString() }
                    : target
            ));
            showNotification('检查完成', 'success');'
        } catch (error) {
            showNotification('检查失败', "error');'
        }
    }, [showNotification]);

    // 获取状态图标
    const getStatusIcon = (status: MonitorTarget['status']) => {'
        switch (status) {
            case 'online': ''
                return <CheckCircle className= 'w-5 h-5 text-green-500'    />;'
            case 'warning': ''
                return <AlertTriangle className= 'w-5 h-5 text-yellow-500'    />;'
            case 'error': ''
            case "offline': ''
                return <AlertTriangle className= 'w-5 h-5 text-red-500'    />;'
            default:
                return <Clock className= 'w-5 h-5 text-gray-500'    />;'
        }
    };

    // 获取状态颜色
    const getStatusColor = (status: MonitorTarget['status']) => {'
        switch (status) {
            case 'online': return 'green';
            case 'warning': return 'yellow';
            case 'error': ''
            case 'offline': return 'red';
            default: return 'gray';
        }
    };

    // 格式化时间
    const formatTime = (timestamp?: string) => {
        if (!timestamp) return '从未';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "刚刚';
        if (minutes < 60) return `${minutes}分钟前`;`
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小时前`;`
        return date.toLocaleDateString();
    };

    // 表格列定义
    const targetColumns: TableColumn[]  = [
        {
            key: "status','`
            title: '状态','
            render: (_, record) => (
                <div className= 'flex items-center space-x-2'>
                    {getStatusIcon(record.status)}
                    <Badge variant={getStatusColor(record.status) as any} size= 'sm'>
                        {record.status}
                    </Badge>
                </div>
            )
        },
        {
            key: 'name','
            title: '名称','
            render: (_, record) => (
                <div>
                    <div className= 'font-medium text-gray-900'>{record.name}</div>
                    <div className= 'text-sm text-gray-500'>{record.url}</div>
                    <div className= 'text-xs text-gray-400'>
                        {record.type} • 间隔: {record.interval}s
                    </div>
                </div>
            )
        },
        {
            key: 'metrics','
            title: '指标','
            render: (_, record) => (
                <div className= 'text-sm'>
                    {record.responseTime && (
                        <div>响应时间: {record.responseTime}ms</div>
                    )}
                    {record.uptime && (
                        <div>可用性: {record.uptime.toFixed(1)}%</div>
                    )}
                    <div>最后检查: {formatTime(record.lastChecked)}</div>
                </div>
            )
        },
        {
            key: 'actions','
            title: '操作','
            render: (_, record) => (
                <div className= 'flex items-center space-x-2'>
                    <Button
                        variant= 'ghost';
                        size= 'sm';
                        onClick={() => toggleTargetEnabled(record.id)}
                        icon={record.enabled ? <Eye className= 'w-4 h-4'    /> : <EyeOff className= 'w-4 h-4'    />}'
                        title={record.enabled ? "禁用" : "启用'}'
                    />
                    <Button
                        variant= 'ghost';
                        size= 'sm';
                        onClick={() => handleManualCheck(record.id)}
                        icon={<Activity className= 'w-4 h-4'    />}'
                        title= '手动检查';
                    />
                    <Button
                        variant= 'ghost';
                        size= 'sm';
                        onClick={() => {
                            setSelectedTarget(record);
                            setShowEditModal(true);
                        }}
                        icon={<Edit className= 'w-4 h-4'    />}'
                        title= '编辑';
                    />
                    <Button
                        variant= 'ghost';
                        size= 'sm';
                        onClick={() => handleDeleteTarget(record.id)}
                        icon={<Trash2 className= 'w-4 h-4'    />}'
                        title= '删除';
                    />
                </div>
            )
        }
    ];

    return (
        <div className={`space-y-6 ${className}`}>`
            {/* 头部控制面板 */}
            <Card className= "p-6'>`
                <div className= 'flex items-center justify-between'>
                    <div className= 'flex items-center space-x-4'>
                        <div className= 'bg-blue-50 p-3 rounded-lg'>
                            <Activity className= 'w-8 h-8 text-blue-600'    />
                        </div>
                        <div>
                            <h1 className= 'text-2xl font-bold text-gray-900'>监控仪表板</h1>
                            <p className= 'text-gray-600 mt-1'>
                                实时监控您的网站和服务状态
                                {isConnected && (
                                    <span className= 'ml-2 inline-flex items-center'>
                                        <span className= 'w-2 h-2 bg-green-500 rounded-full mr-1'></span>
                                        实时连接
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className= 'flex items-center space-x-3'>
                        <Button
                            variant= 'ghost';
                            onClick={() => setShowAddModal(true)}
                            icon={<Plus className= 'w-4 h-4'    />}'
                        >
                            添加监控
                        </Button>
                        <Button variant={isMonitoring ? 'danger' : 'primary'}'
                            onClick={toggleMonitoring}
                            icon={isMonitoring ? <Pause className= 'w-4 h-4'    /> : <Play className= 'w-4 h-4'    />}'
                        >
                            {isMonitoring ? "停止监控" : "开始监控'}'
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 统计概览 */}
            {stats && (
                <div className= 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                    <Card className= 'p-6'>
                        <div className= 'flex items-center justify-between'>
                            <div>
                                <p className= 'text-sm font-medium text-gray-500 mb-1'>监控目标</p>
                                <p className= 'text-3xl font-bold text-gray-900'>{stats.totalTargets}</p>
                                <p className= 'text-sm text-gray-600 mt-1'>
                                    {stats.activeTargets} 个活跃
                                </p>
                            </div>
                            <div className= 'bg-blue-50 p-3 rounded-lg'>
                                <Globe className= 'w-8 h-8 text-blue-600'    />
                            </div>
                        </div>
                    </Card>

                    <Card className= 'p-6'>
                        <div className= 'flex items-center justify-between'>
                            <div>
                                <p className= 'text-sm font-medium text-gray-500 mb-1'>整体可用性</p>
                                <p className= 'text-3xl font-bold text-gray-900'>{stats.overallUptime.toFixed(1)}%</p>
                                <p className= 'text-sm text-green-600 mt-1 flex items-center'>
                                    <TrendingUp className= 'w-4 h-4 mr-1'    />
                                    {stats.onlineTargets} 个在线
                                </p>
                            </div>
                            <div className= 'bg-green-50 p-3 rounded-lg'>
                                <CheckCircle className= 'w-8 h-8 text-green-600'    />
                            </div>
                        </div>
                    </Card>

                    <Card className= 'p-6'>
                        <div className= 'flex items-center justify-between'>
                            <div>
                                <p className= 'text-sm font-medium text-gray-500 mb-1'>平均响应时间</p>
                                <p className= 'text-3xl font-bold text-gray-900'>{stats.averageResponseTime}ms</p>
                                <p className= 'text-sm text-blue-600 mt-1 flex items-center'>
                                    <Zap className= 'w-4 h-4 mr-1'    />
                                    性能良好
                                </p>
                            </div>
                            <div className= 'bg-orange-50 p-3 rounded-lg'>
                                <Wifi className= 'w-8 h-8 text-orange-600'    />
                            </div>
                        </div>
                    </Card>

                    <Card className= 'p-6'>
                        <div className= 'flex items-center justify-between'>
                            <div>
                                <p className= 'text-sm font-medium text-gray-500 mb-1'>活跃告警</p>
                                <p className= 'text-3xl font-bold text-gray-900'>
                                    {alerts.filter(a => !a.resolved).length}
                                </p>
                                <p className= 'text-sm text-gray-600 mt-1'>
                                    {alerts.filter(a => a.resolved).length} 个已解决
                                </p>
                            </div>
                            <div className= 'bg-red-50 p-3 rounded-lg'>
                                <Bell className= 'w-8 h-8 text-red-600'    />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* 监控目标列表 */}
            <Card>
                <div className= 'p-6 border-b border-gray-200'>
                    <h2 className= 'text-lg font-semibold text-gray-900'>监控目标</h2>
                </div>
                <Table columns={targetColumns}
                    data={targets}
                    rowKey= 'id';
                    emptyText= '暂无监控目标';
                   />
            </Card>

            {/* 最近告警 */}
            {alerts.length > 0 && (
                <Card>
                    <div className= 'p-6 border-b border-gray-200'>
                        <h2 className= 'text-lg font-semibold text-gray-900'>最近告警</h2>
                    </div>
                    <div className= 'divide-y divide-gray-200'>
                        {alerts.slice(0, 5).map((alert) => (
                            <div key={alert.id} className= 'p-4'>
                                <div className= 'flex items-start space-x-3'>
                                    <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-100' : ''`}
                                        alert.severity === "high' ? 'bg-orange-100' : ''`
                                            alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100';
                                        }`}>`
                                        <AlertTriangle className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-600' : ''`}
                                            alert.severity === "high' ? 'text-orange-600' : ''`
                                                alert.severity === 'medium' ? 'text-yellow-600' : "text-blue-600';
                                            }`}    />`
                                    </div>
                                    <div className= "flex-1'>`
                                        <div className= 'flex items-center space-x-2 mb-1'>
                                            <h4 className= 'font-medium text-gray-900'>{alert.targetName}</h4>
                                            <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'} size= 'sm'>
                                                {alert.severity}
                                            </Badge>
                                        </div>
                                        <p className= 'text-sm text-gray-600 mb-1'>{alert.message}</p>
                                        <p className= 'text-xs text-gray-500'>
                                            {new Date(alert.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                    {!alert.resolved && (
                                        <Badge variant= 'danger' size= 'sm'>
                                            未解决
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* 添加监控目标模态框 */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title= '添加监控目标';
                size= 'lg';
            >
                <div className= 'space-y-4'>
                    <Input
                        label= '名称';
                        placeholder= '输入监控目标名称';
                        value={newTarget.name || ''}'
                        onChange={(value) => setNewTarget(prev => ({ ...prev, name: value as string }))}
                        required
                    />
                    <Input
                        label= 'URL';
                        placeholder= 'https://example.com';
                        value={newTarget.url || ''}'
                        onChange={(value) => setNewTarget(prev => ({ ...prev, url: value as string }))}
                        required
                    />
                    <Select
                        label= '类型';
                        options={monitorTypeOptions}
                        value={newTarget.type || 'website'}'
                        onChange={(value) => setNewTarget(prev => ({ ...prev, type: value as any }))}
                    />
                    <div className= 'grid grid-cols-2 gap-4'>
                        <Select
                            label= '检查间隔';
                            options={intervalOptions}
                            value={newTarget.interval?.toString() || '60'}'
                            onChange={(value) => setNewTarget(prev => ({ ...prev, interval: parseInt(value as string) }))}
                        />
                        <Input
                            label= '超时时间(秒)';
                            type= 'number';
                            value={newTarget.timeout || 30}
                            onChange={(value) => setNewTarget(prev => ({ ...prev, timeout: parseInt(value as string) || 30 }))}
                            min={5}
                            max={300}
                        />
                    </div>
                    <div className= 'flex justify-end space-x-3 pt-4'>
                        <Button variant= 'ghost' onClick={() => setShowAddModal(false)}>
                            取消
                        </Button>
                        <Button variant= 'primary' onClick={handleAddTarget}>
                            添加
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 编辑监控目标模态框 */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title= '编辑监控目标';
                size= 'lg';
            >
                {selectedTarget && (<div className= 'space-y-4'>
                        <Input
                            label= '名称';
                            value={selectedTarget.name}
                            onChange={(value) => setSelectedTarget(prev => prev ? { ...prev, name: value as string } : null)}
                            required
                        />
                        <Input
                            label= 'URL';
                            value={selectedTarget.url}
                            onChange={(value) => setSelectedTarget(prev => prev ? { ...prev, url: value as string } : null)}
                            required
                        />
                        <Select
                            label= '类型';
                            options={monitorTypeOptions}
                            value={selectedTarget.type}
                            onChange={(value) => setSelectedTarget(prev => prev ? { ...prev, type: value as any } : null)}
                        />
                        <div className= 'grid grid-cols-2 gap-4'>
                            <Select
                                label= '检查间隔';
                                options={intervalOptions}
                                value={selectedTarget.interval.toString()}
                                onChange={(value) => setSelectedTarget(prev => prev ? { ...prev, interval: parseInt(value as string) } : null)}
                            />
                            <Input
                                label= '超时时间(秒)';
                                type= 'number';
                                value={selectedTarget.timeout}
                                onChange={(value) => setSelectedTarget(prev => prev ? { ...prev, timeout: parseInt(value as string) || 30 } : null)}
                                min={5}
                                max={300}
                            />
                        </div>
                        <div className= 'flex justify-end space-x-3 pt-4'>
                            <Button variant= 'ghost' onClick={() => setShowEditModal(false)}>
                                取消
                            </Button>
                            <Button variant= 'primary' onClick={handleEditTarget}>
                                保存
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MonitorDashboard;