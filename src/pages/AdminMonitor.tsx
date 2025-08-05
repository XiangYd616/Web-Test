import {
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Cpu,
    Eye,
    MemoryStick,
    Server,
    Settings,
    Shield,
    StopCircle,
    XCircle
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface SystemMetrics {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    activeTests: number;
    totalUsers: number;
    errorRate: number;
    averageResponseTime: number;
    isOverloaded: boolean;
    lastUpdate: number;
}

interface AutoProtectionConfig {
    enabled: boolean;
    errorRateThreshold: number;
    responseTimeThreshold: number;
    maxConsecutiveFailures: number;
    systemCpuThreshold: number;
    systemMemoryThreshold: number;
    autoStopEnabled: boolean;
}

interface ActiveTest {
    id: string;
    url: string;
    testType: string;
    users: number;
    duration: number;
    startTime: number;
    currentUsers: number;
    errorRate: number;
    averageResponseTime: number;
    status: 'running' | 'warning' | 'critical';
    warnings: string[];
}

const AdminMonitor: React.FC = () => {
    const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
        cpuUsage: 0,
        memoryUsage: 0,
        networkLatency: 0,
        activeTests: 0,
        totalUsers: 0,
        errorRate: 0,
        averageResponseTime: 0,
        isOverloaded: false,
        lastUpdate: Date.now()
    });

    const [autoProtection, setAutoProtection] = useState<AutoProtectionConfig>({
        enabled: true,
        errorRateThreshold: 50,
        responseTimeThreshold: 10000,
        maxConsecutiveFailures: 10,
        systemCpuThreshold: 85,
        systemMemoryThreshold: 90,
        autoStopEnabled: true
    });

    const [activeTests, setActiveTests] = useState<ActiveTest[]>([]);
    const [alerts, setAlerts] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    // 模拟系统监控数据更新
    const updateSystemMetrics = useCallback(() => {
        // 模拟实时数据（实际项目中从后端API获取）
        const totalUsers = activeTests.reduce((sum, test) => sum + test.currentUsers, 0);
        const avgErrorRate = activeTests.length > 0
            ? activeTests.reduce((sum, test) => sum + test.errorRate, 0) / activeTests.length
            : 0;
        const avgResponseTime = activeTests.length > 0
            ? activeTests.reduce((sum, test) => sum + test.averageResponseTime, 0) / activeTests.length
            : 0;

        const cpuUsage = Math.min(totalUsers * 0.1 + Math.random() * 20, 100);
        const memoryUsage = Math.min(totalUsers * 0.15 + Math.random() * 15, 100);
        const networkLatency = totalUsers * 0.5 + Math.random() * 50;

        setSystemMetrics({
            cpuUsage,
            memoryUsage,
            networkLatency,
            activeTests: activeTests.length,
            totalUsers,
            errorRate: avgErrorRate,
            averageResponseTime: avgResponseTime,
            isOverloaded: cpuUsage > autoProtection.systemCpuThreshold || memoryUsage > autoProtection.systemMemoryThreshold,
            lastUpdate: Date.now()
        });
    }, [activeTests, autoProtection]);

    // 检查自动保护规则
    const checkAutoProtection = useCallback(() => {
        if (!autoProtection.enabled) return;

        const newAlerts: string[] = [];

        // 检查系统资源
        if (systemMetrics.cpuUsage > autoProtection.systemCpuThreshold) {
            newAlerts.push(`CPU使用率过高: ${systemMetrics.cpuUsage.toFixed(1)}%`);
        }
        if (systemMetrics.memoryUsage > autoProtection.systemMemoryThreshold) {
            newAlerts.push(`内存使用率过高: ${systemMetrics.memoryUsage.toFixed(1)}%`);
        }

        // 检查测试指标
        if (systemMetrics.errorRate > autoProtection.errorRateThreshold) {
            newAlerts.push(`整体错误率过高: ${systemMetrics.errorRate.toFixed(1)}%`);
        }
        if (systemMetrics.averageResponseTime > autoProtection.responseTimeThreshold) {
            newAlerts.push(`平均响应时间过长: ${systemMetrics.averageResponseTime}ms`);
        }

        // 检查单个测试
        activeTests.forEach(test => {
            if (test.errorRate > 80) {
                newAlerts.push(`测试 ${test.id} 错误率严重: ${test.errorRate.toFixed(1)}%`);
            }
            if (test.averageResponseTime > 15000) {
                newAlerts.push(`测试 ${test.id} 响应时间严重超时: ${test.averageResponseTime}ms`);
            }
        });

        setAlerts(newAlerts);

        // 自动停止危险测试
        if (autoProtection.autoStopEnabled && newAlerts.length > 0) {
            console.warn('🚨 自动保护触发，检测到以下问题:', newAlerts);
        }
    }, [systemMetrics, autoProtection, activeTests]);

    // 模拟活跃测试数据
    useEffect(() => {
        const mockTests: ActiveTest[] = [
            {
                id: 'test-001',
                url: 'https://api.example.com',
                testType: 'stress',
                users: 500,
                duration: 300,
                startTime: Date.now() - 120000,
                currentUsers: 450,
                errorRate: 15.5,
                averageResponseTime: 2500,
                status: 'running',
                warnings: []
            },
            {
                id: 'test-002',
                url: 'https://web.example.com',
                testType: 'load',
                users: 200,
                duration: 600,
                startTime: Date.now() - 300000,
                currentUsers: 200,
                errorRate: 65.2,
                averageResponseTime: 12000,
                status: 'critical',
                warnings: ['错误率过高', '响应时间超时']
            }
        ];
        setActiveTests(mockTests);
    }, []);

    // 定时更新数据
    useEffect(() => {
        const interval = setInterval(() => {
            updateSystemMetrics();
            checkAutoProtection();
        }, 2000);

        return () => clearInterval(interval);
    }, [updateSystemMetrics, checkAutoProtection]);

    // 强制停止测试
    const forceStopTest = async (testId: string) => {
        console.log('🛑 管理员强制停止测试:', testId);
        // 实际项目中调用后端API
        setActiveTests(prev => prev.filter(test => test.id !== testId));
        setAlerts(prev => prev.filter(alert => !alert.includes(testId)));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* 页面标题 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">系统监控中心</h1>
                        <p className="text-gray-400">实时监控压力测试系统状态和自动保护</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${systemMetrics.isOverloaded ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${systemMetrics.isOverloaded ? 'bg-red-400 animate-pulse' : 'bg-green-400'
                                }`}></div>
                            <span className="text-sm">
                                {systemMetrics.isOverloaded ? '系统过载' : '系统正常'}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 系统指标卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* CPU使用率 */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Cpu className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-gray-300">CPU使用率</span>
                            </div>
                            <span className={`text-2xl font-bold ${systemMetrics.cpuUsage > 85 ? 'text-red-400' :
                                systemMetrics.cpuUsage > 70 ? 'text-yellow-400' : 'text-green-400'
                                }`}>
                                {systemMetrics.cpuUsage.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${systemMetrics.cpuUsage > 85 ? 'bg-red-500' :
                                    systemMetrics.cpuUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                style={{ width: `${Math.min(systemMetrics.cpuUsage, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* 内存使用率 */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <MemoryStick className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-gray-300">内存使用率</span>
                            </div>
                            <span className={`text-2xl font-bold ${systemMetrics.memoryUsage > 90 ? 'text-red-400' :
                                systemMetrics.memoryUsage > 75 ? 'text-yellow-400' : 'text-green-400'
                                }`}>
                                {systemMetrics.memoryUsage.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${systemMetrics.memoryUsage > 90 ? 'bg-red-500' :
                                    systemMetrics.memoryUsage > 75 ? 'bg-yellow-500' : 'bg-purple-500'
                                    }`}
                                style={{ width: `${Math.min(systemMetrics.memoryUsage, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* 活跃测试 */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-gray-300">活跃测试</span>
                            </div>
                            <span className="text-2xl font-bold text-green-400">
                                {systemMetrics.activeTests}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400">
                            总用户数: {systemMetrics.totalUsers}
                        </div>
                    </div>

                    {/* 系统警报 */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                <span className="text-sm text-gray-300">系统警报</span>
                            </div>
                            <span className={`text-2xl font-bold ${alerts.length > 0 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                {alerts.length}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400">
                            {alerts.length > 0 ? '需要关注' : '一切正常'}
                        </div>
                    </div>
                </div>

                {/* 警报面板 */}
                {alerts.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
                        <div className="flex items-center space-x-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <h3 className="text-lg font-semibold text-red-400">系统警报</h3>
                        </div>
                        <div className="space-y-2">
                            {alerts.map((alert, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                    <span className="text-red-300">{alert}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 活跃测试监控 */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 mb-8">
                    <div className="p-6 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                            <Eye className="w-5 h-5 text-blue-400" />
                            <span>活跃测试监控</span>
                        </h3>
                    </div>
                    <div className="p-6">
                        {activeTests.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>当前没有活跃的测试</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeTests.map((test) => (
                                    <div key={test.id} className={`p-4 rounded-lg border ${test.status === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                        test.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                            'bg-gray-700/50 border-gray-600'
                                        }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${test.status === 'critical' ? 'bg-red-400 animate-pulse' :
                                                    test.status === 'warning' ? 'bg-yellow-400 animate-pulse' :
                                                        'bg-green-400'
                                                    }`}></div>
                                                <div>
                                                    <div className="font-medium text-white">{test.id}</div>
                                                    <div className="text-sm text-gray-400">{test.url}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-300">
                                                        {test.currentUsers}/{test.users} 用户
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {Math.floor((Date.now() - test.startTime) / 1000)}s / {test.duration}s
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => forceStopTest(test.id)}
                                                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                                    title="强制停止测试"
                                                >
                                                    <StopCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-3">
                                            <div className="text-center">
                                                <div className={`text-lg font-bold ${test.errorRate > 50 ? 'text-red-400' :
                                                    test.errorRate > 20 ? 'text-yellow-400' : 'text-green-400'
                                                    }`}>
                                                    {test.errorRate.toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-gray-400">错误率</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`text-lg font-bold ${test.averageResponseTime > 10000 ? 'text-red-400' :
                                                    test.averageResponseTime > 5000 ? 'text-yellow-400' : 'text-green-400'
                                                    }`}>
                                                    {test.averageResponseTime}ms
                                                </div>
                                                <div className="text-xs text-gray-400">响应时间</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-blue-400">
                                                    {test.testType}
                                                </div>
                                                <div className="text-xs text-gray-400">测试类型</div>
                                            </div>
                                        </div>

                                        {test.warnings.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {test.warnings.map((warning, index) => (
                                                    <span key={index} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                                                        {warning}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 自动保护设置 */}
                {showSettings && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 mb-8">
                        <div className="p-6 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                                <Shield className="w-5 h-5 text-green-400" />
                                <span>自动保护设置</span>
                            </h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* 启用自动保护 */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-white">启用自动保护</div>
                                    <div className="text-sm text-gray-400">自动监控并保护系统免受过载</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoProtection.enabled}
                                        onChange={(e) => setAutoProtection(prev => ({
                                            ...prev,
                                            enabled: e.target.checked
                                        }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            {/* 阈值设置 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        错误率阈值 (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={autoProtection.errorRateThreshold}
                                        onChange={(e) => setAutoProtection(prev => ({
                                            ...prev,
                                            errorRateThreshold: parseInt(e.target.value) || 0
                                        }))}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        响应时间阈值 (ms)
                                    </label>
                                    <input
                                        type="number"
                                        value={autoProtection.responseTimeThreshold}
                                        onChange={(e) => setAutoProtection(prev => ({
                                            ...prev,
                                            responseTimeThreshold: parseInt(e.target.value) || 0
                                        }))}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                        min="1000"
                                        max="60000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        CPU使用率阈值 (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={autoProtection.systemCpuThreshold}
                                        onChange={(e) => setAutoProtection(prev => ({
                                            ...prev,
                                            systemCpuThreshold: parseInt(e.target.value) || 0
                                        }))}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                        min="50"
                                        max="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        内存使用率阈值 (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={autoProtection.systemMemoryThreshold}
                                        onChange={(e) => setAutoProtection(prev => ({
                                            ...prev,
                                            systemMemoryThreshold: parseInt(e.target.value) || 0
                                        }))}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                        min="50"
                                        max="100"
                                    />
                                </div>
                            </div>

                            {/* 自动停止设置 */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-white">自动停止危险测试</div>
                                    <div className="text-sm text-gray-400">当检测到严重问题时自动停止测试</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoProtection.autoStopEnabled}
                                        onChange={(e) => setAutoProtection(prev => ({
                                            ...prev,
                                            autoStopEnabled: e.target.checked
                                        }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* 系统状态总览 */}
                <div className="bg-gray-800 rounded-xl border border-gray-700">
                    <div className="p-6 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                            <Server className="w-5 h-5 text-purple-400" />
                            <span>系统状态总览</span>
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className={`text-3xl font-bold mb-2 ${systemMetrics.isOverloaded ? 'text-red-400' : 'text-green-400'
                                    }`}>
                                    {systemMetrics.isOverloaded ? (
                                        <XCircle className="w-12 h-12 mx-auto" />
                                    ) : (
                                        <CheckCircle className="w-12 h-12 mx-auto" />
                                    )}
                                </div>
                                <div className="text-lg font-semibold text-white">
                                    {systemMetrics.isOverloaded ? '系统过载' : '系统正常'}
                                </div>
                                <div className="text-sm text-gray-400">
                                    最后更新: {new Date(systemMetrics.lastUpdate).toLocaleTimeString()}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-400 mb-2">
                                    {systemMetrics.networkLatency.toFixed(0)}ms
                                </div>
                                <div className="text-lg font-semibold text-white">网络延迟</div>
                                <div className="text-sm text-gray-400">平均响应时间</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400 mb-2">
                                    {autoProtection.enabled ? '已启用' : '已禁用'}
                                </div>
                                <div className="text-lg font-semibold text-white">自动保护</div>
                                <div className="text-sm text-gray-400">
                                    {autoProtection.enabled ? '系统受保护' : '需要手动监控'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMonitor;
