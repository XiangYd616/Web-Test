
import {AlertCircle, AlertTriangle, BarChart3, CheckCircle, Clock, Download, FileText, Globe, Loader, Play, RotateCcw, Settings, Shield, Square, TrendingUp, Users, XCircle, Zap} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {useLocation} from 'react-router-dom';
import {useAuthCheck} from '../../../components/auth/WithAuthCheck.tsx';
import {StressTestCharts as StressTestCharts} from '../../../components/charts/index';
import StressTestHistory from '../../../components/testing/StressTestHistory.tsx';
import URLInput from '../../../components/testing/URLInput';
import CancelProgressFeedback from '../../../components/ui/CancelProgressFeedback.tsx';
import CancelTestConfirmDialog from '../../../components/ui/CancelTestConfirmDialog.tsx';
import ExportModal from '../../../components/ui/ExportModal.tsx';
import {useLocalStressTest} from '../../../hooks/useLocalStressTest.ts';
import {StressTestConfig as ImportedAdvancedStressTestConfig} from '../../../hooks/useSimpleTestEngine.ts';
import {useStressTestRecord} from '../../../hooks/useStressTestRecord.ts';
import {useUserStats} from '../../../hooks/useUserStats.ts';
import backgroundTestManager from '../../../services/testing/backgroundTestManager.ts';
import ExportUtils from '../../../utils/exportUtils.ts';

import {systemResourceMonitor} from '../../../services/system/systemResourceMonitor.ts';
import {testEngineManager} from '../../../services/testing/testEngines.ts';
import {TestPhase} from '../../../services/testing/testStateManager';
// import {getTemplateById} from '../../../services/testTemplates.ts'; // 函数不存在，已注释
import '../../../styles/progress-bar.css';
import type { TestStatusType } from '../../../types/testHistory.ts';

// 工具函数：安全地从URL获取主机名
const getHostnameFromUrl = (url: string): string => {
    if (!url || url.trim() === '') {
        return '';
    }
    try {
        return new URL(url).hostname;
    } catch {
        return url; // 如果URL无效，返回原始字符串
    }
};

// 本地配置接口，继承导入的配置
interface StressTestConfig extends ImportedAdvancedStressTestConfig {
    // 代理设置
    proxy?: {
        enabled: boolean;
        type: 'http' | 'https' | 'socks5';
        host: string;
        port: number;
        username?: string;
        password?: string;
    };

}

// 生命周期压力测试配置接口 - 直接使用 StressTestConfig
type LifecycleStressTestConfig = StressTestConfig;

const StressTest: React.FC = () => {
    // 路由状态检查
    const location = useLocation();

    // 登录检查
    const {
        isAuthenticated,
        requireLogin,
        LoginPromptComponent
    } = useAuthCheck({
        feature: "压力测试",
        description: "使用压力测试功能"
    });

    // 用户统计
    const { recordTestCompletion } = useUserStats();

    // 本地压力测试（桌面版专用）
    const localStressTest = useLocalStressTest();

    const {
        currentRecord,
        startRecording,
        completeRecord,
        failRecord,
        cancelRecord,
        startFromWaitingRecord,

        // 队列管理
        queueStats,
        currentQueueId,
        enqueueTest,
        cancelQueuedTest,
        getQueuePosition,
        estimateWaitTime
    } = useStressTestRecord({
        autoLoad: false // 不自动加载，由历史组件管理
    });

    const [testConfig, setTestConfig] = useState<StressTestConfig>({
        url: '', // 用户自定义测试URL
        users: 10,
        duration: 30,
        rampUp: 5,
        testType: 'gradual',
        method: 'GET',
        timeout: 10,
        thinkTime: 1,
        warmupDuration: 5,
        cooldownDuration: 5,
        headers: {},
        body: '',
        proxy: {
            enabled: false,
            type: 'http',
            host: '',
            port: 8080,
            username: '',
            password: ''
        },

    });

    // 🔧 简化数据状态管理 - 只使用一个主要数据源
    const [stressTestData, setStressTestData] = useState<TestDataPoint[]>([]);  // 唯一数据源：压力测试实时数据
    const [finalResultData, setFinalResultData] = useState<TestDataPoint[]>([]);
    const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);  // 实时指标
    const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
    const [testProgress, setTestProgress] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [result, setResult] = useState<any>(null);

    // 新的取消功能状态
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showCancelProgress, setShowCancelProgress] = useState(false);
    const [cancelInProgress, setCancelInProgress] = useState(false);

    const [error, setError] = useState<string>('');

    const [testTimeoutTimer, setTestTimeoutTimer] = useState<NodeJS.Timeout | null>(null);

    // 本地测试模式状态
    const [useLocalTest, setUseLocalTest] = useState(false);
    const [localTestRecommendation, setLocalTestRecommendation] = useState<string>('');

    // 快速代理设置显示状态
    const [showQuickProxySettings, setShowQuickProxySettings] = useState(false);

    // 统一的生命周期管理器 - 集成队列系统
    const [lifecycleManager] = useState<any>(() => {
        // 创建统一的生命周期管理器
        return {
            startTest: async (config: any) => {
                setCurrentStatus('STARTING');
                setStatusMessage('正在检查系统资源和队列状态...');

                try {
                    // 首先创建测试记录
                    const recordId = await startRecording({
                        testName: `压力测试 - ${new URL(config.url).hostname}`,
                        url: config.url,
                        config: config,
                        status: 'idle' // 🔧 简化：使用idle作为初始状态
                    });
                    setCurrentRecordId(recordId);

                    // 检查是否需要排队
                    const canStartImmediately = queueStats.totalRunning < 3 &&
                        (systemResourceMonitor?.canStartNewTest() !== false);

                    if (canStartImmediately) {
                        // 可以立即启动
                        setCurrentStatus('STARTING');
                        setStatusMessage('正在启动压力测试引擎...');

                        // 直接调用API启动测试
                        const response = await fetch('/api/test/stress', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                            },
                            body: JSON.stringify({
                                ...config,
                                recordId: recordId,
                                // 🌐 代理设置
                                proxy: config.proxy?.enabled ? {
                                    enabled: true,
                                    type: config.proxy.type || 'http',
                                    host: config.proxy.host || '',
                                    port: config.proxy.port || 8080,
                                    username: config.proxy.username || '',
                                    password: config.proxy.password || ''
                                } : {
                                    enabled: false
                                }
                            })
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const result = await response.json();

                        // 🔧 修复：提取testId并设置状态
                        const testId = result.testId || result.data?.testId;
                        if (testId) {
                            setCurrentTestId(testId);

                            // 立即尝试加入WebSocket房间
                            const socket = socketRef.current;
                            if (socket && socket.connected) {
                                joinWebSocketRoom(testId);
                            }

                            // 启动测试超时检查
                            lifecycleManager.startTestTimeoutCheck(config.duration || 60);
                        }

                        return result;
                    } else {
                        // 需要排队
                        setCurrentStatus('PENDING');
                        setStatusMessage('测试已加入队列，等待执行...');

                        // 加入队列
                        const queueId = await enqueueTest({
                            testName: `压力测试 - ${new URL(config.url).hostname}`,
                            url: config.url,
                            testType: 'stress', // 明确标识为压力测试
                            config: {
                                users: config.users,
                                duration: config.duration,
                                rampUpTime: config.rampUp || 10,
                                testType: config.testType === 'stress' ? 'gradual' :
                                    config.testType === 'load' ? 'constant' :
                                        config.testType === 'volume' ? 'spike' : 'gradual',
                                method: config.method,
                                timeout: config.timeout,
                                thinkTime: config.thinkTime,
                                warmupDuration: config.warmupDuration,
                                cooldownDuration: config.cooldownDuration,
                                headers: config.headers,
                                body: config.body,
                                // 🌐 代理设置
                                proxy: config.proxy?.enabled ? {
                                    enabled: true,
                                    type: config.proxy.type || 'http',
                                    host: config.proxy.host || '',
                                    port: config.proxy.port || 8080,
                                    username: config.proxy.username || '',
                                    password: config.proxy.password || ''
                                } : {
                                    enabled: false
                                }
                            }
                        }, 'high'); // 压力测试使用高优先级

                        return recordId;
                    }

                } catch (error) {
                    console.error('❌ 生命周期管理器测试启动失败:', error);
                    setCurrentStatus('FAILED');
                    setStatusMessage('测试启动失败');
                    throw error;
                }
            },

            // 直接启动测试的方法
            startTestDirectly: async (config: any, recordId: string) => {
                const response = await fetch('/api/test/stress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify({
                        ...config,
                        recordId: recordId,
                        // 🌐 代理设置
                        proxy: config.proxy?.enabled ? {
                            enabled: true,
                            type: config.proxy.type || 'http',
                            host: config.proxy.host || '',
                            port: config.proxy.port || 8080,
                            username: config.proxy.username || '',
                            password: config.proxy.password || ''
                        } : {
                            enabled: false
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                setCurrentStatus('WAITING');
                setStatusMessage('等待测试开始...');

                const testId = result.testId || result.data?.testId || recordId;
                if (testId) {
                    setCurrentTestId(testId);
                }

                return testId;
            },

            cancelTest: async (reason: string) => {

                setCurrentStatus('CANCELLING');
                setStatusMessage('正在取消测试...');

                // 清理超时检查
                lifecycleManager.clearTestTimeoutCheck();

                try {
                    // 🔧 修复：优先使用ref，然后是state，最后尝试从WebSocket数据中获取
                    let testIdToCancel = currentTestIdRef.current || currentTestId;

                    // 如果都没有，尝试从最近的WebSocket数据中获取testId
                    if (!testIdToCancel && stressTestData.length > 0) {
                        const lastDataPoint = stressTestData[stressTestData.length - 1];
                        if (lastDataPoint && lastDataPoint.testId) {
                            testIdToCancel = lastDataPoint.testId;

                        }
                    }



                    if (testIdToCancel) {


                        try {
                            const response = await fetch(`/api/test/stress/cancel/${testIdToCancel}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                },
                                body: JSON.stringify({ reason }),
                                // timeout: 10000 // fetch API不支持timeout，使用AbortController代替
                            });

                            if (!response.ok) {
                                console.warn(`⚠️ 后端取消API返回错误状态: ${response.status}`);
                                // 即使后端返回错误，也继续设置本地状态
                            } else {
                                const result = await response.json();
                                console.log('✅ 后端取消成功:', result);
                            }
                        } catch (fetchError: any) {
                            console.warn('⚠️ 后端取消API调用失败，继续设置本地状态:', fetchError.message);
                            // 不抛出错误，继续执行本地状态设置
                        }

                        // 无论后端API是否成功，都设置本地取消状态
                        console.log('🔄 设置本地取消状态...');
                        setCurrentStatus('CANCELLED');
                        setStatusMessage('测试已取消');
                        setTestStatus('cancelled');
                        setIsRunning(false);
                        setCanSwitchPages(true);

                        return true;
                    } else {
                        // 没有测试ID，只设置本地状态
                        console.log('⚠️ 没有测试ID，只设置本地取消状态');
                        setCurrentStatus('CANCELLED');
                        setStatusMessage('测试已取消');
                        setTestStatus('cancelled');
                        setIsRunning(false);
                        setCanSwitchPages(true);
                        return true;
                    }
                } catch (error: any) {
                    console.error('❌ 取消测试失败:', error);
                    setCurrentStatus('FAILED');
                    setStatusMessage('取消测试失败');
                    throw error;
                }
            },
            setTestId: (testId: string) => {
                console.log('🔑 生命周期管理器设置测试ID:', testId);
                setCurrentTestId(testId);
            },

            // 启动测试超时检查
            startTestTimeoutCheck: (durationSeconds: number) => {
                console.log(`⏰ 启动测试超时检查，预期持续时间: ${durationSeconds}秒`);

                // 清理之前的定时器
                if (testTimeoutTimer) {
                    clearTimeout(testTimeoutTimer);
                }

                // 设置超时时间为预期时间的1.5倍，给一些缓冲时间
                const timeoutMs = durationSeconds * 1000 * 1.5;

                const timer = setTimeout(async () => {
                    console.log('⚠️ 测试超时，自动取消测试');

                    // 检查测试是否仍在运行
                    if (isRunning && testStatus !== 'cancelled' && testStatus !== 'completed') {
                        console.log('🛑 测试超时，执行自动取消');
                        setStatusMessage('测试超时，正在自动取消...');

                        try {
                            await lifecycleManager.cancelTest('测试执行超时');
                        } catch (error) {
                            console.error('❌ 自动取消测试失败:', error);
                            // 强制设置本地状态
                            setIsRunning(false);
                            setTestStatus('cancelled');
                            setCurrentStatus('CANCELLED');
                            setStatusMessage('测试超时已取消');
                        }
                    }
                }, timeoutMs);

                setTestTimeoutTimer(timer);
                console.log(`⏰ 测试超时检查已设置，将在 ${timeoutMs}ms 后检查`);
            },

            // 清理超时检查
            clearTestTimeoutCheck: () => {
                if (testTimeoutTimer) {
                    clearTimeout(testTimeoutTimer);
                    setTestTimeoutTimer(null);
                    console.log('⏰ 测试超时检查已清理');
                }
            }
        };
    });
    const [currentStatus, setCurrentStatus] = useState<any>('IDLE'); // TestStatus.IDLE
    const [statusMessage, setStatusMessage] = useState<string>('准备开始测试');

    // 标签页状态
    const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

    // 用于跟踪是否已经显示过预填配置提示
    const hasShownPrefilledAlert = useRef(false);

    // 处理从详细页面返回时的状态和预填配置
    useEffect(() => {
        if (location.state) {
            const state = location.state as any;

            // 处理标签页状态
            if (state.activeTab) {
                setActiveTab(state.activeTab);
            }

            // 处理预填配置
            if (state.prefilledConfig) {
                const config = state.prefilledConfig;

                setTestConfig(prev => ({
                    ...prev,
                    ...(config.url && { url: config.url }),
                    ...(config.users && { users: Number(config.users) }),
                    ...(config.duration && { duration: Number(config.duration) }),
                    ...(config.rampUp && { rampUp: Number(config.rampUp) }),
                    ...(config.rampUpTime && { rampUp: Number(config.rampUpTime) }),
                    ...(config.testType && { testType: config.testType }),
                    ...(config.method && { method: config.method }),
                    ...(config.timeout && { timeout: Number(config.timeout) }),
                    ...(config.thinkTime && { thinkTime: Number(config.thinkTime) }),
                    ...(config.warmupDuration && { warmupDuration: Number(config.warmupDuration) }),
                    ...(config.cooldownDuration && { cooldownDuration: Number(config.cooldownDuration) })
                }));

                // 如果有预填配置，切换到测试标签页
                setActiveTab('test');

                // 立即清除状态，避免重复触发
                window.history.replaceState({}, document.title);

                // 显示提示信息（只显示一次）
                if (!hasShownPrefilledAlert.current) {
                    hasShownPrefilledAlert.current = true;
                    setTimeout(() => {
                        alert('已应用之前的测试配置，您可以直接开始测试或修改配置后再测试。');
                    }, 100);
                }
            } else {
                // 如果没有预填配置，也清除状态
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state]);

    // 统一的数据处理函数
    const processDataPoint = useCallback((rawPoint: any, isRealTime: boolean = true): TestDataPoint => {
        const timestamp = rawPoint.timestamp || Date.now();
        const processedPoint: TestDataPoint = {
            timestamp: timestamp,
            responseTime: rawPoint.responseTime || 0,
            throughput: rawPoint.throughput || rawPoint.rps || 1,
            activeUsers: rawPoint.activeUsers || rawPoint.users || 0,
            errorRate: rawPoint.errorRate || (rawPoint.success === false ? 100 : 0),
            phase: rawPoint.phase === 'rampup' ? TestPhase.RAMP_UP :
                rawPoint.phase === 'rampdown' ? TestPhase.RAMP_DOWN :
                    TestPhase.STEADY_STATE,
            status: rawPoint.status || (rawPoint.success === false ? 500 : 200),
            success: rawPoint.success ?? true,
            // 添加图表组件需要的额外字段
            errorType: rawPoint.error ? 'HTTP_ERROR' : undefined,
            connectionTime: rawPoint.connectionTime || 30,
            dnsTime: rawPoint.dnsTime || 15
        };

        console.log(`📊 处理数据点 (${isRealTime ? '实时' : '最终'})`, processedPoint);
        return processedPoint;
    }, []);

    // 🔧 统一的指标计算函数
    const calculateMetricsFromData = useCallback((data: TestDataPoint[]): RealTimeMetrics => {
        if (!data || data.length === 0) {
            return {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                currentTPS: 0,
                peakTPS: 0,
                throughput: 0,
                errorRate: 0,
                activeUsers: 0,
                timestamp: Date.now(),
                p95ResponseTime: 0,
                p99ResponseTime: 0
            };
        }

        const totalRequests = data.length;
        const successfulRequests = data.filter(d => d.success !== false).length;
        const failedRequests = totalRequests - successfulRequests;
        const responseTimes = data.map(d => d.responseTime || 0).filter(t => t > 0);

        const averageResponseTime = responseTimes.length > 0 ?
            Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length) : 0;

        const errorRate = totalRequests > 0 ? ((failedRequests / totalRequests) * 100) : 0;

        // 计算当前TPS（基于最近5秒的数据）
        let currentTPS = 0;
        if (data.length > 0) {
            const now = Date.now();
            const recentData = data.filter(d => (now - new Date(d.timestamp).getTime()) < 5000);

            if (recentData.length > 1) {
                // 计算最近数据的时间跨度
                const timestamps = recentData.map(d => new Date(d.timestamp).getTime()).sort((a, b) => a - b);
                const timeSpanMs = timestamps[timestamps.length - 1] - timestamps[0];
                const timeSpanSeconds = Math.max(timeSpanMs / 1000, 1); // 至少1秒

                // TPS = 最近请求数 / 时间跨度（秒）
                currentTPS = Math.round(recentData.length / timeSpanSeconds);
            } else if (recentData.length === 1) {
                // 只有一个数据点，估算TPS
                currentTPS = 1;
            }

            console.log('📊 当前TPS计算:', {
                totalDataPoints: data.length,
                recentDataPoints: recentData.length,
                calculatedTPS: currentTPS
            });
        }

        // 🔧 修复：计算平均TPS（基于整个测试期间的数据）
        let averageTPS = 0;
        if (data.length > 1) {
            // 计算整个测试期间的时间跨度
            const allTimestamps = data.map(d => new Date(d.timestamp).getTime()).sort((a, b) => a - b);
            const totalTimeSpanMs = allTimestamps[allTimestamps.length - 1] - allTimestamps[0];
            const totalTimeSpanSeconds = Math.max(totalTimeSpanMs / 1000, 1); // 至少1秒

            // 平均TPS = 总请求数 / 总时间跨度（秒）
            averageTPS = Math.round((data.length / totalTimeSpanSeconds) * 10) / 10; // 保留1位小数

            console.log('📊 平均TPS计算:', {
                totalDataPoints: data.length,
                totalTimeSpanSeconds: totalTimeSpanSeconds,
                calculatedAverageTPS: averageTPS
            });
        } else if (data.length === 1) {
            // 只有一个数据点，平均TPS等于当前TPS
            averageTPS = currentTPS;
        }

        // 计算P95和P99响应时间
        const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
        const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
        const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
        const p95ResponseTime = sortedResponseTimes[p95Index] || averageResponseTime;
        const p99ResponseTime = sortedResponseTimes[p99Index] || averageResponseTime;

        // 计算活跃用户数（取最新数据点的用户数）
        const activeUsers = data.length > 0 ? data[data.length - 1].activeUsers : 0;

        return {
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime,
            currentTPS,
            peakTPS: Math.max(metrics?.peakTPS || 0, currentTPS),
            throughput: averageTPS, // 🔧 修复：使用正确的平均TPS
            errorRate: parseFloat(errorRate.toFixed(2)),
            activeUsers,
            timestamp: Date.now(),
            p95ResponseTime: Math.round(p95ResponseTime),
            p99ResponseTime: Math.round(p99ResponseTime)
        };
    }, [metrics?.peakTPS]);

    // 🔧 简化的数据更新函数 - 只使用stressTestData
    const updateChartData = useCallback((newPoints: any[], isRealTime: boolean = true) => {
        const processedPoints = newPoints.map(point => processDataPoint(point, isRealTime));

        if (isRealTime) {
            // 实时数据：追加到压力测试数据，用于实时监控视图
            setStressTestData(prev => {
                const combined = [...prev, ...processedPoints];
                console.log(`🔄 压力测试数据更新: ${prev.length} -> ${combined.length}`);

                // 🔧 修复：只有在没有后端指标数据时才重新计算
                let currentMetrics: RealTimeMetrics | null = null;
                setMetrics((prevMetrics: RealTimeMetrics | null) => {
                    // 如果已有后端提供的指标数据，保持不变
                    if (prevMetrics && prevMetrics.totalRequests > 0 && typeof prevMetrics.currentTPS === 'number') {
                        console.log('📊 保持后端提供的指标数据:', prevMetrics);
                        currentMetrics = prevMetrics;
                        return prevMetrics;
                    }

                    // 否则使用前端计算的指标
                    const newMetrics = calculateMetricsFromData(combined);
                    console.log('📊 使用前端计算的指标:', newMetrics);
                    currentMetrics = newMetrics;
                    return newMetrics;
                });

                // 更新结果状态
                if (currentMetrics) {
                    setResult((prev: any) => ({
                        ...prev,
                        metrics: currentMetrics,
                        status: 'running',
                        message: '测试正在运行中...'
                    }));
                }

                // 🔧 修复：更宽松的数据保留策略，确保完整测试数据不被截断
                const testDurationSeconds = testConfig.duration || 30;
                const totalTestTime = testDurationSeconds + (testConfig.rampUp || 0) +
                    (testConfig.warmupDuration || 0) + (testConfig.cooldownDuration || 0);

                // 根据测试总时长计算合理的数据点上限 (0.1秒间隔 = 每秒10个数据点)
                const dataPointsPerSecond = 10; // 0.1秒间隔 = 每秒10个数据点
                const expectedDataPoints = totalTestTime * dataPointsPerSecond; // 基于时间间隔计算
                const maxDataPoints = Math.max(expectedDataPoints, 50000); // 提高到50000个数据点以支持高精度

                console.log('📊 数据保留策略:', {
                    testDuration: testDurationSeconds,
                    totalTestTime,
                    users: testConfig.users,
                    expectedDataPoints,
                    maxDataPoints,
                    currentDataPoints: combined.length
                });

                // 只有当数据点数量远超预期时才进行裁剪（更宽松的条件）
                if (combined.length > maxDataPoints * 1.5) { // 超过预期50%才裁剪
                    const keepPoints = Math.floor(maxDataPoints * 0.9); // 保留90%的数据
                    console.log(`📊 数据点过多（${combined.length} > ${maxDataPoints * 1.5}），裁剪至 ${keepPoints} 个数据点`);
                    return combined.slice(-keepPoints);
                }

                console.log('📊 保留所有数据点:', combined.length);
                return combined;
            });
        } else {
            // 最终结果：设置为独立的聚合数据，用于测试结果视图
            setFinalResultData(processedPoints);
            console.log(`🏁 最终结果数据设置: ${processedPoints.length} 个数据点`);
        }
    }, [processDataPoint, calculateMetricsFromData]);

    // 🔧 修复：转换 TestDataPoint 到 RealTimeData 格式
    const convertToEnhancedRealTimeData = useCallback((dataPoints: TestDataPoint[]) => {
        return dataPoints.map(point => ({
            timestamp: typeof point.timestamp === 'string' ? new Date(point.timestamp).getTime() : point.timestamp,
            responseTime: point.responseTime,
            status: point.status,
            success: point.success,
            activeUsers: point.activeUsers,
            throughput: point.throughput,
            errorType: point.errorType,
            connectionTime: point.connectionTime || 30,
            dnsTime: point.dnsTime || 15,
            phase: point.phase === TestPhase.RAMP_UP ? 'rampup' :
                point.phase === TestPhase.RAMP_DOWN ? 'rampdown' :
                    'steady'
        }));
    }, []);

    // 获取测试结果的函数
    const fetchTestResults = useCallback(async (testId: string) => {
        try {
            console.log('🔍 获取测试结果:', testId);
            const response = await fetch(`/api/test/stress/status/${testId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const statusData = await response.json();
                console.log('📊 测试结果数据:', statusData);

                if (statusData.success && statusData.data) {
                    console.log('🔍 处理测试结果数据:', {
                        hasMetrics: !!statusData.data.metrics,
                        hasRealTimeMetrics: !!statusData.data.realTimeMetrics,
                        hasRealTimeData: !!statusData.data.realTimeData,
                        dataLength: statusData.data.realTimeData?.length || 0
                    });

                    // 设置完整的测试结果对象
                    setResult(statusData.data);
                    console.log('✅ 设置测试结果对象:', statusData.data);

                    // 设置基本指标 - 优先使用 metrics，然后是 realTimeMetrics
                    const metricsToUse = statusData.data.metrics || statusData.data.realTimeMetrics;
                    if (metricsToUse) {
                        setMetrics(metricsToUse);
                        console.log('✅ 设置指标数据:', metricsToUse);
                    }

                    // 如果有实时数据，处理并显示
                    if (statusData.data.realTimeData && statusData.data.realTimeData.length > 0) {
                        console.log('📈 设置实时数据:', statusData.data.realTimeData.length, '条');
                        setRealTimeData(statusData.data.realTimeData);

                        // 处理数据点用于图表显示
                        const processedData = statusData.data.realTimeData.map((point: any) => processDataPoint(point, false));
                        setFinalResultData(processedData);
                        setStressTestData(processedData); // 设置到主要数据源

                        console.log('✅ 测试结果数据已加载');
                    }

                    // 视图会根据测试状态自动切换到测试结果
                }
            }
        } catch (error) {
            console.error('❌ 获取测试结果失败:', error);
        }
    }, [processDataPoint]);

    // WebSocket相关状态
    const socketRef = useRef<any>(null);
    const [currentTestId, setCurrentTestId] = useState<string | null>(null);
    const currentTestIdRef = useRef<string>(''); // 用于在事件监听器中获取最新的testId

    // 页面加载时检查是否有正在运行的测试，防止自动重启
    useEffect(() => {
        const checkRunningTests = async () => {
            try {
                // 检查localStorage中是否有保存的测试状态
                const savedTestId = localStorage.getItem('currentStressTestId');
                const savedTestStatus = localStorage.getItem('currentStressTestStatus');

                if (savedTestId && savedTestStatus) {
                    console.log('🔍 检测到保存的测试状态:', { savedTestId, savedTestStatus });

                    // 如果状态是运行中或已完成，检查后端状态
                    if (savedTestStatus === 'running' || savedTestStatus === 'starting' || savedTestStatus === 'completed') {
                        try {
                            const response = await fetch(`/api/test/stress/status/${savedTestId}`, {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                }
                            });

                            if (response.ok) {
                                const statusData = await response.json();
                                if (statusData.success && statusData.data?.status === 'running') {
                                    console.log('✅ 检测到正在运行的测试，恢复状态');
                                    setCurrentTestId(savedTestId);
                                    setTestStatus('running');
                                    setIsRunning(true);
                                    setCurrentStatus('RUNNING');
                                    setStatusMessage('测试正在运行中...');
                                } else if (statusData.success && statusData.data?.status === 'completed') {
                                    console.log('✅ 检测到已完成的测试，加载测试结果');
                                    // 不清理状态，而是加载测试结果
                                    setCurrentTestId(savedTestId);
                                    setTestStatus('completed');
                                    setIsRunning(false);
                                    setCurrentStatus('COMPLETED');
                                    setStatusMessage('测试已完成');
                                    setTestProgress('压力测试完成！');

                                    // 获取测试结果数据
                                    if (statusData.data.realTimeMetrics) {
                                        setMetrics(statusData.data.realTimeMetrics);
                                    }

                                    // 尝试获取完整的测试结果
                                    fetchTestResults(savedTestId);
                                } else {
                                    console.log('🧹 后端测试状态异常，清理本地状态');
                                    localStorage.removeItem('currentStressTestId');
                                    localStorage.removeItem('currentStressTestStatus');

                                    // 🔧 修复：重置React状态
                                    setTestStatus('idle');
                                    setIsRunning(false);
                                    setCurrentStatus('IDLE');
                                    setStatusMessage('准备开始测试');
                                    setTestProgress('');
                                }
                            } else {
                                console.log('🧹 无法获取测试状态，清理本地状态');
                                localStorage.removeItem('currentStressTestId');
                                localStorage.removeItem('currentStressTestStatus');

                                // 🔧 修复：重置React状态
                                setTestStatus('idle');
                                setIsRunning(false);
                                setCurrentStatus('IDLE');
                                setStatusMessage('准备开始测试');
                                setTestProgress('');
                            }
                        } catch (error) {
                            console.warn('⚠️ 检查测试状态失败:', error);
                            localStorage.removeItem('currentStressTestId');
                            localStorage.removeItem('currentStressTestStatus');

                            // 🔧 修复：重置React状态
                            setTestStatus('idle');
                            setIsRunning(false);
                            setCurrentStatus('IDLE');
                            setStatusMessage('准备开始测试');
                            setTestProgress('');
                        }
                    } else {
                        // 如果状态不是运行中，清理保存的状态
                        localStorage.removeItem('currentStressTestId');
                        localStorage.removeItem('currentStressTestStatus');

                        // 🔧 修复：重置React状态
                        setTestStatus('idle');
                        setIsRunning(false);
                        setCurrentStatus('IDLE');
                        setStatusMessage('准备开始测试');
                        setTestProgress('');
                    }
                }
            } catch (error) {
                console.error('❌ 检查运行中测试失败:', error);
            }
        };

        checkRunningTests();
    }, []); // 只在组件挂载时执行一次

    // 同步currentTestId到ref
    useEffect(() => {

        currentTestIdRef.current = currentTestId || '';


        // 保存测试ID到localStorage
        if (currentTestId) {
            localStorage.setItem('currentStressTestId', currentTestId);
        } else {
            localStorage.removeItem('currentStressTestId');
        }
    }, [currentTestId]);

    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

    // 实时数据状态
    const [realTimeData, setRealTimeData] = useState<any[]>([]);

    // 房间加入状态管理
    const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());

    const dataCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 启动真实的压力测试
    const startRealStressTest = async () => {
        // 检查登录状态 - 要求登录
        if (!requireLogin()) {
            return;
        }

        if (!testConfig.url.trim()) {
            setError('请输入测试 URL');
            return;
        }

        setError('');
        updateTestStatus('starting', '正在初始化压力测试...');
        setTestProgress('正在初始化压力测试...');
        setStressTestData([]);  // 🔧 清理唯一数据源
        setMetrics(null);
        setResult(null);
        setIsRunning(true);
        // 🔧 修复：不要在测试开始时清空testId！这会导致WebSocket数据无法匹配
        // setCurrentTestId(null);
        setCurrentRecordId(null); // 重置记录ID

        // 创建测试记录 - 使用新的历史记录API
        let recordId: string | null = null;
        try {
            const response = await fetch('/api/test/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    testName: `压力测试 - ${new URL(testConfig.url.trim()).hostname}`,
                    testType: 'stress',
                    url: testConfig.url.trim(),
                    status: 'idle', // 🔧 简化：使用idle作为初始状态
                    config: {
                        users: testConfig.users,
                        duration: testConfig.duration,
                        rampUpTime: testConfig.rampUp,
                        testType: testConfig.testType,
                        method: testConfig.method,
                        timeout: testConfig.timeout,
                        thinkTime: testConfig.thinkTime,
                        warmupDuration: testConfig.warmupDuration,
                        cooldownDuration: testConfig.cooldownDuration,
                        // 🌐 代理设置
                        proxy: testConfig.proxy?.enabled ? {
                            enabled: true,
                            type: testConfig.proxy.type || 'http',
                            host: testConfig.proxy.host || '',
                            port: testConfig.proxy.port || 8080,
                            username: testConfig.proxy.username || '',
                            password: testConfig.proxy.password || ''
                        } : {
                            enabled: false
                        }
                    },
                    tags: ['stress-test', 'automated'],
                    environment: 'production'
                })
            });

            const recordData = await response.json();
            if (recordData.success) {
                recordId = recordData.data.id;
                setCurrentRecordId(recordId); // 保存记录ID到状态
                console.log('📝 创建测试记录成功:', recordId);
            } else {
                throw new Error(recordData.message || '创建测试记录失败');
            }
        } catch (recordError) {
            console.warn('创建测试记录失败:', recordError);
            // 继续执行测试，不因记录失败而中断
        }

        // 开始主要的压力测试逻辑
        try {
            // 如果有记录ID，先更新状态为运行中
            if (recordId) {
                try {
                    await fetch(`/api/test/history/${recordId}/start`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(localStorage.getItem('auth_token') ? {
                                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                            } : {})
                        }
                    });
                    console.log('📊 测试状态已更新为运行中');
                } catch (statusError) {
                    console.warn('更新测试状态失败:', statusError);
                }
            }

            // ✅ 时序修复：生成测试ID但暂不设置，等后端确认后再设置
            const realTestId = `stress_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            console.log('🔑 前端生成测试ID:', realTestId);
            console.log('⏳ 等待后端确认后再加入WebSocket房间');

            // 发送真实的压力测试请求 - 使用统一的配置格式
            const response = await fetch('/api/test/stress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('auth_token') ? {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    } : {})
                },
                body: JSON.stringify({
                    url: testConfig.url.trim(),
                    testId: realTestId, // 传递真正的测试ID
                    recordId: recordId, // 单独传递记录ID
                    // 🔧 修复：直接发送配置参数，不使用options包装
                    users: testConfig.users,
                    duration: testConfig.duration,
                    rampUpTime: testConfig.rampUp,
                    testType: testConfig.testType,
                    method: testConfig.method,
                    timeout: testConfig.timeout,
                    thinkTime: testConfig.thinkTime,
                    // 🌐 代理设置
                    proxy: testConfig.proxy?.enabled ? {
                        enabled: true,
                        type: testConfig.proxy.type || 'http',
                        host: testConfig.proxy.host || '',
                        port: testConfig.proxy.port || 8080,
                        username: testConfig.proxy.username || '',
                        password: testConfig.proxy.password || ''
                    } : {
                        enabled: false
                    }
                })
            });

            const data = await response.json();
            console.log('🔄 收到后端响应:', {
                success: data.success,
                hasData: !!data.data,
                responseTestId: data.data?.testId || data.testId,
                sentTestId: realTestId,
                fullResponse: data
            });

            // 🔧 修复：兼容多种响应格式
            const isSuccess = data.success !== false && response.ok;
            const testIdFromResponse = data.data?.testId || data.testId;

            if (isSuccess && testIdFromResponse) {
                // ✅ 时序修复：后端确认测试启动后，立即设置testId并加入房间
                const confirmedTestId = testIdFromResponse || realTestId;
                console.log('✅ 后端确认测试启动，设置testId:', confirmedTestId);

                // 立即设置testId，这将触发useEffect加入WebSocket房间
                setCurrentTestId(confirmedTestId);

                // 🔧 立即尝试加入WebSocket房间（如果连接已建立）
                const socket = socketRef.current;
                if (socket && socket.connected) {
                    console.log('🏠 测试启动后立即加入WebSocket房间:', confirmedTestId);
                    joinWebSocketRoom(confirmedTestId);
                } else {
                    console.log('⚠️ WebSocket未连接，等待连接后加入房间');
                }

                if (testIdFromResponse && testIdFromResponse === realTestId) {
                    console.log('✅ 测试ID验证成功，前后端testId一致:', testIdFromResponse);
                } else {
                    console.warn('⚠️ 测试ID不匹配，使用后端返回的testId:', {
                        sent: realTestId,
                        received: testIdFromResponse
                    });
                }

                // 设置测试状态
                updateTestStatus('running', '压力测试正在运行...');
                setTestProgress('压力测试正在运行...');

                // 启动定期数据检查和状态同步
                if (testIdFromResponse) {
                    dataCheckIntervalRef.current = setInterval(async () => {
                        try {
                            const response = await fetch(`/api/test/stress/status/${testIdFromResponse}`);
                            const statusData = await response.json();

                            if (statusData.success && statusData.data) {
                                const serverStatus = statusData.data.status;

                                // 检查状态同步
                                if (serverStatus === 'completed' && testStatus === 'running') {
                                    console.log('🔄 状态同步：服务器显示已完成，但前端仍显示运行中，更新状态...');
                                    updateTestStatus('completed', '压力测试完成！');
                                    setTestProgress('压力测试完成！');
                                    // 🔧 修复：延迟清空testId，避免状态被重置
                                    setTimeout(() => setCurrentTestId(null), 2000);

                                    // 设置结果数据
                                    if (statusData.data.realTimeMetrics || statusData.data.metrics) {
                                        setResult({
                                            status: 'completed',
                                            message: '测试已完成',
                                            metrics: statusData.data.realTimeMetrics || statusData.data.metrics || {},
                                            realTimeData: statusData.data.realTimeData || []
                                        });
                                    }
                                    return;
                                }

                                if (serverStatus === 'cancelled' && testStatus !== 'cancelled') {
                                    console.log('🔄 状态同步：服务器显示已取消，更新状态...');
                                    updateTestStatus('cancelled', '测试已取消');
                                    setTestProgress('测试已取消');
                                    setCurrentTestId(null);
                                    return;
                                }

                                // 数据检查逻辑（仅在状态为运行中时）
                                if (stressTestData.length === 0 && isRunning && serverStatus === 'running') {
                                    console.log('🔄 定期检查：没有收到WebSocket数据，尝试API轮询...');
                                    console.log('📡 API轮询获取到数据:', {
                                        hasRealTimeData: !!statusData.data.realTimeData,
                                        realTimeDataLength: statusData.data.realTimeData?.length || 0,
                                        hasMetrics: !!statusData.data.metrics
                                    });

                                    // 更新实时数据
                                    if (statusData.data.realTimeData && statusData.data.realTimeData.length > 0) {
                                        // 转换为统一数据格式
                                        // 🔧 使用统一的数据更新函数
                                        updateChartData(statusData.data.realTimeData, true);
                                    }
                                }

                                // 更新指标
                                if (statusData.data.metrics) {
                                    setMetrics(statusData.data.metrics);
                                }
                            }
                        } catch (error) {
                            console.error('❌ 定期状态检查失败:', error);
                        }
                    }, 3000); // 每3秒检查一次
                }

                // WebSocket房间加入将由connect事件自动处理，无需在此处重复发送
                if (testIdFromResponse) {
                    console.log('🔗 测试ID已设置，WebSocket将自动加入房间:', testIdFromResponse);

                    // 设置一个定时器来检查是否收到数据
                    setTimeout(async () => {
                        console.log('⏰ 5秒后检查数据接收状态:', {
                            stressTestDataLength: stressTestData.length,
                            currentMetrics: metrics,
                            testStatus: testStatus
                        });

                        // 如果没有收到数据，尝试通过API获取
                        if (stressTestData.length === 0) {
                            console.log('🔄 没有收到WebSocket数据，尝试API轮询...');
                            try {
                                const response = await fetch(`/api/test/stress/status/${testIdFromResponse}`);
                                const statusData = await response.json();
                                console.log('📡 API状态查询结果:', statusData);

                                if (statusData.success && statusData.data) {
                                    // 手动更新数据
                                    if (statusData.data.realTimeData && statusData.data.realTimeData.length > 0) {
                                        console.log('🔄 通过API获取到实时数据，手动更新UI');
                                        // 🔧 使用统一的数据更新函数
                                        updateChartData(statusData.data.realTimeData, true);
                                    }
                                    if (statusData.data.metrics) {
                                        console.log('📊 通过API获取到指标数据，手动更新UI');
                                        setMetrics(statusData.data.metrics);
                                    }
                                }
                            } catch (error) {
                                console.error('❌ API轮询失败:', error);
                            }
                        }
                    }, 5000);
                } else {
                    console.error('❌ 未找到Socket实例，无法加入房间');
                }
            }

            // 如果测试已经完成（同步返回结果）
            if (data.data.status === 'completed') {
                // 确保错误率正确计算
                const processedMetrics = {
                    ...data.data.metrics,
                    errorRate: data.data.metrics?.errorRate ||
                        (data.data.metrics?.totalRequests > 0 ?
                            parseFloat(((data.data.metrics.failedRequests / data.data.metrics.totalRequests) * 100).toFixed(2)) : 0)
                };

                setResult({ ...data.data, metrics: processedMetrics });
                // 🔧 使用统一状态管理，状态转换验证会自动处理终态保护
                if (data.data.status === 'cancelled') {
                    updateTestStatus('cancelled', '测试已取消');
                    setTestProgress('测试已取消');
                    // 🔧 修复：取消状态时延迟清空testId
                    setTimeout(() => setCurrentTestId(null), 1000);
                } else {
                    updateTestStatus('completed', '压力测试完成！');
                    setTestProgress('压力测试完成！');
                    // 🔧 修复：延迟清空testId，避免状态被重置
                    setTimeout(() => setCurrentTestId(null), 2000);
                }
                setIsRunning(false);

                // 最后设置metrics，确保不被其他逻辑覆盖
                setTimeout(() => setMetrics(processedMetrics), 100);

                console.log('🔍 Final processed metrics:', processedMetrics);
                console.log('🔍 Error rate in final result:', processedMetrics.errorRate);

                // 处理最终结果数据：保持实时数据，生成聚合数据
                if (data.data.realTimeData && data.data.realTimeData.length > 0) {
                    // 设置原始实时数据
                    setRealTimeData(data.data.realTimeData);

                    // 使用统一的数据处理函数生成聚合数据
                    const finalChartData = data.data.realTimeData.map((point: any) => processDataPoint(point, false));
                    setFinalResultData(finalChartData);

                    console.log('🏁 同步测试完成 - 实时数据:', data.data.realTimeData.length, '聚合数据:', finalChartData.length);
                }

                // 记录测试完成统计
                const success = data.data.success !== false;
                const score = data.data.metrics?.averageResponseTime ?
                    Math.max(0, 100 - Math.min(100, data.data.metrics.averageResponseTime / 10)) : undefined;
                const duration = data.data.actualDuration || data.data.duration || testConfig.duration;
                recordTestCompletion('压力测试', success, score, duration);

                // 完成测试记录 - 使用新的历史记录API
                if (recordId || currentRecordId) {
                    const testRecordId = recordId || currentRecordId;
                    try {
                        const finalResults = {
                            results: data.data,
                            overallScore: score,
                            performanceGrade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D',
                            totalRequests: data.data.metrics?.totalRequests || 0,
                            successfulRequests: data.data.metrics?.successfulRequests || 0,
                            failedRequests: data.data.metrics?.failedRequests || 0,
                            averageResponseTime: data.data.metrics?.averageResponseTime || 0,
                            peakTps: data.data.metrics?.peakTPS || data.data.metrics?.throughput || 0,
                            errorRate: data.data.metrics?.errorRate ||
                                (data.data.metrics?.totalRequests > 0 ?
                                    parseFloat(((data.data.metrics.failedRequests / data.data.metrics.totalRequests) * 100).toFixed(2)) : 0),
                            realTimeData: data.data.realTimeData || []
                        };

                        await fetch(`/api/test/history/${testRecordId}/complete`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(localStorage.getItem('auth_token') ? {
                                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                } : {})
                            },
                            body: JSON.stringify(finalResults)
                        });
                        console.log('✅ 测试记录已完成');
                    } catch (recordError) {
                        console.warn('完成测试记录失败:', recordError);
                    }
                }
            } else {
                // 🔧 修复：提供更详细的错误信息
                const errorMsg = data.message || data.error || '测试启动失败';
                console.error('❌ 测试启动失败:', {
                    isSuccess,
                    testIdFromResponse,
                    fullResponse: data
                });
                throw new Error(errorMsg);
            }
        } catch (error: any) {
            console.error('压力测试失败:', error);
            setError(error.message || '测试失败');
            setTestStatus('failed');
            setTestProgress('测试失败');
            setIsRunning(false);

            // 标记测试记录失败 - 使用新的历史记录API
            if (recordId || currentRecordId) {
                const testRecordId = recordId || currentRecordId;
                try {
                    await fetch(`/api/test/history/${testRecordId}/fail`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(localStorage.getItem('auth_token') ? {
                                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                            } : {})
                        },
                        body: JSON.stringify({
                            errorMessage: error.message || '测试失败',
                            errorDetails: {
                                timestamp: new Date().toISOString(),
                                phase: 'execution',
                                stack: error.stack
                            }
                        })
                    });
                    console.log('❌ 测试记录已标记为失败');
                } catch (recordError) {
                    console.warn('标记测试记录失败失败:', recordError);
                }
            }
        }
    };

    // 后台测试管理状态
    const [backgroundTestInfo, setBackgroundTestInfo] = useState<any>(null);
    const [canSwitchPages, setCanSwitchPages] = useState(true);

    // 房间连接状态
    const [isInRoom, setIsInRoom] = useState(false);

    // 新增状态管理 - 统一图表
    const [baselineData, setBaselineData] = useState<any>(null);
    const [useUnifiedCharts, setUseUnifiedCharts] = useState(true);

    // 渐进式信息披露状态
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);


    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [hasAutoSelectedTemplate, setHasAutoSelectedTemplate] = useState(false);

    // 快速模板配置 - 使用统一的模板系统
    const quickTemplates = [
        {
            id: 'light-load',
            name: '轻量测试',
            description: '适合小型网站或初次测试',
            icon: '🌱',
            recommended: '个人博客、小型企业网站',
            isDefault: false,
            badge: '入门推荐'
        },
        {
            id: 'medium-load',
            name: '中等负载',
            description: '适合中型网站的常规测试',
            icon: '⚡',
            recommended: '企业网站、电商平台',
            isDefault: true, // 设为默认模板
            badge: '最受欢迎'
        },
        {
            id: 'heavy-load',
            name: '重负载测试',
            description: '适合大型网站的压力测试',
            icon: '🚀',
            recommended: '大型电商、高流量网站',
            isDefault: false,
            badge: '专业级'
        },
        {
            id: 'spike-test',
            name: '峰值冲击',
            description: '模拟突发流量冲击',
            icon: '⚡',
            recommended: '促销活动、新闻热点',
            isDefault: false,
            badge: '高级'
        }
    ];

    // 应用快速模板
    const applyTemplate = (templateId: string) => {
        // const template = getTemplateById(templateId);
        const template = null; // 临时修复
        if (template) {
            setTestConfig(prev => ({
                ...prev,
                users: template.config.users,
                duration: template.config.duration,
                rampUp: template.config.rampUp,
                testType: template.config.testType as StressTestConfig['testType'],
                method: template.config.method,
                timeout: template.config.timeout,
                thinkTime: template.config.thinkTime,
                warmupDuration: template.config.warmupDuration
            }));
            setSelectedTemplate(templateId);
        }
    };

    // 从剪贴板导入配置
    const importConfigFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const config = JSON.parse(text);

            // 验证配置格式
            if (typeof config === 'object' && config !== null) {
                setTestConfig(prev => ({
                    ...prev,
                    ...(config.users && { users: Number(config.users) }),
                    ...(config.duration && { duration: Number(config.duration) }),
                    ...(config.rampUp && { rampUp: Number(config.rampUp) }),
                    ...(config.rampUpTime && { rampUp: Number(config.rampUpTime) }),
                    ...(config.testType && { testType: config.testType }),
                    ...(config.method && { method: config.method }),
                    ...(config.timeout && { timeout: Number(config.timeout) }),
                    ...(config.thinkTime && { thinkTime: Number(config.thinkTime) }),
                    ...(config.warmupDuration && { warmupDuration: Number(config.warmupDuration) }),
                    ...(config.cooldownDuration && { cooldownDuration: Number(config.cooldownDuration) })
                }));
                alert('配置导入成功！');
            } else {
                alert('剪贴板中的内容不是有效的配置格式');
            }
        } catch (error) {
            console.error('导入配置失败:', error);
            alert('导入配置失败，请确保剪贴板中包含有效的JSON配置');
        }
    };

    // 新的状态管理系统监听器
    useEffect(() => {
        console.log('🔄 状态更新:', currentStatus, statusMessage);

        // 将新的状态映射到旧的状态系统，保持兼容性
        // 🔧 简化状态映射 - 将服务器状态映射到简化的前端状态
        const statusMapping: Record<string, TestStatusType> = {
            'IDLE': 'idle',
            'PREPARING': 'starting',     // 准备阶段映射到启动中
            'WAITING': 'starting',       // 等待阶段映射到启动中
            'STARTING': 'starting',
            'RUNNING': 'running',
            'COMPLETING': 'running',     // 完成阶段仍算运行中
            'COMPLETED': 'completed',
            'FAILING': 'running',        // 失败过程中仍算运行中
            'FAILED': 'failed',
            'CANCELLING': 'running',     // 取消过程中仍算运行中
            'CANCELLED': 'cancelled',
            'TIMEOUT': 'failed'          // 超时归类为失败
        };

        const mappedStatus = statusMapping[currentStatus] || 'idle';
        setTestStatus(mappedStatus);

        // 🔧 修复：只有在真正需要重置时才清空testProgress，保持完成状态的进度显示
        if (currentStatus === 'IDLE' && !['completed', 'cancelled', 'failed'].includes(testStatus)) {
            setTestProgress('');
        } else if (currentStatus !== 'IDLE') {
            setTestProgress(statusMessage);
        } else if (['completed', 'cancelled', 'failed'].includes(testStatus)) {
            // 保持完成状态的testProgress不被清空，确保进度条持续显示
            if (!testProgress) {
                setTestProgress(testStatus === 'completed' ? '测试已完成' :
                    testStatus === 'cancelled' ? '测试已取消' : '测试失败');
            }
        }

        // 🔧 修复：根据testStatus和currentStatus双重检查更新运行状态
        const runningStates = ['PREPARING', 'WAITING', 'STARTING', 'RUNNING', 'COMPLETING', 'FAILING', 'CANCELLING'];
        const shouldBeRunning = runningStates.includes(currentStatus) &&
            !['completed', 'cancelled', 'failed'].includes(testStatus);

        // 🔧 强制修复：确保终态时isRunning为false
        const finalShouldBeRunning = ['completed', 'cancelled', 'failed'].includes(testStatus) ? false : shouldBeRunning;

        setIsRunning(finalShouldBeRunning);
        setIsCancelling(currentStatus === 'CANCELLING');


    }, [currentStatus, statusMessage]);

    // 监听生命周期管理器的状态变化 - 已修复并启用
    useEffect(() => {
        if (lifecycleManager) {
            console.log('🔄 生命周期管理器已启用并准备就绪');
        }
    }, [lifecycleManager]);

    // 自动选择默认模板（仅在简化模式下且未手动选择时）
    useEffect(() => {
        if (!isAdvancedMode && !selectedTemplate && !hasAutoSelectedTemplate) {
            const defaultTemplate = quickTemplates.find(t => t.isDefault);
            if (defaultTemplate) {
                applyTemplate(defaultTemplate.id);
                setHasAutoSelectedTemplate(true);
                console.log(`🎯 自动选择默认模板: ${defaultTemplate.name}`);
            }
        }
    }, [isAdvancedMode, selectedTemplate, hasAutoSelectedTemplate]);

    // 当切换到高级模式时，重置自动选择状态
    useEffect(() => {
        if (isAdvancedMode) {
            setHasAutoSelectedTemplate(false);
        }
    }, [isAdvancedMode]);

    // 不再生成模拟数据，只使用真实的测试数据

    // 统一图表数据处理 - 使用真实数据或示例数据
    const unifiedTestData = {
        // 实时监控使用处理过的stressTestData，保持原始数据的细节
        realTimeData: stressTestData.length > 0 ? stressTestData : [],
        currentMetrics: metrics ? {
            ...metrics,
            currentTPS: metrics.currentTPS || 0,
            peakTPS: metrics.peakTPS || 0,
            errorBreakdown: metrics.errorBreakdown || {},
            p75ResponseTime: metrics.p75ResponseTime || metrics.p90ResponseTime * 0.8,
            p999ResponseTime: metrics.p999ResponseTime || metrics.p99ResponseTime * 1.2,
            // 添加数据传输相关的默认值
            dataReceived: metrics.dataReceived || 0,
            dataSent: metrics.dataSent || 0,
            minResponseTime: metrics.minResponseTime || 0,
            maxResponseTime: metrics.maxResponseTime || 0
        } : {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            currentTPS: 0,
            peakTPS: 0,
            errorBreakdown: {},
            dataReceived: 0,
            dataSent: 0,
            minResponseTime: 0,
            maxResponseTime: 0
        },
        testResult: result ? {
            id: currentTestId || 'current',
            name: `压力测试 - ${testConfig.url}`,
            date: new Date().toISOString(),
            url: testConfig.url,
            config: testConfig,
            metrics: metrics,
            // 统一使用实时数据，确保两个视图显示相同的数据
            timeSeriesData: stressTestData.length > 0 ? stressTestData : finalResultData
        } : undefined,
        historicalResults: [] as any[],
        baseline: baselineData
    };

    // 🔧 统一的测试状态管理逻辑
    const updateTestStatus = useCallback((newStatus: TestStatusType, reason?: string) => {
        console.log('🔄 更新测试状态:', { from: testStatus, to: newStatus, reason });

        // 状态转换验证
        const isValidTransition = validateStatusTransition(testStatus, newStatus);
        if (!isValidTransition) {
            console.warn('⚠️ 无效的状态转换:', { from: testStatus, to: newStatus });
            return false;
        }

        console.log('✅ 状态转换有效，执行更新');
        setTestStatus(newStatus);

        // 同步更新其他相关状态
        switch (newStatus) {
            case 'idle':
                setIsRunning(false);
                setIsCancelling(false);
                setCurrentStatus('IDLE');
                setStatusMessage('准备开始测试');
                break;
            case 'starting':
                setIsRunning(true);
                setIsCancelling(false);
                setCurrentStatus('STARTING');
                setStatusMessage('正在启动压力测试引擎...');
                break;
            case 'running':
                setIsRunning(true);
                setIsCancelling(false);
                setCurrentStatus('RUNNING');
                setStatusMessage('测试正在运行中...');
                break;
            case 'completed':
                setIsRunning(false);
                setIsCancelling(false);
                setCurrentStatus('COMPLETED');
                setStatusMessage('测试已完成');
                setTestProgress('压力测试完成！'); // 🔧 修复：同步更新testProgress
                setCanSwitchPages(true); // 允许切换页面
                break;
            case 'cancelled':
                setIsRunning(false);
                setIsCancelling(false);
                setCurrentStatus('CANCELLED');
                setStatusMessage('测试已取消');
                break;
            case 'failed':
                setIsRunning(false);
                setIsCancelling(false);
                setCurrentStatus('FAILED');
                setStatusMessage(reason || '测试失败');
                break;
        }

        // 保存状态到localStorage
        localStorage.setItem('currentStressTestStatus', newStatus);
        console.log('✅ 状态更新完成:', newStatus);
        return true;
    }, [testStatus]);

    // 状态转换验证函数
    const validateStatusTransition = useCallback((from: TestStatusType, to: TestStatusType): boolean => {
        // 🔧 修复：允许相同状态的转换（重复设置）
        if (from === to) {
            console.log('✅ 相同状态转换，允许:', { from, to });
            return true;
        }

        // 终态保护：已完成、已取消、失败状态不能被覆盖（除非重置为idle）
        if (['completed', 'cancelled', 'failed'].includes(from) && to !== 'idle') {
            console.log('🔒 终态保护，阻止状态转换:', { from, to });
            return false;
        }

        // 定义有效的状态转换
        // 🔧 简化状态转换逻辑 - 只保留核心状态
        const validTransitions: Record<TestStatusType, TestStatusType[]> = {
            'idle': ['starting', 'failed', 'completed'], // 允许从idle直接转换到completed
            'starting': ['running', 'failed', 'cancelled'],
            'running': ['completed', 'cancelled', 'failed'],
            'completed': ['idle'],
            'cancelled': ['idle'],
            'failed': ['idle']
        };

        const isValid = validTransitions[from]?.includes(to) || false;
        console.log('🔍 状态转换验证:', { from, to, isValid });
        return isValid;
    }, []);

    // 智能测试状态同步逻辑 - 重构为更清晰的逻辑
    useEffect(() => {
        // 根据当前状态和条件智能判断应该的状态
        let targetStatus: TestStatusType = testStatus;

        if (isRunning && currentTestId) {
            // 测试正在运行
            if (stressTestData.length > 0) {
                // 有实时数据，确认为运行状态
                targetStatus = 'running';
            } else if (testStatus === 'idle') {
                // 刚开始，设置为启动状态
                targetStatus = 'starting';
            }
        } else if (!isRunning && result) {
            // 测试已停止且有结果
            if (result.status === 'cancelled') {
                targetStatus = 'cancelled';
            } else if (result.status === 'completed' ||
                (result.metrics && result.metrics.totalRequests > 0)) {
                targetStatus = 'completed';
            } else if (result.status === 'failed' || error) {
                targetStatus = 'failed';
            }
        } else if (!isRunning && error && !result) {
            // 有错误但没有结果
            targetStatus = 'failed';
        } else if (!isRunning && !currentTestId && !result && !['completed', 'cancelled', 'failed'].includes(testStatus)) {
            // 完全空闲状态 - 但不重置已完成的状态
            targetStatus = 'idle';
        }

        // 只在状态需要改变时更新
        if (targetStatus !== testStatus) {
            updateTestStatus(targetStatus, error || undefined);
        }
    }, [isRunning, currentTestId, result, error, stressTestData.length, testStatus, updateTestStatus]);

    // 监听后台测试状态变化
    useEffect(() => {
        const unsubscribe = backgroundTestManager.addListener((event: string, testInfo: any) => {
            if (testInfo.type === 'stress' && testInfo.id === currentTestId) {
                switch (event) {
                    case 'testProgress':
                        setBackgroundTestInfo(testInfo);
                        setTestProgress(testInfo.currentStep);
                        // 🔧 修复：只有在非终态时才设置为running
                        if (!['completed', 'cancelled', 'failed'].includes(testStatus)) {
                            setTestStatus('running');
                            setIsRunning(true);
                        }

                        // 更新实时数据 - 简化版本
                        if (testInfo.realTimeData) {
                            console.log('🔄 Updating realTimeData:', testInfo.realTimeData.length, 'points');
                            setRealTimeData(testInfo.realTimeData);
                        }
                        if (testInfo.metrics) {
                            console.log('📊 Updating metrics:', testInfo.metrics);
                            setMetrics(testInfo.metrics);
                        }

                        // 更新测试进度到历史记录 - 异步处理
                        if (currentRecordId && testInfo.progress !== undefined) {
                            // 使用异步函数处理进度更新
                            (async () => {
                                try {
                                    await fetch(`/api/test/history/${currentRecordId}/progress`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            ...(localStorage.getItem('auth_token') ? {
                                                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                            } : {})
                                        },
                                        body: JSON.stringify({
                                            progress: Math.round(testInfo.progress || 0),
                                            phase: testInfo.phase || 'running',
                                            step: testInfo.currentStep || '测试进行中',
                                            currentUsers: testInfo.metrics?.activeUsers || 0,
                                            currentTps: testInfo.metrics?.currentTPS || 0,
                                            currentResponseTime: testInfo.metrics?.averageResponseTime || 0,
                                            currentErrorRate: testInfo.metrics?.errorRate || 0,
                                            metrics: testInfo.metrics || {}
                                        })
                                    });
                                } catch (progressError) {
                                    console.warn('更新测试进度失败:', progressError);
                                }
                            })();
                        }
                        break;
                    case 'testCompleted':
                        setBackgroundTestInfo(testInfo);

                        // 处理压力测试结果数据结构
                        const processedResult = testInfo.result;
                        console.log('🔍 Processing stress test result:', processedResult);

                        // 确保 metrics 数据正确提取
                        if (processedResult && processedResult.metrics) {
                            // 确保所有关键字段正确映射
                            const finalMetrics = {
                                ...processedResult.metrics,
                                // 保持后端提供的原始值，不要覆盖
                                currentTPS: typeof processedResult.metrics.currentTPS === 'number' ?
                                    processedResult.metrics.currentTPS : 0,
                                peakTPS: typeof processedResult.metrics.peakTPS === 'number' ?
                                    processedResult.metrics.peakTPS : 0,
                                throughput: typeof processedResult.metrics.throughput === 'number' ?
                                    processedResult.metrics.throughput : 0,
                                // 确保错误率正确传递
                                errorRate: processedResult.metrics.errorRate ||
                                    (processedResult.metrics.totalRequests > 0 ?
                                        parseFloat(((processedResult.metrics.failedRequests / processedResult.metrics.totalRequests) * 100).toFixed(2)) : 0)
                            };
                            setMetrics(finalMetrics);
                            console.log('📊 Extracted metrics:', finalMetrics);
                            console.log('🔍 Error rate in final metrics:', finalMetrics.errorRate);
                        }

                        // 处理测试完成后的数据：生成聚合数据用于测试结果视图
                        if (testInfo.realTimeData && testInfo.realTimeData.length > 0) {
                            console.log('📈 处理测试完成数据:', testInfo.realTimeData.length, 'data points');

                            // 更新原始实时数据
                            setRealTimeData(testInfo.realTimeData);

                            // 生成聚合数据用于测试结果视图
                            const timeWindowMs = 1000; // 1秒时间窗口
                            const aggregatedData = new Map();

                            testInfo.realTimeData.forEach((point: any) => {
                                const timeKey = Math.floor(point.timestamp / timeWindowMs) * timeWindowMs;
                                if (!aggregatedData.has(timeKey)) {
                                    aggregatedData.set(timeKey, {
                                        timestamp: timeKey,
                                        responseTimes: [],
                                        successes: 0,
                                        failures: 0,
                                        activeUsers: point.activeUsers,
                                        phase: point.phase || 'steady'
                                    });
                                }

                                const window = aggregatedData.get(timeKey);
                                window.responseTimes.push(point.responseTime);
                                if (point.success) {
                                    window.successes++;
                                } else {
                                    window.failures++;
                                }
                                window.activeUsers = Math.max(window.activeUsers, point.activeUsers);
                            });

                            const aggregatedChartData = Array.from(aggregatedData.values())
                                .sort((a, b) => a.timestamp - b.timestamp)
                                .map(window => {
                                    const totalRequests = window.successes + window.failures;
                                    const avgResponseTime = window.responseTimes.length > 0 ?
                                        Math.round(window.responseTimes.reduce((sum: number, time: number) => sum + time, 0) / window.responseTimes.length) : 0;
                                    const errorRate = totalRequests > 0 ? Math.round((window.failures / totalRequests) * 100) : 0;

                                    return {
                                        time: new Date(window.timestamp).toLocaleTimeString(),
                                        timestamp: window.timestamp,
                                        responseTime: avgResponseTime,
                                        throughput: totalRequests, // 每秒请求数
                                        errors: window.failures,
                                        users: window.activeUsers,
                                        activeUsers: window.activeUsers,
                                        p95ResponseTime: avgResponseTime * 1.2,
                                        errorRate: errorRate,
                                        phase: window.phase,
                                        status: window.failures > 0 ? 500 : 200,
                                        success: window.failures === 0
                                    };
                                });

                            // 设置聚合数据用于测试结果视图
                            setFinalResultData(aggregatedChartData);
                            console.log('🏁 聚合数据已生成用于测试结果视图:', aggregatedChartData.length, '个数据点');
                        } else {
                            console.log('⚠️ No real-time data available for chart');
                        }

                        setResult(processedResult);
                        // 🔧 修复：检查当前状态，如果已经是取消状态则不覆盖
                        if (testStatus === 'cancelled') {
                            console.log('🛑 测试已取消，不覆盖取消状态');
                            // 保持取消状态不变
                        } else if (processedResult.status === 'cancelled') {
                            setTestStatus('cancelled');
                            setTestProgress('测试已取消');
                        } else {
                            setTestStatus('completed');
                            setTestProgress('压力测试完成！');
                        }
                        setIsRunning(false);
                        // 🔧 修复：如果是取消状态，立即清理测试ID；否则延迟清理
                        if (testStatus === 'cancelled' || processedResult.status === 'cancelled') {
                            console.log('🧹 测试已取消，立即清理测试ID');
                            setCurrentTestId(null);
                            currentTestIdRef.current = null;
                        } else {
                            // 延迟清空testId，确保其他请求能正常发送
                            setTimeout(() => {
                                setCurrentTestId(null);
                                currentTestIdRef.current = null;
                            }, 1000);
                        }
                        // 记录测试完成统计
                        if (processedResult) {
                            const success = processedResult.success !== false;
                            const score = processedResult.metrics?.averageResponseTime ?
                                Math.max(0, 100 - Math.min(100, processedResult.metrics.averageResponseTime / 10)) : undefined;
                            const duration = processedResult.actualDuration || processedResult.duration || testConfig.duration;
                            recordTestCompletion('压力测试', success, score, duration);

                            // 更新测试记录 (背景测试)
                            // 🔧 修复：如果测试已被取消，不要覆盖取消状态
                            if (currentRecord && processedResult.status !== 'cancelled' && testStatus !== 'cancelled') {
                                (async () => {
                                    try {
                                        await completeRecord(currentRecord.id, {
                                            metrics: processedResult.metrics,
                                            realTimeData: testInfo.realTimeData,
                                            errorBreakdown: processedResult.errorBreakdown,
                                            phases: processedResult.phases
                                        }, score);
                                        console.log('✅ 背景测试记录已更新');
                                    } catch (recordError) {
                                        console.warn('⚠️ 背景测试更新记录失败:', recordError);
                                    }
                                })();
                            } else if (currentRecord && processedResult.status === 'cancelled') {
                                console.log('🛑 测试已取消，跳过完成记录更新');
                            }
                        }
                        break;
                    case 'testFailed':
                        setBackgroundTestInfo(testInfo);
                        setError(testInfo.error || '测试失败');
                        setTestStatus('failed');
                        setIsRunning(false);
                        // 🔧 修复：立即清理测试ID
                        setCurrentTestId(null);
                        currentTestIdRef.current = null;

                        // 更新测试记录为失败状态
                        if (currentRecord) {
                            (async () => {
                                try {
                                    await failRecord(currentRecord.id, testInfo.error || '测试失败');
                                    console.log('✅ 背景测试记录已标记为失败');
                                } catch (recordError) {
                                    console.warn('⚠️ 背景测试更新失败记录失败:', recordError);
                                }
                            })();
                        }
                        break;
                    case 'testCancelled':
                        setBackgroundTestInfo(testInfo);
                        setTestProgress('测试已取消');
                        setTestStatus('cancelled'); // ✅ 修复：使用正确的 cancelled 状态
                        setIsRunning(false);
                        setIsStopping(false);
                        // 🔧 修复：立即清理测试ID
                        setCurrentTestId(null);
                        currentTestIdRef.current = null;

                        // 更新测试记录为取消状态
                        if (currentRecord) {
                            (async () => {
                                try {
                                    await cancelRecord(currentRecord.id, '用户主动取消测试');
                                    console.log('✅ 测试记录已标记为取消');
                                } catch (recordError) {
                                    console.warn('⚠️ 更新取消记录失败:', recordError);
                                }
                            })();
                        }

                        // 如果有结果数据，设置它
                        if (testInfo.result) {
                            setResult({
                                ...testInfo.result,
                                status: 'cancelled',
                                message: '测试已被用户取消'
                            });
                            setMetrics(testInfo.result.metrics || {});
                        }

                        console.log('🛑 测试已被取消');
                        break;
                }
            }
        });

        // 检查是否有正在运行的压力测试
        const runningTests = backgroundTestManager.getRunningTests();
        const stressTest = runningTests.find((test: any) => test.type === 'stress');
        if (stressTest) {
            setCurrentTestId(stressTest.id);
            setBackgroundTestInfo(stressTest);
            // 🔧 修复：只有在非终态时才设置为running
            if (!['completed', 'cancelled', 'failed'].includes(testStatus)) {
                setTestStatus('running');
                setTestProgress(stressTest.currentStep);
                setIsRunning(true);
            }
        }

        return unsubscribe;
    }, [currentTestId]);

    // 连接错误后检查测试状态
    const checkTestStatusAfterConnectionError = useCallback(async () => {
        if (!currentTestIdRef.current) return;

        try {
            console.log('🔍 检查测试状态 (连接错误后):', currentTestIdRef.current);
            const response = await fetch(`/api/stress-test/status/${currentTestIdRef.current}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('❌ 测试不存在，重置状态');
                    resetTestStateOnError('测试已结束或不存在');
                }
                return;
            }

            const data = await response.json();
            if (data.success && data.data) {
                if (data.data.status === 'completed' || data.data.status === 'cancelled') {
                    console.log('✅ 测试已完成，更新状态');
                    handleTestCompletion(data.data);
                }
            }
        } catch (error) {
            console.error('❌ 检查测试状态失败:', error);
            // 如果连续检查失败，可能需要重置状态
            setTimeout(() => {
                if (isRunning && currentTestIdRef.current) {
                    console.log('⚠️ 连续检查失败，考虑重置状态');
                    resetTestStateOnError('无法连接到服务器');
                }
            }, 10000); // 10秒后重置
        }
    }, [isRunning]);

    // 重连后检查测试状态
    const checkTestStatusAfterReconnect = useCallback(async () => {
        if (!currentTestIdRef.current) return;

        try {
            console.log('🔍 检查测试状态 (重连后):', currentTestIdRef.current);
            const response = await fetch(`/api/stress-test/status/${currentTestIdRef.current}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('❌ 测试不存在，重置状态');
                    resetTestStateOnError('测试已结束');
                }
                return;
            }

            const data = await response.json();
            if (data.success && data.data) {
                console.log('📊 重连后测试状态:', data.data);

                if (data.data.status === 'completed' || data.data.status === 'cancelled') {
                    console.log('✅ 测试已完成，更新状态');
                    handleTestCompletion(data.data);
                } else if (data.data.status === 'running') {
                    // 重新加入WebSocket房间
                    console.log('🏠 重新加入测试房间');
                    joinWebSocketRoom(currentTestIdRef.current, true);
                }
            }
        } catch (error) {
            console.error('❌ 重连后检查测试状态失败:', error);
        }
    }, []);

    // 重置测试状态（连接错误时使用）
    const resetTestStateOnError = useCallback((reason: string) => {
        console.log('🔄 重置测试状态 (连接错误):', reason);

        // 🔧 使用统一状态管理系统
        updateTestStatus('failed', reason);
        setCurrentTestId(null);
        setIsInRoom(false);
        setCanSwitchPages(true);

        // 清理定时器
        if (testTimeoutTimer) {
            clearTimeout(testTimeoutTimer);
            setTestTimeoutTimer(null);
        }
    }, [testTimeoutTimer, updateTestStatus]);

    // 处理测试完成
    const handleTestCompletion = useCallback((testData: any) => {
        console.log('🏁 处理测试完成:', testData);

        // 清理错误状态，确保完成状态不被错误状态覆盖
        setError(null);

        // 🔧 使用统一状态管理系统
        if (testData.status === 'cancelled') {
            updateTestStatus('cancelled', '测试已取消');
        } else if (testData.status === 'failed') {
            updateTestStatus('failed', testData.error || '测试执行失败');
        } else {
            updateTestStatus('completed', '测试已完成');
        }

        setCurrentTestId(null);
        setIsInRoom(false);

        if (testData.metrics) {
            setMetrics(testData.metrics);
        }

        if (testData.realTimeData) {
            setRealTimeData(testData.realTimeData);
        }

        setResult(testData);
    }, [updateTestStatus]);

    // WebSocket连接管理
    useEffect(() => {
        // 动态导入socket.io-client
        const initializeSocket = async () => {
            try {
                const { io } = await import('socket.io-client');

                // 创建WebSocket连接
                const socket = io('http://localhost:3001', {
                    transports: ['websocket', 'polling'],
                    timeout: 20000,
                });

                socketRef.current = socket;

                // 连接事件
                socket.on('connect', () => {
                    console.log('✅ WebSocket连接成功:', socket.id);

                    // 连接成功后立即检查是否有当前测试需要加入房间
                    const currentTestIdValue = currentTestIdRef.current;
                    if (currentTestIdValue) {
                        console.log('🏠 连接成功后立即加入当前测试房间:', currentTestIdValue);
                        joinWebSocketRoom(currentTestIdValue);
                    }

                    // 🔧 发送测试ping来验证连接
                    socket.emit('test-ping', { message: 'WebSocket连接测试', timestamp: Date.now() });
                });

                // 设置房间加入确认监听器（全局监听）
                socket.on('room-joined', (roomData: any) => {
                    console.log('✅✅✅ 房间加入确认 ✅✅✅:', roomData);
                    console.log('🎯🎯🎯 房间加入成功，开间接收实时数据 🎯🎯🎯');

                    // 更新房间连接状态
                    setIsInRoom(true);
                });

                // ✅ 监听测试完成事件 (简化版，主要处理在下面的完整监听器中)

                // 🔧 重构：监听新的事件名称
                socket.on('test-progress', (data: any) => {
                    console.log('📊 收到测试进度:', data);
                    console.log('🔍 测试进度数据详情:', {
                        testId: data.testId,
                        currentTestId: currentTestIdRef.current,
                        progress: data.progress,
                        hasMetrics: !!data.metrics,
                        metricsKeys: data.metrics ? Object.keys(data.metrics) : [],
                        metrics: data.metrics
                    });

                    if (data.testId === currentTestIdRef.current) {
                        // 处理进度更新
                        if (data.progress !== undefined) {
                            setTestProgress(`${data.progress}%`);
                        }
                        if (data.metrics) {
                            setMetrics(data.metrics);

                            // 🔧 修复：将指标数据转换为图表数据点
                            const dataPoint = {
                                timestamp: Date.now(),
                                responseTime: data.metrics.avgResponseTime || data.metrics.averageResponseTime || 0,
                                throughput: data.metrics.currentTPS || data.metrics.throughput || 0,
                                activeUsers: data.metrics.activeUsers || 0,
                                successRate: data.metrics.successRate || 100,
                                errorRate: data.metrics.errorRate || 0,
                                errors: data.metrics.errors || 0,
                                totalRequests: data.metrics.totalRequests || 0,
                                successfulRequests: data.metrics.successfulRequests || 0,
                                failedRequests: data.metrics.failedRequests || 0
                            };

                            console.log('🎯 添加图表数据点:', dataPoint);
                            updateChartData([dataPoint], true);
                        } else {
                            console.log('⚠️ test-progress 事件没有 metrics 数据');
                        }
                    } else {
                        console.log('⚠️ test-progress 事件的 testId 不匹配:', {
                            received: data.testId,
                            expected: currentTestIdRef.current
                        });
                    }
                });

                socket.on('test-completed', (data: any) => {
                    console.log('✅ 收到测试完成事件:', data);
                    if (data.testId === currentTestIdRef.current) {
                        setCurrentStatus('COMPLETED');
                        setStatusMessage('测试已完成');
                        if (data.results) {
                            // 处理测试结果
                            console.log('📊 测试结果:', data.results);
                        }
                    }
                });

                socket.on('test-error', (data: any) => {
                    console.log('❌ 收到测试错误事件:', data);
                    if (data.testId === currentTestIdRef.current) {
                        setCurrentStatus('FAILED');
                        setStatusMessage('测试失败: ' + data.error);
                        console.error('❌ 压力测试失败:', data);
                    }
                });

                // 监听测试ping响应
                socket.on('test-pong', (pongData: any) => {
                    console.log('🏓 收到测试pong响应:', pongData);
                });

                // 保存socket实例到全局，供其他地方使用
                (window as any).socket = socket;

                socket.on('disconnect', (reason) => {
                    console.log('🔌 WebSocket连接断开:', reason);
                    setIsInRoom(false);

                    // 🔧 修复：WebSocket断开时不要自动假设测试完成
                    if (reason === 'io server disconnect') {
                        console.log('🔍 服务器主动断开连接，检查测试状态', {
                            isRunning,
                            hasData: stressTestData.length > 0,
                            currentTestId: currentTestIdRef.current,
                            testStatus,
                            isCancelling
                        });

                        // 🚫 移除自动完成逻辑 - 不要在WebSocket断开时自动设置为completed
                        // 让服务器端的状态更新来决定最终状态
                        console.log('⚠️ WebSocket断开，等待服务器状态更新，不自动设置为完成状态');

                        // 如果正在取消，保持取消状态
                        if (isCancelling || testStatus === 'cancelled') {
                            console.log('🛑 测试正在取消或已取消，保持取消状态');
                            setTestStatus('cancelled');
                            setTestProgress('测试已取消');
                            setIsRunning(false);
                        }
                    } else if (isRunning && currentTestIdRef.current) {
                        // 其他原因的断开，标记为可能失败
                        console.log('⚠️ 测试运行中WebSocket断开，可能需要重置状态');
                        setStatusMessage('连接断开，正在尝试重连...');
                    }
                });

                // 连接错误处理
                socket.on('connect_error', (error) => {
                    console.error('❌❌❌ WebSocket连接错误 ❌❌❌:', error);
                    console.error('❌ 错误详情:', {
                        message: error.message,
                        description: (error as any).description,
                        context: (error as any).context,
                        type: (error as any).type
                    });

                    // 如果有正在运行的测试，检查是否需要重置
                    if (isRunning && currentTestIdRef.current) {
                        console.log('⚠️ 测试运行中连接错误，检查测试状态');
                        checkTestStatusAfterConnectionError();
                    }
                });

                // 重连成功处理
                socket.on('reconnect', (attemptNumber) => {
                    console.log(`🔄 WebSocket重连成功 (尝试 ${attemptNumber})`);

                    // 重连后检查测试状态
                    if (isRunning && currentTestIdRef.current) {
                        console.log('🔍 重连后检查测试状态');
                        checkTestStatusAfterReconnect();
                    }
                });



                // 🔧 监听WebSocket取消测试确认
                socket.on('cancel-stress-test-ack', (data) => {
                    console.log('✅ 收到WebSocket取消确认:', data);

                    if (data.success) {
                        console.log('🎯 WebSocket取消成功，后端已确认');
                    } else {
                        console.warn('⚠️ WebSocket取消失败:', data.message);
                    }
                });

                // 统一的压力测试实时数据监听器
                socket.on('realTimeData', (data) => {
                    console.log('📊 收到实时数据:', {
                        type: typeof data,
                        hasTimestamp: !!data.timestamp,
                        hasResponseTime: data.responseTime !== undefined,
                        dataKeys: Object.keys(data)
                    });

                    // 🔧 修复：如果当前没有testId但接收到实时数据，尝试恢复测试状态
                    const currentTestIdValue = currentTestIdRef.current;
                    if (!currentTestIdValue && data.timestamp && data.responseTime !== undefined) {
                        console.log('🔧 检测到实时数据但没有testId，尝试恢复测试状态...');

                        // 通过API查询当前运行的测试来恢复testId
                        fetch('/api/test/status')
                            .then(response => response.json())
                            .then(statusData => {
                                if (statusData.success && statusData.data && statusData.data.testId) {
                                    console.log('✅ 从API恢复testId:', statusData.data.testId);
                                    setCurrentTestId(statusData.data.testId);
                                    currentTestIdRef.current = statusData.data.testId;

                                    // 恢复测试状态
                                    // 🔧 修复：只有在非终态时才恢复为running状态
                                    if (!['completed', 'cancelled', 'failed'].includes(testStatus)) {
                                        setIsRunning(true);
                                        setTestStatus('running');
                                        setCurrentStatus('RUNNING');
                                        setStatusMessage('测试正在运行中...');
                                    }
                                }
                            })
                            .catch(error => {
                                console.warn('⚠️ 恢复testId失败:', error);
                            });
                    }

                    // 🔧 统一的实时数据处理逻辑
                    if (data.timestamp && data.responseTime !== undefined) {
                        console.log('📈 处理实时数据点:', data);

                        // 使用统一的数据更新函数
                        updateChartData([data], true);

                        // 更新状态为运行中
                        setCurrentStatus((prevStatus: string) => {
                            if (prevStatus === 'WAITING' || prevStatus === 'STARTING' || prevStatus === 'IDLE') {
                                console.log('🎯 接收到实时数据，更新状态为RUNNING');
                                setStatusMessage('测试正在运行中...');
                                setIsRunning(true);
                                // 🔧 修复：只有在非终态时才设置为running
                                if (!['completed', 'cancelled', 'failed'].includes(testStatus)) {
                                    setTestStatus('running');
                                }
                                return 'RUNNING';
                            }
                            return prevStatus;
                        });
                    } else {
                        console.warn('⚠️ 收到的数据格式不正确:', data);
                    }
                });

                // 恢复重要的 stress-test-data 监听器 - 处理完整测试数据和状态
                socket.on('stress-test-data', (data) => {
                    console.log('📊 收到WebSocket实时数据 (stress-test-data):', {
                        testId: data.testId,
                        currentTestId: currentTestId,
                        testIdMatch: data.testId === currentTestId,
                        hasDataPoint: !!data.dataPoint,
                        hasMetrics: !!data.metrics,
                        // 新增：检查直接的指标数据
                        hasDirectMetrics: !!(data.totalRequests !== undefined || data.currentTPS !== undefined),
                        directMetricsData: {
                            totalRequests: data.totalRequests,
                            currentTPS: data.currentTPS,
                            peakTPS: data.peakTPS,
                            averageResponseTime: data.dataPointResponseTime
                        },
                        timestamp: data.dataPointTimestamp ? new Date(data.dataPointTimestamp).toLocaleTimeString() : 'N/A',
                        rawData: data
                    });

                    // 🔧 添加数据接收统计
                    console.log('📈 WebSocket数据接收统计:', {
                        currentStressTestDataLength: stressTestData.length,
                        isRunning: isRunning,
                        testStatus: testStatus
                    });

                    // 添加事件接收确认
                    console.log('✅ stress-test-data 事件已接收，开始处理数据...');

                    // 检查testId是否匹配 - 使用ref获取最新值
                    const currentTestIdValue = currentTestIdRef.current;

                    // 🔧 修复：如果当前没有testId，接受数据并更新testId（不管是否正在运行）
                    if (data.testId !== currentTestIdValue) {
                        if (!currentTestIdValue && data.testId) {
                            console.log('🔧 没有testId，从WebSocket数据中恢复:', data.testId);
                            setCurrentTestId(data.testId);
                            currentTestIdRef.current = data.testId;
                        } else if (currentTestIdValue && data.testId !== currentTestIdValue) {
                            // 只有在有testId但不匹配时才警告并返回
                            console.warn('⚠️ 收到的数据testId不匹配当前测试:', {
                                received: data.testId,
                                current: currentTestIdValue,
                                receivedType: typeof data.testId,
                                currentType: typeof currentTestIdValue,
                                isRunning,
                                testStatus
                            });
                            return;
                        }
                    }

                    // 检查测试是否已被取消 - 如果已取消，忽略后续数据
                    if (testStatus === 'cancelled' || currentStatus === 'CANCELLED') {
                        console.log('🛑 测试已取消，忽略WebSocket数据');
                        return;
                    }

                    // 当接收到第一个实时数据时，更新状态为RUNNING
                    setCurrentStatus((prevStatus: string) => {
                        if (prevStatus === 'WAITING' || prevStatus === 'STARTING') {
                            console.log('🎯 接收到实时数据，更新状态为RUNNING');
                            setStatusMessage('测试正在运行中...');
                            return 'RUNNING';
                        }
                        return prevStatus;
                    });

                    // 处理数据点 - 支持两种数据格式
                    let dataPoint = null;

                    if (data.dataPoint) {
                        // 格式1：嵌套的dataPoint对象
                        dataPoint = data.dataPoint;
                        console.log('📈 处理嵌套数据点:', dataPoint);
                    } else if (data.dataPointTimestamp) {
                        // 格式2：直接的数据字段
                        dataPoint = {
                            timestamp: data.dataPointTimestamp,
                            responseTime: data.dataPointResponseTime || 0,
                            activeUsers: data.clientCount || 0,
                            throughput: data.throughput || data.currentTPS || 0, // 🔧 修复：优先使用throughput
                            errorRate: 0, // 需要计算
                            success: true
                        };
                        console.log('📈 处理直接数据点:', dataPoint);
                    }

                    if (dataPoint) {
                        // 🔧 使用统一的数据更新函数
                        updateChartData([dataPoint], true);
                    }

                    // 更新实时指标 - 支持两种数据格式
                    let metricsData = null;

                    if (data.metrics) {
                        // 格式1：嵌套的metrics对象
                        metricsData = data.metrics;
                        console.log('📊 收到嵌套指标数据:', metricsData);
                    } else if (data.totalRequests !== undefined || data.currentTPS !== undefined) {
                        // 格式2：直接的指标字段
                        metricsData = {
                            totalRequests: data.totalRequests || 0,
                            successfulRequests: data.totalRequests || 0, // 假设都成功，后续可以优化
                            failedRequests: 0,
                            averageResponseTime: data.dataPointResponseTime || 0,
                            currentTPS: data.currentTPS || 0,
                            peakTPS: data.peakTPS || 0,
                            throughput: data.throughput || 0, // 🔧 修复：使用正确的throughput字段
                            errorRate: 0,
                            p50ResponseTime: data.dataPointResponseTime || 0,
                            p90ResponseTime: data.dataPointResponseTime || 0,
                            p95ResponseTime: data.dataPointResponseTime || 0,
                            p99ResponseTime: data.dataPointResponseTime || 0
                        };
                        console.log('📊 收到直接指标数据:', metricsData);
                    }



                    if (metricsData && metricsData.totalRequests > 0) {
                        const updatedMetrics = {
                            ...metricsData,
                            currentTPS: typeof metricsData.currentTPS === 'number' ? metricsData.currentTPS : 0,
                            peakTPS: typeof metricsData.peakTPS === 'number' ? metricsData.peakTPS : 0,
                            throughput: typeof metricsData.throughput === 'number' ? metricsData.throughput : 0,
                            errorRate: typeof metricsData.errorRate === 'number' ? metricsData.errorRate : 0
                        };

                        console.log('🔄 使用后端提供的指标数据 (优先):', updatedMetrics);
                        setMetrics(updatedMetrics);
                    } else {
                        // 只有在后端没有提供指标数据时才使用前端计算
                        console.log('🔧 后端未提供指标数据，使用前端计算');
                    }

                    // 更新进度
                    if (data.progress !== undefined) {
                        const progressPercent = Math.round(data.progress);
                        setTestProgress(`测试进行中... ${progressPercent}%`);

                        // 🔧 简单粗暴的修复：进度达到99%直接完成
                        if (progressPercent >= 99) {
                            console.log('🔧 进度达到99%，直接完成测试');
                            setTimeout(() => {
                                updateTestStatus('completed', '测试已完成');
                            }, 1000); // 1秒后直接完成
                        }
                    }
                });

                // 🔧 添加专门的 progress 事件监听器
                socket.on('progress', (data) => {
                    console.log('📈 收到进度更新事件:', data);

                    // 检查testId是否匹配
                    if (data.testId !== currentTestIdRef.current) {
                        console.warn('⚠️ 进度事件testId不匹配:', {
                            received: data.testId,
                            current: currentTestIdRef.current
                        });
                        return;
                    }

                    // 更新进度百分比
                    if (data.progress !== undefined) {
                        const progressPercent = Math.round(data.progress);
                        setTestProgress(`测试进行中... ${progressPercent}%`);

                        // 🔧 简单粗暴的修复：进度达到99%直接完成 - 增加取消状态检查
                        if (progressPercent >= 99) {
                            console.log('🔧 进度达到99%，检查是否可以完成测试');
                            setTimeout(() => {
                                // 🔧 修复：检查是否正在取消，如果是则不设置完成状态
                                if (testStatus !== 'cancelled' && !isCancelling) {
                                    updateTestStatus('completed', '测试已完成');
                                } else {
                                    console.log('🛑 正在取消中，不设置完成状态');
                                }
                            }, 1000);
                        }
                    }

                    // 🔧 关键修复：处理累积指标数据
                    if (data.metrics) {
                        console.log('📊 收到累积指标数据:', data.metrics);

                        // 直接使用后端提供的累积指标数据
                        const updatedMetrics: RealTimeMetrics = {
                            totalRequests: data.metrics.totalRequests || 0,
                            successfulRequests: data.metrics.successfulRequests || 0,
                            failedRequests: data.metrics.failedRequests || 0,
                            averageResponseTime: data.metrics.averageResponseTime || 0,
                            currentTPS: data.metrics.currentTPS || 0,
                            peakTPS: data.metrics.peakTPS || 0,
                            throughput: data.metrics.throughput || 0, // 🔧 修复：使用后端提供的平均吞吐量
                            errorRate: data.metrics.errorRate || 0,
                            activeUsers: data.metrics.activeUsers || 0,
                            timestamp: Date.now(),
                            // 可选属性
                            requestsPerSecond: data.metrics.requestsPerSecond || data.metrics.currentTPS || 0,
                            p50ResponseTime: data.metrics.p50ResponseTime || 0,
                            p90ResponseTime: data.metrics.p90ResponseTime || 0,
                            p95ResponseTime: data.metrics.p95ResponseTime || 0,
                            p99ResponseTime: data.metrics.p99ResponseTime || 0
                        };

                        console.log('📊 保持后端提供的指标数据:', updatedMetrics);
                        setMetrics(updatedMetrics);
                    }
                });

                // 压力测试状态更新
                socket.on('stress-test-status', (data) => {
                    console.log('📊 收到状态更新:', data);

                    // 🔧 使用统一状态管理系统处理状态更新
                    if (data.status === 'cancelled') {
                        console.log('🛑 收到取消状态通知');
                        updateTestStatus('cancelled', data.message || '测试已取消');
                        setCanSwitchPages(true);
                        // 🔧 修复：延迟清空testId，确保取消请求能正常发送
                        setTimeout(() => setCurrentTestId(null), 1000);

                        // 设置结果数据
                        if (data.metrics || data.realTimeData) {
                            setResult({
                                status: 'cancelled',
                                message: data.message || '测试已被用户取消',
                                metrics: data.metrics || {},
                                realTimeData: data.realTimeData || [],
                                endTime: data.endTime,
                                actualDuration: data.actualDuration,
                                cancelReason: data.cancelReason || '用户手动取消'
                            });
                        }
                        return;
                    }

                    // 🔧 使用统一状态管理处理其他状态 - 状态转换验证会自动处理终态保护
                    if (data.status === 'completed') {
                        updateTestStatus('completed', data.message);
                    } else if (data.status === 'failed') {
                        updateTestStatus('failed', data.message || '测试失败');
                    } else if (data.status === 'running' && testStatus !== 'running') {
                        updateTestStatus('running', data.message);
                    }

                    // 更新进度信息
                    if (data.progress !== undefined) {
                        setTestProgress(`测试进行中... ${Math.round(data.progress)}%`);
                    }
                });

                // 压力测试完成
                socket.on('stress-test-complete', (data) => {
                    console.log('✅ 收到测试完成事件:', data);
                    console.log('🔍 当前状态检查:', {
                        currentTestStatus: testStatus,
                        currentTestId: currentTestIdRef.current,
                        isRunning,
                        receivedTestId: data.testId,
                        receivedStatus: data.results?.status || data.status
                    });

                    // 🔧 修复：放宽testId匹配条件，避免因ID不匹配导致状态不更新
                    if (data.testId && currentTestIdRef.current && data.testId !== currentTestIdRef.current) {
                        console.warn('⚠️ testId不匹配，但仍处理完成事件:', {
                            received: data.testId,
                            current: currentTestIdRef.current
                        });
                        // 不return，继续处理完成事件
                    }

                    // 🔧 使用统一状态管理处理完成状态 - 状态转换验证会自动处理终态保护
                    if (data.results?.status === 'cancelled' || data.status === 'cancelled' || data.results?.cancelled) {
                        console.log('🛑 服务器返回取消状态，设置取消状态');
                        const result = updateTestStatus('cancelled', '测试已取消');
                        console.log('🔍 取消状态更新结果:', result);
                        setTestProgress('测试已取消');
                    } else if (data.results?.status === 'failed' || data.status === 'failed') {
                        console.log('❌ 测试失败');
                        const result = updateTestStatus('failed', data.results?.error || '测试执行失败');
                        console.log('🔍 失败状态更新结果:', result);
                        setTestProgress('测试失败');
                    } else {
                        console.log('✅ 测试正常完成，尝试更新状态为completed');
                        const result = updateTestStatus('completed', '压力测试完成！');
                        console.log('🔍 完成状态更新结果:', result);
                        if (result !== false) {
                            setTestProgress('压力测试完成！'); // 确保testProgress被设置
                        } else {
                            console.error('❌ 状态更新被阻止，强制设置状态');
                            // 如果状态转换被阻止，强制设置
                            setTestStatus('completed');
                            setIsRunning(false);
                            setCurrentStatus('COMPLETED');
                            setStatusMessage('测试已完成');
                            setTestProgress('压力测试完成！');
                        }
                    }

                    // 🔧 修复：延迟清空testId，确保不会影响其他操作
                    setTimeout(() => setCurrentTestId(null), 1000);
                    setIsInRoom(false);
                    setResult(data.results);



                    if (data.results?.metrics) {
                        console.log('✅ 设置最终指标:', data.results.metrics);
                        setMetrics(data.results.metrics);
                    } else {
                        console.warn('⚠️ 测试完成但没有指标数据');
                    }

                    // 处理WebSocket测试完成数据
                    if (data.results?.realTimeData && data.results.realTimeData.length > 0) {
                        // 设置原始实时数据
                        setRealTimeData(data.results.realTimeData);

                        // 生成聚合数据用于测试结果视图
                        const finalChartData = data.results.realTimeData.map((point: any) => processDataPoint(point, false));
                        setFinalResultData(finalChartData);

                        console.log('🏁 WebSocket测试完成 - 实时数据:', data.results.realTimeData.length, '聚合数据:', finalChartData.length);
                    }

                    // 更新测试记录 (WebSocket)
                    // 🔧 修复：如果测试已被取消，不要覆盖取消状态
                    if (currentRecord && data.results &&
                        !(data.results?.status === 'cancelled' || data.status === 'cancelled' || data.results?.cancelled) &&
                        testStatus !== 'cancelled') { // 🔧 新增：检查前端状态，如果已取消则不更新
                        (async () => {
                            try {
                                const success = data.results.success !== false;
                                const score = data.results.metrics?.averageResponseTime ?
                                    Math.max(0, 100 - Math.min(100, data.results.metrics.averageResponseTime / 10)) : undefined;

                                await completeRecord(currentRecord.id, {
                                    metrics: data.results.metrics,
                                    realTimeData: data.results.realTimeData,
                                    errorBreakdown: data.results.errorBreakdown,
                                    phases: data.results.phases
                                }, score);
                                console.log('✅ WebSocket测试记录已更新');
                            } catch (recordError) {
                                console.warn('⚠️ WebSocket更新测试记录失败:', recordError);
                            }
                        })();
                    } else if (currentRecord && (data.results?.status === 'cancelled' || data.status === 'cancelled' || data.results?.cancelled)) {
                        console.log('🛑 测试已取消，跳过完成记录更新');
                    }
                });

            } catch (error) {
                console.error('WebSocket初始化失败:', error);
            }
        };

        initializeSocket();

        // 清理函数
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            // 清理定期检查定时器
            if (dataCheckIntervalRef.current) {
                clearInterval(dataCheckIntervalRef.current);
                dataCheckIntervalRef.current = null;
            }
        };
    }, []);

    // 统一的房间加入函数 - 避免重复加入
    const joinWebSocketRoom = useCallback((testId: string, force: boolean = false) => {
        const socket = socketRef.current;

        console.log('🔍 房间加入检查:', {
            testId: testId,
            hasSocket: !!socket,
            socketConnected: socket?.connected,
            alreadyJoined: joinedRooms.has(testId),
            force: force
        });

        // 检查是否已经加入过这个房间
        if (!force && joinedRooms.has(testId)) {
            console.log('🏠 房间已加入，跳过:', testId);
            return;
        }

        if (socket && socket.connected && testId) {
            console.log('🏠 加入WebSocket房间:', testId);

            // 🔧 重构：发送新的协议格式
            let userId = 'anonymous-' + Date.now();
            try {
                const userData = localStorage.getItem('user_data');
                if (userData) {
                    const user = JSON.parse(userData);
                    userId = user.id || userId;
                }
            } catch (error) {
                console.warn('获取用户ID失败，使用匿名ID:', error);
            }

            socket.emit('join-stress-test', {
                testId: testId,
                userId: userId
            });

            // 记录已加入的房间
            setJoinedRooms(prev => new Set([...prev, testId]));

            console.log('✅ 房间加入请求已发送:', { testId, userId });
        } else {
            console.warn('⚠️ 无法加入房间:', {
                hasSocket: !!socket,
                connected: socket?.connected,
                testId: testId
            });
        }
    }, [joinedRooms]);

    // ✅ 根本性修复：简化房间管理逻辑，只要有testId和WebSocket连接就加入房间
    useEffect(() => {
        console.log('🔍 房间加入条件检查:', {
            currentTestId: currentTestId,
            socketConnected: socketRef.current?.connected,
            shouldJoinRoom: !!(currentTestId && socketRef.current?.connected)
        });

        // 简化条件：只要有testId和WebSocket连接就加入房间
        if (currentTestId && socketRef.current?.connected) {
            console.log('🏠 立即加入房间:', currentTestId);

            // 立即加入房间
            joinWebSocketRoom(currentTestId);

            // 设置简单的重连检查，只在没有收到数据时才重新加入
            const roomCheckInterval = setInterval(() => {
                if (socketRef.current?.connected && currentTestId) {
                    // 只在没有收到数据时才重新加入房间
                    if (stressTestData.length === 0) {
                        console.log('🔍 没有收到数据，重新加入房间:', currentTestId);
                        joinWebSocketRoom(currentTestId, true); // 强制重新加入
                    }
                }
            }, 10000); // 每10秒检查一次

            return () => {
                clearInterval(roomCheckInterval);
            };
        }

        return undefined;
    }, [currentTestId, joinWebSocketRoom]);

    // 组件卸载时离开房间
    useEffect(() => {
        return () => {
            if (socketRef.current && currentTestId) {
                socketRef.current.emit('leave-stress-test', currentTestId);
                console.log('🏠 组件卸载，离开WebSocket房间:', currentTestId);
            }
        };
    }, []); // 空依赖数组，只在组件卸载时执行

    // 检查测试引擎状态 - 减少频率避免429错误
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const checkEngines = async () => {
            try {
                await testEngineManager.initializeEngines();
                const status = await testEngineManager.checkAllEngines();

                // 引擎状态检查完成（不需要存储状态）
                if (isMounted) {
                    console.log('Engine status checked:', status);
                }
            } catch (error) {
                console.error('Failed to check engines:', error);
                if (isMounted) {
                    console.log('Engine status check failed');
                }
            }
        };

        // 延迟执行，避免React严格模式的重复调用
        timeoutId = setTimeout(() => {
            if (isMounted) {
                checkEngines();
            }
        }, 100);

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    // 🔧 移除强制测试完成检测逻辑 - 改为依赖WebSocket事件
    // 注释掉强制检测，让后端的WebSocket事件来处理测试完成
    /*
    useEffect(() => {
        // 只在测试运行中且有数据时检查
        if (!isRunning || testStatus !== 'running' || stressTestData.length === 0) return;

        const checkForceCompletion = () => {
            const now = Date.now();
            const lastDataPoint = stressTestData[stressTestData.length - 1];

            if (!lastDataPoint || !result?.startTime) return;

            // 计算预期的测试结束时间
            const startTime = new Date(result.startTime).getTime();
            const expectedDuration = (testConfig.duration + (testConfig.rampUp || 0) +
                (testConfig.warmupDuration || 0) + (testConfig.cooldownDuration || 0)) * 1000;
            const expectedEndTime = startTime + expectedDuration;

            // 检查最后数据点的时间
            const lastDataTime = new Date(lastDataPoint.timestamp).getTime();
            const timeSinceLastData = now - lastDataTime;

            console.log('🔍 强制完成检测:', {
                now: new Date(now).toLocaleTimeString(),
                expectedEndTime: new Date(expectedEndTime).toLocaleTimeString(),
                lastDataTime: new Date(lastDataTime).toLocaleTimeString(),
                timeSinceLastData: Math.floor(timeSinceLastData / 1000) + '秒',
                shouldComplete: now > expectedEndTime && timeSinceLastData > 10000
            });

            // 如果当前时间超过预期结束时间，且最后数据超过10秒，强制完成
            if (now > expectedEndTime && timeSinceLastData > 10000) {
                console.log('🔧 强制完成测试：时间已到且数据流停止');
                setTestStatus('completed');
                setTestProgress('压力测试完成！');
                setIsRunning(false);
                setTimeout(() => setCurrentTestId(null), 2000);
            }
        };

        // 每5秒检查一次
        const forceCheckInterval = setInterval(checkForceCompletion, 5000);

        return () => clearInterval(forceCheckInterval);
    }, [isRunning, testStatus, stressTestData.length, result?.startTime, testConfig]);
    */

    // 🔧 移除自动完成检测逻辑 - 改为依赖WebSocket事件
    // 注释掉自动检测，让后端的WebSocket事件来处理测试完成
    /*
    useEffect(() => {
        // 🔧 修复：只在测试真正运行且不是终态时才启用自动完成检测
        if (!isRunning || !currentTestId || stressTestData.length === 0) return () => { };

        // 🔧 修复：如果当前状态是终态，不启用自动完成检测
        const terminalStates = ['completed', 'cancelled', 'failed'];
        if (terminalStates.includes(testStatus)) {
            console.log('🔍 当前状态是终态，跳过自动完成检测:', testStatus);
            return () => { };
        }

        const checkTestCompletion = () => {
            const now = Date.now();
            const lastDataPoint = stressTestData[stressTestData.length - 1];

            if (lastDataPoint) {
                const timeSinceLastData = now - new Date(lastDataPoint.timestamp).getTime();

                // 🔧 修复：根据测试配置动态调整检测时间
                const testDuration = testConfig.duration || 30;
                const detectionTimeout = Math.min(testDuration * 0.2, 15000); // 测试时长的20%，最多15秒

                console.log('🔍 数据流检测:', {
                    timeSinceLastData: timeSinceLastData / 1000 + '秒',
                    detectionTimeout: detectionTimeout / 1000 + '秒',
                    testDuration: testDuration + '秒'
                });

                if (timeSinceLastData > detectionTimeout) {
                    console.log(`🔍 检测到数据流停止超过${detectionTimeout / 1000}秒，检查测试状态`);

                    // 检查测试状态
                    fetch(`/api/stress-test/status/${currentTestId}`)
                        .then(response => {
                            if (response.status === 404) {
                                // 测试不存在，可能已被清理，检查当前状态决定如何处理
                                console.log('🔍 测试状态不存在，检查当前状态:', testStatus);
                                if (testStatus === 'cancelled' || isCancelling) {
                                    console.log('✅ 保持取消状态');
                                    setTestStatus('cancelled');
                                    setTestProgress('测试已取消');
                                    setIsRunning(false);
                                    setCurrentTestId(null);
                                } else {
                                    // 只有在非取消状态时才设置为完成
                                    console.log('✅ 设置为完成状态');
                                    setTestStatus('completed');
                                    setTestProgress('压力测试完成！');
                                    setIsRunning(false);
                                    // 🔧 修复：延迟清空testId，避免状态被重置
                                    setTimeout(() => setCurrentTestId(null), 2000);
                                }
                                return null;
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (!data) return; // 404情况已处理

                            if (data.success && data.data.status === 'completed') {
                                console.log('✅ 确认测试已完成');
                                setTestStatus('completed');
                                setTestProgress('压力测试完成！');
                                setIsRunning(false);
                                // 🔧 修复：延迟清空testId，避免状态被重置
                                setTimeout(() => setCurrentTestId(null), 2000);

                                // 设置最终结果
                                if (data.data.metrics) {
                                    setResult({
                                        ...data.data,
                                        metrics: data.data.metrics
                                    });
                                }
                            } else if (data.success && data.data.status === 'cancelled') {
                                // 🔧 修复：处理取消状态
                                console.log('✅ 确认测试已取消');
                                setTestStatus('cancelled');
                                setTestProgress('测试已取消');
                                setIsRunning(false);
                                setCurrentTestId(null);
                            }
                        })
                        .catch(error => {
                            console.warn('⚠️ 检查测试状态失败:', error);
                        });
                }
            }
        };

        // 🔧 修复：更频繁的检查，确保及时检测到测试完成
        const completionCheckInterval = setInterval(checkTestCompletion, 2000); // 每2秒检查一次

        // 🔧 新增：基于测试配置的主动完成检测
        const expectedTestDuration = (testConfig.duration || 30) + (testConfig.rampUp || 0) +
            (testConfig.warmupDuration || 0) + (testConfig.cooldownDuration || 0);

        // 使用第一个数据点的时间戳作为测试开始时间的估算
        const testStartTime = stressTestData.length > 0 ?
            (typeof stressTestData[0].timestamp === 'string' ?
                new Date(stressTestData[0].timestamp).getTime() :
                stressTestData[0].timestamp) :
            Date.now();

        const expectedEndTime = testStartTime + (expectedTestDuration * 1000) + 15000; // 额外15秒缓冲

        const checkExpectedCompletion = () => {
            const now = Date.now();
            if (now > expectedEndTime && isRunning && currentTestId) {
                console.log('🕐 测试已超过预期结束时间，主动检查状态', {
                    now: new Date(now).toLocaleTimeString(),
                    expectedEndTime: new Date(expectedEndTime).toLocaleTimeString(),
                    testStartTime: new Date(testStartTime).toLocaleTimeString(),
                    expectedDuration: expectedTestDuration + '秒'
                });
                checkTestCompletion();
            }
        };

        const expectedCompletionIntervalId = setInterval(checkExpectedCompletion, 3000); // 每3秒检查预期完成时间

        return () => {
            clearInterval(completionCheckInterval);
            clearInterval(expectedCompletionIntervalId);
        };
    }, [isRunning, currentTestId, stressTestData.length, testStatus]); // 添加testStatus依赖
    */

    // 生成测试ID
    const generateTestId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        return `stress_${timestamp}_${random}`;
    };



    const handleStartTest = async () => {
        // 检查登录状态 - 要求登录
        if (!requireLogin()) {
            return;
        }

        if (!testConfig.url.trim()) {
            setError('请输入测试 URL');
            return;
        }

        // 如果选择本地测试且可用，使用本地测试引擎
        if (useLocalTest && localStressTest.isAvailable) {
            return handleStartLocalTest();
        }

        // 防止重复启动测试
        if (isRunning || currentStatus === 'STARTING' || currentStatus === 'RUNNING') {
            console.warn('⚠️ 测试已在运行中，防止重复启动');
            setError('测试已在运行中，请等待当前测试完成');
            return;
        }

        // 🔧 使用统一状态管理检查是否可以启动新测试
        if (currentTestId || currentTestIdRef.current) {
            // 检查当前测试状态是否为终态
            const isTerminalState = ['completed', 'cancelled', 'failed'].includes(testStatus);

            if (isTerminalState) {
                console.log('🧹 检测到终态测试，清理旧测试ID并允许启动新测试:', {
                    currentTestId,
                    testStatus,
                    action: '清理并继续'
                });
                setCurrentTestId(null);
                currentTestIdRef.current = null;
            } else {
                console.warn('⚠️ 检测到活跃的测试，防止重复启动:', {
                    currentTestId,
                    currentTestIdRef: currentTestIdRef.current,
                    testStatus
                });
                setError('检测到正在运行的测试，请先取消当前测试');
                return;
            }
        }

        try {
            console.log('🎯 开始压力测试:', testConfig.url);
            console.log('🔧 当前测试配置:', {
                users: testConfig.users,
                duration: testConfig.duration,
                testType: testConfig.testType,

                selectedTemplate: selectedTemplate
            });

            // 服务器端测试模式
            // 🔧 使用统一状态管理设置启动状态
            updateTestStatus('starting', '正在启动压力测试引擎...');

            // 清理之前的状态
            setError(null);
            setResult(null);
            setStressTestData([]);
            setMetrics(null);
            setCanSwitchPages(false);

            // 格式化 URL
            const formatUrl = (url: string): string => {
                const trimmedUrl = url.trim();
                if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                    return trimmedUrl;
                }
                return `https:/\${trimmedUrl}`;
            };

            // 转换配置格式
            const lifecycleConfig: LifecycleStressTestConfig = {
                ...testConfig,
                url: formatUrl(testConfig.url)
            };

            // 使用新的状态管理系统启动测试
            const recordId = await lifecycleManager.startTest(lifecycleConfig);
            console.log('✅ 测试已启动，记录ID:', recordId);

        } catch (error: any) {
            console.error('❌ 启动测试失败:', error);
            setError(error.message || '启动测试失败');
            // 🔧 使用统一状态管理设置失败状态
            updateTestStatus('failed', error.message || '启动测试失败');
        }
    };

    // 本地压力测试处理函数
    const handleStartLocalTest = async () => {
        try {
            setError('');
            setCurrentStatus('STARTING');
            setStatusMessage('正在启动本地压力测试...');

            // 获取推荐配置
            const recommended = localStressTest.getRecommendedConfig(testConfig.users);

            // 合并配置
            const localConfig = {
                url: testConfig.url,
                users: testConfig.users,
                duration: testConfig.duration,
                testType: testConfig.testType as 'load' | 'stress' | 'spike' | 'volume',
                rampUp: testConfig.rampUp,
                thinkTime: testConfig.thinkTime,
                method: testConfig.method,
                timeout: testConfig.timeout,
                ...recommended
            };

            console.log('🚀 启动本地压力测试:', localConfig);

            // 启动本地测试
            await localStressTest.startTest(localConfig);

            setCurrentStatus('RUNNING');
            setStatusMessage('本地压力测试正在运行...');
            setIsRunning(true);

        } catch (error: any) {
            console.error('❌ 启动本地测试失败:', error);
            setError(error.message || '启动本地测试失败');
            setCurrentStatus('FAILED');
            setStatusMessage('本地测试启动失败');
        }
    };

    // 停止本地测试
    const handleStopLocalTest = async () => {
        try {
            setStatusMessage('正在停止本地测试...');
            await localStressTest.stopTest();
            setCurrentStatus('COMPLETED');
            setStatusMessage('本地测试已停止');
            setIsRunning(false);
        } catch (error: any) {
            console.error('❌ 停止本地测试失败:', error);
            setError(error.message || '停止本地测试失败');
        }
    };

    // 完整的重置函数
    const resetTestState = useCallback(() => {
        console.log('🔄 重置所有测试状态...');

        // 🔧 使用统一状态管理重置状态
        updateTestStatus('idle', '准备开始测试');

        // 重置其他状态
        setTestProgress('');
        setIsStopping(false);
        setError('');
        setBackgroundTestInfo(null); // 🔧 修复：重置后台测试信息

        // 重置数据
        setStressTestData([]);  // 🔧 清理唯一数据源
        setMetrics(null);
        setResult(null);

        // 重置测试ID和记录ID
        setCurrentTestId(null);
        setCurrentRecordId(null);
        currentTestIdRef.current = '';

        // 重置房间状态
        setIsInRoom(false);
        setCanSwitchPages(true);

        // 断开WebSocket连接并重新连接
        if (socketRef.current) {
            console.log('🔌 断开WebSocket连接...');
            socketRef.current.disconnect();

            // 等待一小段时间后重新连接
            setTimeout(() => {
                if (socketRef.current && !socketRef.current.connected) {
                    console.log('🔌 重新连接WebSocket...');
                    socketRef.current.connect();
                }
            }, 1000);
        }

        console.log('✅ 测试状态重置完成');
    }, []);

    const handleCancelTest = async () => {
        console.log('🔍 取消按钮被点击，当前状态:', {
            currentTestId,
            currentTestIdRef: currentTestIdRef.current,
            isRunning,
            testStatus,
            isCancelling,
            stressTestDataLength: stressTestData.length,
            lastDataPoint: stressTestData[stressTestData.length - 1],
            useLocalTest,
            localTestRunning: localStressTest.isRunning
        });

        // 防止重复取消
        if (isCancelling || cancelInProgress) {
            console.log('⚠️ 正在取消中，忽略重复请求');
            return;
        }

        // 如果是本地测试，直接停止
        if (useLocalTest && localStressTest.isRunning) {
            return handleStopLocalTest();
        }

        // 检查是否有正在运行的测试
        if (!isRunning && testStatus !== 'running') {
            console.log('⚠️ 没有正在运行的测试需要取消');
            return;
        }

        // 🔧 修复：不要在这里清理测试ID，保留测试ID用于取消操作
        console.log('🔍 保留测试ID用于取消操作:', {
            currentTestId,
            currentTestIdRef: currentTestIdRef.current
        });

        // 显示专业的取消确认对话框
        setShowCancelDialog(true);
    };

    // 处理取消确认
    const handleCancelConfirm = async (reason: string, preserveData: boolean) => {
        console.log('✅ 用户确认取消测试，开始执行取消逻辑...', { reason, preserveData });

        setShowCancelDialog(false);
        setCancelInProgress(true);
        setShowCancelProgress(true);

        // 立即设置取消状态
        setIsCancelling(true);

        try {
            // 获取要取消的测试ID
            const testIdToCancel = currentTestIdRef.current || currentTestId;
            console.log('🛑 准备取消测试:', {
                testIdToCancel,
                currentTestIdRef: currentTestIdRef.current,
                currentTestId,
                isRunning,
                testStatus
            });

            // 🔧 修复：先发送WebSocket取消事件，再调用后端API
            if (testIdToCancel && socketRef.current) {
                console.log('📡 发送WebSocket取消事件...');
                socketRef.current.emit('cancel-stress-test', {
                    testId: testIdToCancel,
                    reason: reason || '用户手动取消',
                    timestamp: Date.now()
                });
            }

            // 如果有测试ID，调用后端取消API
            if (testIdToCancel) {
                console.log('📡 调用后端取消API...');
                console.log('📡 请求URL:', `/api/test/stress/cancel/${testIdToCancel}`);
                console.log('📡 请求头:', {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                });
                console.log('📡 请求体:', JSON.stringify({
                    reason: reason,
                    preserveData: preserveData
                }));

                try {
                    const response = await fetch(`/api/test/stress/cancel/${testIdToCancel}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify({
                            reason: reason || '用户手动取消',
                            preserveData: preserveData
                        })
                    });

                    console.log('📡 响应状态:', response.status, response.statusText);
                    console.log('📡 响应头:', Object.fromEntries(response.headers.entries()));

                    if (response.ok) {
                        const result = await response.json();
                        console.log('✅ 后端取消成功:', result);

                        // 如果后端确认取消成功，立即设置本地状态
                        if (result.success) {
                            console.log('🎯 后端确认取消成功，更新本地状态');

                            // 🔧 修复：更新测试记录状态
                            if (currentRecord) {
                                try {
                                    await cancelRecord(currentRecord.id, reason || '用户手动取消');
                                    console.log('✅ 测试记录已标记为取消');
                                } catch (recordError) {
                                    console.warn('⚠️ 更新取消记录失败:', recordError);
                                }
                            }
                        }
                    } else {
                        const errorText = await response.text();
                        console.warn('⚠️ 后端取消失败:', response.status, errorText);

                        // 即使后端取消失败，也要设置本地状态和更新记录
                        console.log('🔄 后端取消失败，但仍设置本地取消状态');

                        // 🔧 修复：即使后端失败也要更新测试记录状态
                        if (currentRecord) {
                            try {
                                await cancelRecord(currentRecord.id, reason || '用户手动取消');
                                console.log('✅ 测试记录已标记为取消（后端失败但本地成功）');
                            } catch (recordError) {
                                console.warn('⚠️ 更新取消记录失败:', recordError);
                            }
                        }
                    }
                } catch (fetchError) {
                    console.error('❌ 网络请求失败:', fetchError);
                }
            } else {
                console.warn('⚠️ 没有找到测试ID，无法调用后端取消API');

                // 🔧 修复：即使没有测试ID也要更新测试记录状态
                if (currentRecord) {
                    try {
                        await cancelRecord(currentRecord.id, reason || '用户手动取消');
                        console.log('✅ 测试记录已标记为取消（无测试ID情况）');
                    } catch (recordError) {
                        console.warn('⚠️ 更新取消记录失败:', recordError);
                    }
                }
            }

            // 🔧 使用统一状态管理设置取消状态
            console.log('🔄 设置本地取消状态...');
            updateTestStatus('cancelled', '测试已取消');
            setCanSwitchPages(true);

            // 🔧 修复：延迟断开WebSocket连接，确保取消事件已发送
            setTimeout(() => {
                if (socketRef.current) {
                    console.log('🔌 延迟断开WebSocket连接...');
                    // 先离开测试房间
                    if (testIdToCancel) {
                        socketRef.current.emit('leave-stress-test', testIdToCancel);
                    }
                    // 然后断开连接
                    setTimeout(() => {
                        if (socketRef.current) {
                            socketRef.current.disconnect();
                        }
                    }, 500);
                }
            }, 1000);

            // 清理实时数据接收
            console.log('🧹 清理测试相关状态...');

            // 🔧 修复：在WebSocket事件发送后再清理测试ID
            console.log('🧹 延迟清理测试ID，确保取消事件已发送...');
            setTimeout(() => {
                console.log('🧹 现在清理测试ID...');
                setCurrentTestId(null);
                currentTestIdRef.current = null;
            }, 2000); // 延迟2秒清理，确保所有取消操作完成

            console.log('✅ 取消测试完成');

        } catch (error: any) {
            console.error('❌ 取消测试失败:', error);
            setError(error.message || '取消测试失败');

            // 🔧 修复：只有在出错时才立即清理状态，成功时让进度组件处理
            setIsCancelling(false);
            setCancelInProgress(false);
            setShowCancelProgress(false);
        }
        // 🔧 修复：移除finally块，让取消进度组件控制状态清理
    };

    // 处理取消进度完成
    const handleCancelProgressComplete = () => {
        setShowCancelProgress(false);
        setCancelInProgress(false);

        // 🔧 使用统一状态管理确保取消状态
        updateTestStatus('cancelled', '测试已取消');

        // 🔧 修复：测试ID已在handleCancelConfirm中清理，这里不需要重复清理
        console.log('✅ 取消进度完成，状态已更新');
    };

    // 处理取消对话框关闭
    const handleCancelDialogClose = () => {
        setShowCancelDialog(false);
    };

    // 向后兼容的停止测试方法
    const handleStopTest = handleCancelTest;

    // 强制取消测试（紧急情况下使用）
    const forceStopTest = useCallback(() => {
        console.log('🚨 强制停止测试');

        // 立即设置所有相关状态
        setIsRunning(false);
        setIsCancelling(false);
        setIsStopping(false);
        setTestStatus('cancelled');
        setCurrentStatus('CANCELLED');
        setStatusMessage('测试已强制取消');
        setCanSwitchPages(true);

        // 断开WebSocket连接
        if (socketRef.current) {
            console.log('🔌 强制断开WebSocket连接...');
            socketRef.current.disconnect();
        }

        // 清理测试ID
        setCurrentTestId(null);
        currentTestIdRef.current = null;

        console.log('✅ 强制取消完成');
    }, []);

    // 动态进度计算函数
    const calculateTestProgress = useCallback(() => {
        const now = Date.now();
        let progress = 0;
        let timeInfo = '';
        let estimatedRemaining = '';

        switch (testStatus) {
            case 'idle':
                progress = 0;
                timeInfo = '准备开始测试';
                break;

            case 'starting':
                progress = 5;
                timeInfo = '正在启动测试引擎...';
                break;

            case 'running':
                if (result?.startTime) {
                    const startTime = new Date(result.startTime).getTime();
                    const elapsed = Math.max(0, (now - startTime) / 1000); // 已运行秒数

                    // 🔧 改进：更精确的阶段划分和进度计算
                    const rampUpDuration = testConfig.rampUp || 0;
                    const mainTestDuration = testConfig.duration;
                    const warmupDuration = testConfig.warmupDuration || 0;
                    const cooldownDuration = testConfig.cooldownDuration || 0;
                    const totalDuration = rampUpDuration + mainTestDuration + warmupDuration + cooldownDuration;

                    // 计算当前阶段和进度
                    let currentPhase = '';
                    let phaseProgress = 0;

                    if (elapsed <= rampUpDuration) {
                        // 加压阶段：5% - 20%
                        currentPhase = '加压阶段';
                        phaseProgress = 5 + (elapsed / rampUpDuration) * 15;
                    } else if (elapsed <= rampUpDuration + mainTestDuration) {
                        // 主测试阶段：20% - 90%
                        currentPhase = '主测试阶段';
                        const mainElapsed = elapsed - rampUpDuration;
                        phaseProgress = 20 + (mainElapsed / mainTestDuration) * 70;
                    } else if (elapsed <= rampUpDuration + mainTestDuration + cooldownDuration) {
                        // 冷却阶段：90% - 100%
                        currentPhase = '冷却阶段';
                        const cooldownElapsed = elapsed - rampUpDuration - mainTestDuration;
                        phaseProgress = 90 + (cooldownElapsed / Math.max(cooldownDuration, 1)) * 10;
                    } else {
                        // 超时阶段
                        currentPhase = '超时运行';
                        phaseProgress = 100;
                    }

                    progress = Math.min(phaseProgress, 100);

                    // 🔧 改进：更精确的时间信息显示
                    const formatTime = (seconds: number) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        const ms = Math.floor((seconds % 1) * 10); // 显示到0.1秒
                        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}.${ms}` : `${secs}.${ms}秒`;
                    };

                    if (elapsed < totalDuration) {
                        const remaining = Math.max(0, totalDuration - elapsed);
                        timeInfo = `${currentPhase} - 已运行 ${formatTime(elapsed)}`;
                        estimatedRemaining = `预计剩余 ${formatTime(remaining)}`;
                    } else {
                        const overtime = elapsed - totalDuration;
                        timeInfo = `${currentPhase} - 已运行 ${formatTime(elapsed)}`;
                        if (overtime > 0) {
                            estimatedRemaining = `已超时 ${formatTime(overtime)}`;
                        }
                    }
                } else {
                    // 没有开始时间，使用数据点数量估算，但也要基于时间
                    const dataPoints = stressTestData.length;
                    const estimatedTotal = testConfig.users * testConfig.duration;
                    const dataProgress = Math.min(dataPoints / Math.max(estimatedTotal, 1), 1);

                    // 如果有实时数据，尝试从最新数据点获取时间信息
                    if (stressTestData.length > 0) {
                        const latestData = stressTestData[stressTestData.length - 1];
                        const testStartTime = stressTestData[0]?.timestamp;
                        if (testStartTime && latestData.timestamp) {
                            const elapsed = (new Date(latestData.timestamp).getTime() - new Date(testStartTime).getTime()) / 1000;
                            const totalDuration = testConfig.duration + (testConfig.rampUp || 0);
                            const timeProgress = Math.min(elapsed / totalDuration, 1);
                            progress = 5 + (timeProgress * 95);
                            const formatTime = (seconds: number) => {
                                const mins = Math.floor(seconds / 60);
                                const secs = Math.floor(seconds % 60);
                                const ms = Math.floor((seconds % 1) * 10);
                                return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}.${ms}` : `${secs}.${ms}秒`;
                            };
                            timeInfo = `已运行 ${formatTime(elapsed)} (${dataPoints} 数据点)`;
                        } else {
                            progress = 5 + (dataProgress * 95);
                            timeInfo = `已收集 ${dataPoints} 个数据点`;
                        }
                    } else {
                        progress = 5 + (dataProgress * 95);
                        timeInfo = `已收集 ${dataPoints} 个数据点`;
                    }
                }
                break;

            case 'completed':
                progress = 100;
                // 🔧 改进：完成状态也使用精确时间格式
                const formatCompletedTime = (seconds: number) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    const ms = Math.floor((seconds % 1) * 10);
                    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}.${ms}` : `${secs}.${ms}秒`;
                };

                if (result?.startTime && result?.endTime) {
                    const duration = (new Date(result.endTime).getTime() - new Date(result.startTime).getTime()) / 1000;
                    timeInfo = `测试完成，总用时 ${formatCompletedTime(duration)}`;
                } else if (result?.startTime) {
                    const duration = (now - new Date(result.startTime).getTime()) / 1000;
                    timeInfo = `测试完成，总用时 ${formatCompletedTime(duration)}`;
                } else {
                    timeInfo = '测试已完成';
                }
                break;

            case 'cancelled':
                // 🔧 修复：保持实际运行进度，基于真实时间计算，使用精确时间格式
                if (result?.startTime) {
                    const startTime = new Date(result.startTime).getTime();
                    const elapsed = Math.max(0, (now - startTime) / 1000);
                    const totalDuration = testConfig.duration + (testConfig.rampUp || 0) +
                        (testConfig.warmupDuration || 0) + (testConfig.cooldownDuration || 0);
                    const timeProgress = Math.min(elapsed / totalDuration, 1);
                    progress = 5 + (timeProgress * 95); // 基于实际时间的真实进度

                    const formatCancelledTime = (seconds: number) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        const ms = Math.floor((seconds % 1) * 10);
                        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}.${ms}` : `${secs}.${ms}秒`;
                    };
                    timeInfo = `测试已取消，运行了 ${formatCancelledTime(elapsed)}`;
                } else {
                    progress = Math.max(5, stressTestData.length > 0 ? 30 : 5);
                    timeInfo = '测试已取消';
                }
                break;

            case 'failed':
                // 🔧 修复：保持实际运行进度，基于真实时间计算，使用精确时间格式
                if (result?.startTime) {
                    const startTime = new Date(result.startTime).getTime();
                    const elapsed = Math.max(0, (now - startTime) / 1000);
                    const totalDuration = testConfig.duration + (testConfig.rampUp || 0) +
                        (testConfig.warmupDuration || 0) + (testConfig.cooldownDuration || 0);
                    const timeProgress = Math.min(elapsed / totalDuration, 1);
                    progress = 5 + (timeProgress * 95); // 基于实际时间的真实进度

                    const formatFailedTime = (seconds: number) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        const ms = Math.floor((seconds % 1) * 10);
                        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}.${ms}` : `${secs}.${ms}秒`;
                    };
                    timeInfo = `测试失败，运行了 ${formatFailedTime(elapsed)}`;
                } else {
                    progress = 5;
                    timeInfo = '测试启动失败';
                }
                break;

            default:
                progress = 0;
                timeInfo = '未知状态';
        }

        return {
            progress: Math.round(progress),
            timeInfo,
            estimatedRemaining
        };
    }, [testStatus, testConfig, result, stressTestData.length]);

    // 定期更新进度条（用于动态显示）- 🔧 提高更新频率以显示精确时间
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        // 在测试运行中时启动定时器，完成状态下永久保持更新
        if (testStatus === 'running' || ['completed', 'cancelled', 'failed'].includes(testStatus)) {
            intervalId = setInterval(() => {
                // 强制重新渲染以更新进度条
                // 这会触发calculateTestProgress的重新计算
                setTestProgress(prev => prev); // 触发重新渲染
            }, 100); // 🔧 改进：每100毫秒更新一次，提供更精确的时间显示
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [testStatus, result]);

    // 确保测试完成后进度条永久保持显示
    useEffect(() => {
        // 为所有完成状态确保有进度信息
        if (['completed', 'cancelled', 'failed'].includes(testStatus) && (result || metrics) && !testProgress) {
            const statusMessages = {
                completed: '测试已完成',
                cancelled: '测试已取消',
                failed: '测试失败'
            };
            setTestProgress(statusMessages[testStatus as keyof typeof statusMessages]);
        }
    }, [testStatus, result, metrics, testProgress]);

    // 导出模态框状态
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // 处理导出
    const handleExport = async (exportType: string, data: any) => {
        try {
            await ExportUtils.exportByType(exportType, data);
            setIsExportModalOpen(false);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请重试');
        }
    };

    // 设置基线数据
    const handleSaveAsBaseline = (data: any) => {
        setBaselineData({
            name: `基线 - ${new Date().toLocaleDateString()}`,
            metrics: data.metrics,
            thresholds: {
                responseTime: { warning: data.metrics.averageResponseTime * 1.2, critical: data.metrics.averageResponseTime * 1.5 },
                throughput: { warning: data.metrics.throughput * 0.8, critical: data.metrics.throughput * 0.6 },
                errorRate: { warning: 5, critical: 10 }
            }
        });
        alert('基线数据已保存');
    };



    const handleExportReport = (format: 'json' | 'csv' | 'html' | 'pdf' = 'json') => {
        if (!result) {
            alert('没有测试结果可导出');
            return;
        }

        try {
            const report = {
                type: 'stress' as const,
                timestamp: Date.now(),
                url: testConfig.url,
                metrics: result.metrics,
                duration: testConfig.duration
            };

            // 根据格式导出不同类型的文件
            let dataStr: string;
            let mimeType: string;
            let fileExtension: string;

            switch (format) {
                case 'json':
                    dataStr = JSON.stringify(report, null, 2);
                    mimeType = 'application/json';
                    fileExtension = 'json';
                    break;
                case 'csv':
                    // 简单的CSV格式
                    dataStr = `URL,Duration,Total Requests,Success Rate,Average Response Time/n${testConfig.url},${testConfig.duration},${result.metrics.totalRequests},${result.metrics.successRate}%,${result.metrics.averageResponseTime}ms`;
                    mimeType = 'text/csv';
                    fileExtension = 'csv';
                    break;
                case 'html':
                    // 简单的HTML报告
                    dataStr = `<!DOCTYPE html><html><head><title>压力测试报告</title></head><body><h1>压力测试报告</h1><pre>${JSON.stringify(report, null, 2)}</pre></body></html>`;
                    mimeType = 'text/html';
                    fileExtension = 'html';
                    break;
                default:
                    dataStr = JSON.stringify(report, null, 2);
                    mimeType = 'application/json';
                    fileExtension = 'json';
            }

            const dataBlob = new Blob([dataStr], { type: mimeType });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `stress-test-report-${Date.now()}.${fileExtension}`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('启动测试失败:', error);
            setError(error.message || '启动测试失败');
            setTestStatus('failed');
            setIsRunning(false);
        }
    };

    const handleApplyTemplate = (templateId: string) => {
        // 简化的模板应用
        const templates: Record<string, Partial<StressTestConfig>> = {
            'light-load': { users: 5, duration: 30, testType: 'gradual' },
            'medium-load': { users: 20, duration: 60, testType: 'gradual' },
            'heavy-load': { users: 50, duration: 120, testType: 'stress' }
        };

        const template = templates[templateId];
        if (template) {
            setTestConfig((prev: StressTestConfig) => ({ ...prev, ...template }));
        }
    };



    // 代理测试状态
    const [proxyTestStatus, setProxyTestStatus] = useState<{
        testing: boolean;
        result: 'success' | 'error' | null;
        message: string;
        error?: string;
        details?: {
            proxyIp?: string;
            location?: string | {
                country?: string;
                countryCode?: string;
                region?: string;
                city?: string;
                timezone?: string;
            };
            responseTime?: number;
            networkLatency?: number;
            proxyResponseTime?: number;
            errorCode?: string;
            troubleshooting?: string[];
        };
    }>({
        testing: false,
        result: null,
        message: ''
    });



    // 根据测试类型获取推荐配置
    const getRecommendedConfig = (testType: string) => {
        const configs = {
            gradual: {
                users: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 20, description: '逐步增加负载 - 无限制' },
                duration: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 180, description: '需要足够时间观察爬坡过程 - 无限制' },
                rampUp: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 30, description: '缓慢加压时间 - 无限制' }
            },
            spike: {
                users: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 50, description: '瞬间高并发冲击 - 无限制' },
                duration: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 60, description: '短时间高强度测试 - 无限制' },
                rampUp: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 5, description: '快速启动时间 - 无限制' }
            },
            constant: {
                users: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 30, description: '稳定持续负载 - 无限制' },
                duration: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 300, description: '长时间稳定性测试 - 无限制' },
                rampUp: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 10, description: '快速达到目标负载 - 无限制' }
            },
            stress: {
                users: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 100, description: '高强度压力测试 - 无限制' },
                duration: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 240, description: '充分的压力测试时间 - 无限制' },
                rampUp: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 30, description: '分阶段加压 - 无限制' }
            },
            load: {
                users: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 40, description: '模拟真实用户负载 - 无限制' },
                duration: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 600, description: '长时间真实场景测试 - 无限制' },
                rampUp: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 60, description: '模拟用户逐步进入 - 无限制' }
            },
            volume: {
                users: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 200, description: '大量数据处理测试 - 无限制' },
                duration: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 120, description: '高频请求测试 - 无限制' },
                rampUp: { min: 1, max: Number.MAX_SAFE_INTEGER, recommended: 10, description: '快速达到最大容量 - 无限制' }
            }
        };
        return configs[testType as keyof typeof configs] || configs.gradual;
    };

    // 智能调整配置参数
    const adjustConfigForTestType = (testType: string) => {
        const recommended = getRecommendedConfig(testType);
        setTestConfig(prev => ({
            ...prev,
            testType: testType as any,
            users: recommended.users.recommended,
            duration: recommended.duration.recommended,
            rampUp: recommended.rampUp.recommended
        }));
    };



    // 代理分析功能
    const analyzeProxy = async () => {
        if (!testConfig.proxy?.enabled || !testConfig.proxy?.host) {
            alert('请先配置代理设置');
            return;
        }

        try {
            const response = await fetch('/api/test/proxy-analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    proxy: testConfig.proxy
                })
            });

            const result = await response.json();

            if (result.success) {
                const { validation } = result.analysis;

                let message = `代理分析结果:/n/n`;
                message += `代理类型: ${validation.proxyType}/n`;
                message += `服务器可访问: ${validation.accessible ? '是' : '否'}/n`;
                message += `推荐模式: 服务器端测试/n/n`;
                message += `建议:/n${validation.suggestion.join('\n')}`;

                alert(message);
            } else {
                alert(`代理分析失败: ${result.message}`);
            }
        } catch (error) {
            console.error('代理分析失败:', error);
            alert('代理分析失败，请检查网络连接');
        }
    };



    // 测试代理连接
    const testProxyConnection = async () => {
        if (!testConfig.proxy?.enabled || !testConfig.proxy?.host) {
            setProxyTestStatus({
                testing: false,
                result: 'error',
                message: '请先配置代理设置'
            });
            return;
        }

        setProxyTestStatus({
            testing: true,
            result: null,
            message: '正在测试代理延迟...'
        });

        try {
            const response = await fetch('/api/test/proxy-latency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('auth_token') ? {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    } : {})
                },
                body: JSON.stringify({
                    proxy: {
                        enabled: true,
                        type: testConfig.proxy.type || 'http',
                        host: testConfig.proxy.host,
                        port: testConfig.proxy.port || 8080,
                        username: testConfig.proxy.username || '',
                        password: testConfig.proxy.password || ''
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                setProxyTestStatus({
                    testing: false,
                    result: 'success',
                    message: '代理延迟测试成功',
                    details: {
                        proxyIp: result.exitIp,
                        location: result.location,
                        responseTime: result.latency,
                        networkLatency: result.networkLatency,
                        proxyResponseTime: result.proxyResponseTime
                    }
                });
                // 成功状态不自动清除，让用户手动查看
            } else {
                setProxyTestStatus({
                    testing: false,
                    result: 'error',
                    message: result.message || '代理连接测试失败',
                    details: {
                        errorCode: result.error,
                        troubleshooting: result.troubleshooting
                    }
                });
                // 错误状态5秒后自动清除
                setTimeout(() => {
                    setProxyTestStatus({
                        testing: false,
                        result: null,
                        message: ''
                    });
                }, 5000);
            }
        } catch (error) {
            console.error('代理测试失败:', error);
            setProxyTestStatus({
                testing: false,
                result: 'error',
                message: error instanceof Error ? error.message : '网络连接错误'
            });
            // 错误状态5秒后自动清除
            setTimeout(() => {
                setProxyTestStatus({
                    testing: false,
                    result: null,
                    message: ''
                });
            }, 5000);
        }
    };

    // 处理测试选择和重新运行
    const handleTestSelect = (test: any) => {
        console.log('选择测试:', test);
        // 可以在这里加载选中的测试配置
    };

    const handleTestRerun = (test: any) => {
        console.log('重新运行测试:', test);
        // 可以在这里重新运行选中的测试
    };

    return (
        <div className="space-y-4 dark-page-scrollbar">
            <div className="space-y-6">

                {/* 美化的页面标题和控制 */}
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl">
                    {/* 背景装饰 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-cyan-600/5"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-xl"></div>

                    {/* 内容区域 */}
                    <div className="relative p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* 标题区域 */}
                            <div className="flex items-center space-x-4">
                                {/* 图标装饰 */}
                                <div className="relative">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <Zap className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
                                </div>

                                {/* 标题文字 */}
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                                            压力测试
                                        </h2>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                        </div>
                                    </div>
                                    <p className="text-gray-300 text-sm mt-1 flex items-center space-x-2">
                                        <TrendingUp className="w-4 h-4 text-blue-400" />
                                        <span>测试网站在高并发访问下的性能表现</span>
                                    </p>

                                    {/* 状态指示器 */}
                                    <div className="flex items-center space-x-4 mt-2">
                                        <div className="flex items-center space-x-2 text-xs">
                                            <div className={`w-2 h-2 rounded-full ${testStatus === 'running' ? 'bg-green-500 animate-pulse' :
                                                testStatus === 'completed' ? 'bg-blue-500' :
                                                    testStatus === 'failed' ? 'bg-red-500' :
                                                        testStatus === 'cancelled' ? 'bg-yellow-500' :
                                                            'bg-gray-500'
                                                }`}></div>
                                            <span className="text-gray-400">
                                                {testStatus === 'running' ? '测试进行中' :
                                                    testStatus === 'completed' ? '测试完成' :
                                                        testStatus === 'failed' ? '测试失败' :
                                                            testStatus === 'cancelled' ? '测试已取消' :
                                                                '等待开始'}
                                            </span>
                                        </div>

                                        {testConfig.url && (
                                            <div className="flex items-center space-x-2 text-xs">
                                                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                                <span className="text-gray-400 truncate max-w-48">
                                                    目标: {testConfig.url}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 模式切换 - 只在压力测试标签页显示 */}
                            <div className="flex items-center space-x-2">
                                {activeTab === 'test' && (
                                    <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsAdvancedMode(false)}
                                            className={`px-2 py-1 text-xs font-medium rounded transition-all ${!isAdvancedMode
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                        >
                                            简化模式
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAdvancedMode(true)}
                                            className={`px-2 py-1 text-xs font-medium rounded transition-all ${isAdvancedMode
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-gray-300 hover:text-white'
                                                }`}
                                        >
                                            高级模式
                                        </button>
                                    </div>
                                )}

                                {/* 测试状态和控制按钮 */}
                                <div className="flex items-center space-x-2">
                                    {/* 标签页切换 */}
                                    <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('test')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${activeTab === 'test'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                                                }`}
                                        >
                                            压力测试
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('history')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${activeTab === 'history'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                                                }`}
                                        >
                                            测试历史
                                        </button>
                                    </div>
                                    {testStatus === 'idle' ? (
                                        <button
                                            type="button"
                                            onClick={handleStartTest}
                                            disabled={!testConfig.url}
                                            className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${!testConfig.url
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : isAuthenticated
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                }`}
                                        >
                                            <Play className="w-4 h-4" />
                                            <span>开始测试</span>
                                        </button>
                                    ) : testStatus === 'starting' ? (
                                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-md">
                                            <Loader className="w-3 h-3 animate-spin text-blue-400" />
                                            <span className="text-xs text-blue-300 font-medium">正在启动...</span>
                                        </div>
                                    ) : testStatus === 'running' ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md">
                                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                                <span className="text-xs text-green-300 font-medium">
                                                    测试进行中
                                                </span>
                                            </div>



                                            <button
                                                type="button"
                                                onClick={handleCancelTest}
                                                disabled={isCancelling}
                                                className={`px-3 py-1.5 text-white rounded-md transition-colors flex items-center space-x-1.5 text-xs ${isCancelling
                                                    ? 'bg-gray-600 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                                    }`}
                                            >
                                                {isCancelling ? (
                                                    <Loader className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Square className="w-3 h-3" />
                                                )}
                                                <span>{isCancelling ? '取消中...' : '取消'}</span>
                                            </button>
                                            {/* 紧急取消按钮 - 只在正常取消失败时显示 */}
                                            {isCancelling && (
                                                <button
                                                    type="button"
                                                    onClick={forceStopTest}
                                                    className="px-2 py-1.5 text-white rounded-md transition-colors flex items-center space-x-1 text-xs bg-red-800 hover:bg-red-900 border border-red-600"
                                                    title="强制取消测试（紧急情况下使用）"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span>强制取消</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : testStatus === 'completed' ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span className="text-sm text-green-300 font-medium">测试完成</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={resetTestState}
                                                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>重新测试</span>
                                            </button>
                                        </div>
                                    ) : testStatus === 'failed' ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                                                <XCircle className="w-4 h-4 text-red-400" />
                                                <span className="text-sm text-red-300 font-medium">测试失败</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTestStatus('idle');
                                                    setTestProgress('');
                                                    setError('');
                                                }}
                                                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>重试</span>
                                            </button>
                                        </div>
                                    ) : testStatus === 'cancelled' ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                                <Square className="w-4 h-4 text-yellow-400" />
                                                <span className="text-sm text-yellow-300 font-medium">测试已取消</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={resetTestState}
                                                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>重新测试</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                                            <span className="text-sm text-red-300">未知状态: {testStatus}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 根据标签页显示不同内容 */}
                {
                    activeTab === 'test' ? (
                        <>
                            {/* URL 输入与测试进度融合区域 */}
                            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 url-input-card">
                                <label className="block text-sm font-medium text-gray-300 mb-2">测试URL</label>
                                <div className="url-input-container">
                                    <URLInput
                                        value={testConfig.url}
                                        onChange={(url) => setTestConfig((prev: StressTestConfig) => ({ ...prev, url }))}
                                        placeholder="输入要进行压力测试的网站URL..."
                                        enableReachabilityCheck={false}
                                        className="url-input-full-width"
                                    />
                                </div>

                                {/* 集成的测试进度显示 - 永久保持显示直到重置 */}
                                {(testProgress || backgroundTestInfo || testStatus !== 'idle' || result || metrics) && (
                                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                                        {(() => {
                                            const progressData = calculateTestProgress();
                                            return (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center space-x-2">
                                                            <div className={`w-2 h-2 rounded-full ${testStatus === 'running' ? 'bg-blue-400 animate-pulse' :
                                                                testStatus === 'completed' ? 'bg-green-400' :
                                                                    testStatus === 'cancelled' ? 'bg-yellow-400' :
                                                                        testStatus === 'failed' ? 'bg-red-400' :
                                                                            'bg-gray-400'
                                                                }`}></div>
                                                            <span className="text-sm font-medium text-white">
                                                                {testStatus === 'running' ? '测试进行中' :
                                                                    testStatus === 'completed' ? '测试已完成' :
                                                                        testStatus === 'cancelled' ? '测试已取消' :
                                                                            testStatus === 'failed' ? '测试失败' :
                                                                                testStatus === 'starting' ? '正在启动' : '测试状态'}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-blue-300 font-medium">
                                                            {progressData.progress}%
                                                        </span>
                                                    </div>

                                                    {/* 动态进度条 - 测试完成后永久显示 */}
                                                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                                                        <div
                                                            className={`test-progress-dynamic h-2 rounded-full transition-all duration-300 ${progressData.progress >= 100 ? 'progress-100' :
                                                                progressData.progress >= 95 ? 'progress-95' :
                                                                    progressData.progress >= 90 ? 'progress-90' :
                                                                        progressData.progress >= 85 ? 'progress-85' :
                                                                            progressData.progress >= 80 ? 'progress-80' :
                                                                                progressData.progress >= 75 ? 'progress-75' :
                                                                                    progressData.progress >= 70 ? 'progress-70' :
                                                                                        progressData.progress >= 65 ? 'progress-65' :
                                                                                            progressData.progress >= 60 ? 'progress-60' :
                                                                                                progressData.progress >= 55 ? 'progress-55' :
                                                                                                    progressData.progress >= 50 ? 'progress-50' :
                                                                                                        progressData.progress >= 45 ? 'progress-45' :
                                                                                                            progressData.progress >= 40 ? 'progress-40' :
                                                                                                                progressData.progress >= 35 ? 'progress-35' :
                                                                                                                    progressData.progress >= 30 ? 'progress-30' :
                                                                                                                        progressData.progress >= 25 ? 'progress-25' :
                                                                                                                            progressData.progress >= 20 ? 'progress-20' :
                                                                                                                                progressData.progress >= 15 ? 'progress-15' :
                                                                                                                                    progressData.progress >= 10 ? 'progress-10' :
                                                                                                                                        progressData.progress >= 5 ? 'progress-5' : 'progress-0'
                                                                }`}
                                                            style={{ '--progress-width': `${progressData.progress}%` } as React.CSSProperties}
                                                        />
                                                    </div>

                                                    {/* 进度描述 */}
                                                    <div className="text-xs text-gray-400 mb-2">
                                                        {progressData.timeInfo}
                                                    </div>

                                                    {/* 预计剩余时间 */}
                                                    {progressData.estimatedRemaining && (
                                                        <div className="text-xs text-blue-300 mb-2">
                                                            {progressData.estimatedRemaining}
                                                        </div>
                                                    )}

                                                    {/* 后台运行提示 */}
                                                    {testStatus === 'running' && canSwitchPages && (
                                                        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                                                            <div className="flex items-center space-x-1.5">
                                                                <CheckCircle className="w-3 h-3 text-green-400" />
                                                                <span className="text-xs text-green-300 font-medium">后台运行模式</span>
                                                            </div>
                                                            <p className="text-xs text-green-200 mt-0.5">
                                                                测试正在后台运行，您可以自由切换到其他页面，测试不会中断。
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* 错误信息显示 */}
                                {error && (
                                    <div className="mt-4 pt-4 border-t border-red-500/20">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                            <span className="text-sm font-medium text-red-300">测试错误</span>
                                        </div>
                                        <div className="text-sm text-red-200 bg-red-500/10 rounded p-2">
                                            {error}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 队列状态显示 - 只在有排队或当前测试在队列中时显示 */}
                            {(queueStats.queueLength > 0 || currentQueueId) && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                    {/* 当前测试在队列中的位置 */}
                                    {currentQueueId ? (
                                        <div>
                                            <div className="flex items-center text-blue-300 mb-2">
                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                <span className="font-medium">您的测试在队列中</span>
                                            </div>
                                            <div className="text-sm text-blue-200">
                                                队列位置: 第 {getQueuePosition(currentQueueId)} 位
                                                {estimateWaitTime(currentQueueId) > 0 && (
                                                    <span className="ml-2">
                                                        预计等待: {Math.round(estimateWaitTime(currentQueueId) / 60)} 分钟
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : queueStats.queueLength > 0 && (
                                        <div>
                                            <div className="flex items-center text-blue-300 mb-2">
                                                <Users className="w-4 h-4 mr-2" />
                                                <span className="font-medium">系统繁忙</span>
                                            </div>
                                            <div className="text-sm text-blue-200">
                                                当前有 {queueStats.queueLength} 个测试在排队等待
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 主要配置区域 */}
                            {!isAdvancedMode ? (
                                /* 简化模式 - 快速模板选择 */
                                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                                    <div className="text-center mb-4">
                                        <h3 className="text-lg font-semibold text-white mb-1">选择测试强度</h3>
                                        <p className="text-gray-400 text-xs">根据您的网站类型选择合适的测试模板</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        {quickTemplates.map((template) => (
                                            <div
                                                key={template.id}
                                                onClick={() => applyTemplate(template.id)}
                                                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${selectedTemplate === template.id
                                                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                                                    : 'border-gray-600 bg-gray-700/30 hover:border-blue-400 hover:bg-blue-500/5'
                                                    }`}
                                            >
                                                {/* 徽章 */}
                                                {template.badge && (
                                                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${selectedTemplate === template.id
                                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                        }`}>
                                                        {template.badge}
                                                    </div>
                                                )}

                                                <div className="text-center mt-6">
                                                    <div className="text-3xl mb-2">{template.icon}</div>
                                                    <h4 className="font-semibold text-white mb-1">
                                                        {template.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mb-3">{template.description}</p>
                                                    <div className="text-xs text-blue-300 bg-blue-500/10 rounded-full px-2 py-1">
                                                        {(() => {
                                                            // const fullTemplate = getTemplateById(template.id);
                                                            const fullTemplate = null; // 临时修复
                                                            return fullTemplate ? `${fullTemplate.config.users}用户 · ${fullTemplate.config.duration}秒` : '配置加载中...';
                                                        })()}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-2">{template.recommended}</div>
                                                </div>

                                                {selectedTemplate === template.id && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle className="w-5 h-5 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {selectedTemplate && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <CheckCircle className="w-4 h-4 text-blue-400" />
                                                <span className="text-sm font-medium text-blue-300">已选择模板</span>
                                            </div>
                                            <div className="text-sm text-gray-300">
                                                将使用 <span className="text-blue-300 font-medium">{testConfig.users}</span> 个并发用户，
                                                测试 <span className="text-blue-300 font-medium">{testConfig.duration}</span> 秒，
                                                采用 <span className="text-blue-300 font-medium">
                                                    {testConfig.testType === 'gradual' ? '梯度加压' :
                                                        testConfig.testType === 'spike' ? '峰值冲击' :
                                                            testConfig.testType === 'constant' ? '恒定负载' :
                                                                testConfig.testType === 'stress' ? '压力极限' :
                                                                    testConfig.testType === 'load' ? '负载测试' :
                                                                        testConfig.testType === 'volume' ? '容量测试' : '未知类型'}
                                                </span> 模式
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={handleStartTest}
                                            disabled={!testConfig.url || !selectedTemplate}
                                            className={`px-8 py-3 rounded-lg font-medium transition-all ${!testConfig.url || !selectedTemplate
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : isAuthenticated
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl'
                                                }`}
                                        >
                                            {isAuthenticated ? (
                                                <div className="flex items-center space-x-2">
                                                    <Play className="w-5 h-5" />
                                                    <span>开始压力测试</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <Play className="w-5 h-5" />
                                                    <span>开始压力测试</span>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* 高级模式 - 原有的详细配置 */
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                    {/* 测试配置 */}
                                    <div className="xl:col-span-2 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-white">高级测试配置</h3>
                                            <button
                                                type="button"
                                                onClick={importConfigFromClipboard}
                                                className="px-3 py-2 text-sm border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700/50 hover:text-gray-300 transition-colors flex items-center space-x-2"
                                                title="从剪贴板导入配置"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                <span>导入配置</span>
                                            </button>
                                        </div>



                                        {/* 本地测试选项（桌面版专用） */}
                                        {localStressTest.isAvailable && (
                                            <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-2">
                                                        <Zap className="w-5 h-5 text-purple-400" />
                                                        <h4 className="text-lg font-medium text-white">本地压力测试</h4>
                                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">桌面版专用</span>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={useLocalTest}
                                                            onChange={(e) => setUseLocalTest(e.target.checked)}
                                                            className="sr-only peer"
                                                            aria-label="启用本地压力测试"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                                    </label>
                                                </div>
                                                <div className="text-sm text-gray-300 mb-3">
                                                    使用您的本地计算机资源进行压力测试，突破服务器限制，支持更高并发数和更长测试时间。
                                                </div>
                                                {useLocalTest && (
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                                                            <div className="text-green-400 font-medium">✅ 优势</div>
                                                            <div className="text-gray-300 mt-1">
                                                                • 无并发限制<br />
                                                                • 使用本地资源<br />
                                                                • 更高性能
                                                            </div>
                                                        </div>
                                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                                                            <div className="text-blue-400 font-medium">📊 推荐配置</div>
                                                            <div className="text-gray-300 mt-1">
                                                                {(() => {
                                                                    const rec = localStressTest.getRecommendedConfig(testConfig.users);
                                                                    return `最大用户: ${rec.users || testConfig.users}`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 测试类型选择 - 移动端优化布局 */}
                                        <div className="mb-4">
                                            <h4 className="text-lg font-medium text-white mb-3">测试类型</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* 梯度加压 */}
                                                <div
                                                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'gradual'
                                                        ? 'border-green-500 bg-green-500/10'
                                                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                        }`}
                                                    onClick={() => adjustConfigForTestType('gradual')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 sm:space-x-2">
                                                            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                                <TrendingUp className="w-5 h-5 sm:w-4 sm:h-4 text-green-400" />
                                                            </div>
                                                            <h5 className="font-medium text-white text-base sm:text-sm">梯度加压</h5>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'gradual'
                                                                ? 'border-green-500 bg-green-500'
                                                                : 'border-gray-500 bg-gray-700/50'
                                                                }`}
                                                        >
                                                            {testConfig.testType === 'gradual' && (
                                                                <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 峰值测试 */}
                                                <div
                                                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'spike'
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                        }`}
                                                    onClick={() => adjustConfigForTestType('spike')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 sm:space-x-2">
                                                            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                                <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4 text-blue-400" />
                                                            </div>
                                                            <h5 className="font-medium text-white text-base sm:text-sm">峰值测试</h5>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'spike'
                                                                ? 'border-blue-500 bg-blue-500'
                                                                : 'border-gray-500 bg-gray-700/50'
                                                                }`}
                                                        >
                                                            {testConfig.testType === 'spike' && (
                                                                <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 恒定负载 */}
                                                <div
                                                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'constant'
                                                        ? 'border-purple-500 bg-purple-500/10'
                                                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                        }`}
                                                    onClick={() => adjustConfigForTestType('constant')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 sm:space-x-2">
                                                            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                                <Users className="w-5 h-5 sm:w-4 sm:h-4 text-purple-400" />
                                                            </div>
                                                            <h5 className="font-medium text-white text-base sm:text-sm">恒定负载</h5>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'constant'
                                                                ? 'border-purple-500 bg-purple-500'
                                                                : 'border-gray-500 bg-gray-700/50'
                                                                }`}
                                                        >
                                                            {testConfig.testType === 'constant' && (
                                                                <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 压力极限 */}
                                                <div
                                                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'stress'
                                                        ? 'border-red-500 bg-red-500/10'
                                                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                        }`}
                                                    onClick={() => adjustConfigForTestType('stress')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 sm:space-x-2">
                                                            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                                                <AlertCircle className="w-5 h-5 sm:w-4 sm:h-4 text-red-400" />
                                                            </div>
                                                            <h5 className="font-medium text-white text-base sm:text-sm">压力极限</h5>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'stress'
                                                                ? 'border-red-500 bg-red-500'
                                                                : 'border-gray-500 bg-gray-700/50'
                                                                }`}
                                                        >
                                                            {testConfig.testType === 'stress' && (
                                                                <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 负载测试 */}
                                                <div
                                                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'load'
                                                        ? 'border-orange-500 bg-orange-500/10'
                                                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                        }`}
                                                    onClick={() => adjustConfigForTestType('load')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 sm:space-x-2">
                                                            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                                                <Users className="w-5 h-5 sm:w-4 sm:h-4 text-orange-400" />
                                                            </div>
                                                            <h5 className="font-medium text-white text-base sm:text-sm">负载测试</h5>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'load'
                                                                ? 'border-orange-500 bg-orange-500'
                                                                : 'border-gray-500 bg-gray-700/50'
                                                                }`}
                                                        >
                                                            {testConfig.testType === 'load' && (
                                                                <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 容量测试 */}
                                                <div
                                                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'volume'
                                                        ? 'border-yellow-500 bg-yellow-500/10'
                                                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                        }`}
                                                    onClick={() => adjustConfigForTestType('volume')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 sm:space-x-2">
                                                            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                                                <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4 text-yellow-400" />
                                                            </div>
                                                            <h5 className="font-medium text-white text-base sm:text-sm">容量测试</h5>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'volume'
                                                                ? 'border-yellow-500 bg-yellow-500'
                                                                : 'border-gray-500 bg-gray-700/50'
                                                                }`}
                                                        >
                                                            {testConfig.testType === 'volume' && (
                                                                <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 测试参数 - 移动端优化 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* 并发用户数 */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    并发用户数
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        (推荐: {getRecommendedConfig(testConfig.testType).users.recommended})
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <Users className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="number"
                                                        value={testConfig.users}
                                                        onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, users: parseInt(e.target.value) || 0 }))}
                                                        className="w-full pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        style={{ paddingLeft: '2rem' }}
                                                        min={getRecommendedConfig(testConfig.testType).users.min}
                                                        max={getRecommendedConfig(testConfig.testType).users.max}
                                                        placeholder="输入用户数"
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {getRecommendedConfig(testConfig.testType).users.description}
                                                </div>
                                            </div>

                                            {/* 测试时长 */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    测试时长 (秒)
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        (推荐: {getRecommendedConfig(testConfig.testType).duration.recommended})
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="number"
                                                        value={testConfig.duration}
                                                        onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                                                        className="w-full pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        style={{ paddingLeft: '2rem' }}
                                                        min={getRecommendedConfig(testConfig.testType).duration.min}
                                                        max={getRecommendedConfig(testConfig.testType).duration.max}
                                                        placeholder="输入时长(秒)"
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {getRecommendedConfig(testConfig.testType).duration.description}
                                                </div>
                                            </div>

                                            {/* 加压时间 */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    加压时间 (秒)
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        (推荐: {getRecommendedConfig(testConfig.testType).rampUp.recommended})
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <TrendingUp className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="number"
                                                        value={testConfig.rampUp}
                                                        onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, rampUp: parseInt(e.target.value) || 0 }))}
                                                        className="w-full pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        style={{ paddingLeft: '2rem' }}
                                                        min={getRecommendedConfig(testConfig.testType).rampUp.min}
                                                        max={getRecommendedConfig(testConfig.testType).rampUp.max}
                                                        placeholder={`${getRecommendedConfig(testConfig.testType).rampUp.min}-${getRecommendedConfig(testConfig.testType).rampUp.max}`}
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {getRecommendedConfig(testConfig.testType).rampUp.description}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 代理设置 */}
                                        <div className="mt-4 bg-gray-800/80 backdrop-blur-sm rounded-xl border-2 border-blue-500/30 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center">
                                                    <Globe className="w-4 h-4 text-blue-400 mr-2" />
                                                    <h4 className="text-base font-semibold text-white">代理设置</h4>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    服务器端模式
                                                </div>
                                            </div>



                                            <div className="space-y-3">
                                                {/* 启用代理开关 */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-gray-300 text-sm">启用代理</span>
                                                        <div className="text-xs text-gray-500">(可选)</div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={testConfig.proxy?.enabled || false}
                                                            onChange={(e) => setTestConfig(prev => ({
                                                                ...prev,
                                                                proxy: {
                                                                    ...prev.proxy,
                                                                    enabled: e.target.checked
                                                                }
                                                            }))}
                                                            className="sr-only peer"
                                                            aria-label="启用代理"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                {/* 代理配置 */}
                                                {testConfig.proxy?.enabled && (
                                                    <div className="space-y-2 pl-3 border-l-2 border-blue-500/30">
                                                        {/* 代理类型 */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-300 mb-1">
                                                                代理类型
                                                            </label>
                                                            <select
                                                                value={testConfig.proxy?.type || 'http'}
                                                                onChange={(e) => {
                                                                    const proxyType = e.target.value as 'http' | 'https' | 'socks5';
                                                                    let defaultHost = '127.0.0.1';
                                                                    let defaultPort = 8080;

                                                                    // 根据代理类型设置默认的本机代理值
                                                                    if (proxyType === 'socks5') {
                                                                        defaultPort = 1080; // SOCKS5常用端口
                                                                    }

                                                                    setTestConfig(prev => ({
                                                                        ...prev,
                                                                        proxy: {
                                                                            ...prev.proxy,
                                                                            type: proxyType,
                                                                            host: defaultHost,
                                                                            port: defaultPort
                                                                        }
                                                                    }));
                                                                }}
                                                                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                aria-label="选择代理类型"
                                                            >
                                                                <option value="http">HTTP</option>
                                                                <option value="https">HTTPS</option>
                                                                <option value="socks5">SOCKS5</option>
                                                            </select>
                                                        </div>

                                                        {/* 快速设置本机代理 - 可折叠 */}
                                                        <div className="bg-gray-700/30 rounded-lg border border-gray-600/50">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowQuickProxySettings(!showQuickProxySettings)}
                                                                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-600/20 transition-colors rounded-lg"
                                                            >
                                                                <div className="text-xs font-medium text-gray-300">快速设置常用本机代理</div>
                                                                <svg
                                                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showQuickProxySettings ? 'rotate-180' : ''}`}
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>

                                                            {showQuickProxySettings && (
                                                                <div className="px-3 pb-3">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setTestConfig(prev => ({
                                                                                ...prev,
                                                                                proxy: {
                                                                                    ...prev.proxy,
                                                                                    type: 'http',
                                                                                    host: '127.0.0.1',
                                                                                    port: 8080
                                                                                }
                                                                            }))}
                                                                            className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs text-blue-300 transition-colors"
                                                                        >
                                                                            HTTP :8080
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setTestConfig(prev => ({
                                                                                ...prev,
                                                                                proxy: {
                                                                                    ...prev.proxy,
                                                                                    type: 'socks5',
                                                                                    host: '127.0.0.1',
                                                                                    port: 1080
                                                                                }
                                                                            }))}
                                                                            className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-colors"
                                                                        >
                                                                            SOCKS5 :1080
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setTestConfig(prev => ({
                                                                                ...prev,
                                                                                proxy: {
                                                                                    ...prev.proxy,
                                                                                    type: 'http',
                                                                                    host: '127.0.0.1',
                                                                                    port: 7890
                                                                                }
                                                                            }))}
                                                                            className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-xs text-green-300 transition-colors"
                                                                        >
                                                                            Clash :7890
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setTestConfig(prev => ({
                                                                                ...prev,
                                                                                proxy: {
                                                                                    ...prev.proxy,
                                                                                    type: 'socks5',
                                                                                    host: '127.0.0.1',
                                                                                    port: 7891
                                                                                }
                                                                            }))}
                                                                            className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-xs text-orange-300 transition-colors"
                                                                        >
                                                                            Clash SOCKS :7891
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 代理地址 */}
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="col-span-2">
                                                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                                                    代理地址
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={testConfig.proxy?.host || ''}
                                                                    onChange={(e) => setTestConfig(prev => ({
                                                                        ...prev,
                                                                        proxy: {
                                                                            ...prev.proxy,
                                                                            host: e.target.value
                                                                        }
                                                                    }))}
                                                                    placeholder="127.0.0.1"
                                                                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                                                    端口
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={testConfig.proxy?.port || ''}
                                                                    onChange={(e) => setTestConfig(prev => ({
                                                                        ...prev,
                                                                        proxy: {
                                                                            ...prev.proxy,
                                                                            port: parseInt(e.target.value) || 8080
                                                                        }
                                                                    }))}
                                                                    placeholder="8080"
                                                                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 认证信息 */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                                                    用户名 (可选)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={testConfig.proxy?.username || ''}
                                                                    onChange={(e) => setTestConfig(prev => ({
                                                                        ...prev,
                                                                        proxy: {
                                                                            ...prev.proxy,
                                                                            username: e.target.value
                                                                        }
                                                                    }))}
                                                                    placeholder="用户名"
                                                                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                                                    密码 (可选)
                                                                </label>
                                                                <input
                                                                    type="password"
                                                                    value={testConfig.proxy?.password || ''}
                                                                    onChange={(e) => setTestConfig(prev => ({
                                                                        ...prev,
                                                                        proxy: {
                                                                            ...prev.proxy,
                                                                            password: e.target.value
                                                                        }
                                                                    }))}
                                                                    placeholder="密码"
                                                                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 代理状态提示和测试 */}
                                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <Shield className="w-4 h-4 text-blue-400" />
                                                                    <span className="text-blue-300 text-xs">
                                                                        代理已启用 - 服务器端测试请求将通过代理发送
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => testProxyConnection()}
                                                                    disabled={proxyTestStatus.testing}
                                                                    className={`px-2 py-1 text-xs rounded transition-colors ${proxyTestStatus.testing
                                                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                                        }`}
                                                                    title="测试代理连接"
                                                                >
                                                                    {proxyTestStatus.testing ? '测试中...' : '测试连接'}
                                                                </button>
                                                            </div>

                                                            {/* 代理测试结果显示 */}
                                                            {(proxyTestStatus.result || proxyTestStatus.testing) && (
                                                                <div className={`flex items-center justify-between text-xs p-2 rounded ${proxyTestStatus.result === 'success'
                                                                    ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                                                                    : proxyTestStatus.result === 'error'
                                                                        ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                                                                        : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                                                                    }`}>
                                                                    <div className="flex items-center space-x-2">
                                                                        {proxyTestStatus.testing && (
                                                                            <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                                                                        )}

                                                                        {proxyTestStatus.result === 'error' && (
                                                                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                        <div className="flex flex-col space-y-2">
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="font-medium">{proxyTestStatus.message}</span>
                                                                                {proxyTestStatus.result === 'success' && (
                                                                                    <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                )}
                                                                            </div>
                                                                            {proxyTestStatus.details && (
                                                                                <div className="space-y-2 text-sm text-gray-300">
                                                                                    {/* 位置和出口IP - 横向排列 */}
                                                                                    <div className="flex items-center space-x-4 flex-wrap">
                                                                                        {/* 地理位置信息 */}
                                                                                        {proxyTestStatus.details.location && (
                                                                                            <div className="flex items-center space-x-1">
                                                                                                <span className="text-gray-400">位置:</span>
                                                                                                <div className="flex items-center space-x-1">
                                                                                                    <span className="text-gray-400 text-sm">🌐</span>
                                                                                                    <span>
                                                                                                        {typeof proxyTestStatus.details.location === 'string'
                                                                                                            ? proxyTestStatus.details.location
                                                                                                            : '未知位置'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 出口IP */}
                                                                                        {proxyTestStatus.details.proxyIp && (
                                                                                            <div className="flex items-center space-x-1">
                                                                                                <span className="text-gray-400">出口IP:</span>
                                                                                                <span className="font-mono text-blue-300">{proxyTestStatus.details.proxyIp}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* 延迟信息 - 横向排列 */}
                                                                                    {(proxyTestStatus.details.responseTime || proxyTestStatus.details.proxyResponseTime) && (
                                                                                        <div className="flex items-center space-x-4 flex-wrap">
                                                                                            {proxyTestStatus.details.responseTime && (
                                                                                                <div className="flex items-center space-x-1">
                                                                                                    <span className="text-gray-400">延迟:</span>
                                                                                                    <span className="text-green-300 font-medium">{proxyTestStatus.details.responseTime}ms</span>
                                                                                                </div>
                                                                                            )}

                                                                                            {proxyTestStatus.details.proxyResponseTime && (
                                                                                                <div className="flex items-center space-x-1">
                                                                                                    <span className="text-gray-400">响应:</span>
                                                                                                    <span className="text-yellow-300">{proxyTestStatus.details.proxyResponseTime}ms</span>
                                                                                                </div>
                                                                                            )}

                                                                                            {proxyTestStatus.details.networkLatency && proxyTestStatus.details.networkLatency !== proxyTestStatus.details.responseTime && (
                                                                                                <div className="flex items-center space-x-1">
                                                                                                    <span className="text-gray-400">网络:</span>
                                                                                                    <span className="text-blue-300">{proxyTestStatus.details.networkLatency}ms</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}

                                                                                    {/* 错误信息 */}
                                                                                    {proxyTestStatus.result === 'error' && proxyTestStatus.details?.errorCode && (
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <span className="text-gray-400 w-16">错误:</span>
                                                                                            <span className="text-red-300 font-mono text-xs">{proxyTestStatus.details.errorCode}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* 故障排除建议 */}
                                                                                    {proxyTestStatus.result === 'error' && proxyTestStatus.details?.troubleshooting && (
                                                                                        <div className="mt-2 pt-2 border-t border-gray-600">
                                                                                            <div className="text-xs text-gray-400 mb-1">排查建议:</div>
                                                                                            <ul className="text-xs text-gray-300 space-y-1">
                                                                                                {proxyTestStatus.details.troubleshooting.slice(0, 3).map((tip, index) => (
                                                                                                    <li key={index} className="flex items-start space-x-2">
                                                                                                        <span className="text-gray-500 mt-0.5">•</span>
                                                                                                        <span>{tip}</span>
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {/* 关闭按钮 - 只在成功状态显示 */}
                                                                    {proxyTestStatus.result === 'success' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setProxyTestStatus({ testing: false, result: null, message: '' })}
                                                                            className="ml-2 text-gray-400 hover:text-gray-200 transition-colors"
                                                                            title="关闭"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 未启用代理时的提示 */}
                                                {!testConfig.proxy?.enabled && (
                                                    <div className="rounded-lg p-3 bg-gray-700/30">
                                                        <div className="flex items-center space-x-2">
                                                            <Globe className="w-4 h-4 text-gray-400" />
                                                            <span className="text-gray-400 text-xs">
                                                                🖥️ 直连模式 - 测试请求将直接发送到目标服务器
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>



                                    </div>

                                    {/* 右侧控制面板 - 改进版 */}
                                    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                        {/* 控制面板标题 */}
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-white flex items-center">
                                                <Settings className="w-5 h-5 mr-2 text-blue-400" />
                                                测试控制
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-2 h-2 rounded-full ${testConfig.url.trim() && testConfig.users > 0 && testConfig.duration > 0
                                                    ? 'bg-green-400' : 'bg-yellow-400'
                                                    }`}></div>
                                                <span className="text-xs text-gray-400">
                                                    {testConfig.url.trim() && testConfig.users > 0 && testConfig.duration > 0
                                                        ? '配置完成' : '配置中'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 当前配置摘要 - 改进版 */}
                                        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                                            <div className="grid grid-cols-1 gap-3">
                                                {/* 核心参数 */}
                                                <div className="grid grid-cols-3 gap-3 text-center">
                                                    <div className="bg-gray-600/30 rounded-lg p-3">
                                                        <div className="text-lg font-bold text-white">{testConfig.users}</div>
                                                        <div className="text-xs text-gray-400">并发用户</div>
                                                    </div>
                                                    <div className="bg-gray-600/30 rounded-lg p-3">
                                                        <div className="text-lg font-bold text-white">{testConfig.duration}s</div>
                                                        <div className="text-xs text-gray-400">测试时长</div>
                                                    </div>
                                                    <div className="bg-gray-600/30 rounded-lg p-3">
                                                        <div className="text-lg font-bold text-white">{testConfig.rampUp}s</div>
                                                        <div className="text-xs text-gray-400">加压时间</div>
                                                    </div>
                                                </div>

                                                {/* 测试类型 */}
                                                <div className="flex items-center justify-between pt-2 border-t border-gray-600/50">
                                                    <span className="text-gray-400 text-sm">测试类型:</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${testConfig.testType === 'gradual' ? 'bg-blue-500/20 text-blue-300' :
                                                        testConfig.testType === 'spike' ? 'bg-red-500/20 text-red-300' :
                                                            testConfig.testType === 'constant' ? 'bg-green-500/20 text-green-300' :
                                                                testConfig.testType === 'stress' ? 'bg-purple-500/20 text-purple-300' :
                                                                    testConfig.testType === 'load' ? 'bg-orange-500/20 text-orange-300' :
                                                                        testConfig.testType === 'volume' ? 'bg-yellow-500/20 text-yellow-300' :
                                                                            'bg-gray-500/20 text-gray-300'
                                                        }`}>
                                                        {testConfig.testType === 'gradual' ? '梯度加压' :
                                                            testConfig.testType === 'spike' ? '峰值测试' :
                                                                testConfig.testType === 'constant' ? '恒定负载' :
                                                                    testConfig.testType === 'stress' ? '压力极限' :
                                                                        testConfig.testType === 'load' ? '负载测试' :
                                                                            testConfig.testType === 'volume' ? '容量测试' : '未知类型'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 测试状态显示 */}
                                        {isRunning ? (
                                            <div className="space-y-4">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 mx-auto mb-3 relative">
                                                        <div className="w-12 h-12 border-4 border-gray-600 rounded-full"></div>
                                                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                                                    </div>
                                                    <p className="text-sm font-medium text-white">测试进行中</p>
                                                    <p className="text-xs text-gray-300 mt-1">{testProgress}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelTest}
                                                    disabled={isCancelling}
                                                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors ${isCancelling
                                                        ? 'bg-gray-600 cursor-not-allowed'
                                                        : 'bg-red-600 hover:bg-red-700'
                                                        }`}
                                                >
                                                    {isCancelling ? (
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                    <span>{isCancelling ? '正在取消测试...' : '取消测试'}</span>
                                                </button>
                                            </div>
                                        ) : testStatus === 'completed' ? (
                                            <div className="space-y-4">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
                                                        <CheckCircle className="w-6 h-6 text-green-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-green-300">测试完成</p>
                                                    <p className="text-xs text-gray-300 mt-1">测试已成功完成</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={resetTestState}
                                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>重新测试</span>
                                                </button>
                                            </div>
                                        ) : testStatus === 'failed' ? (
                                            <div className="space-y-4">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
                                                        <XCircle className="w-6 h-6 text-red-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-red-300">测试失败</p>
                                                    <p className="text-xs text-gray-300 mt-1">{error || '测试过程中发生错误'}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={resetTestState}
                                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>重试</span>
                                                </button>
                                            </div>
                                        ) : testStatus === 'cancelled' ? (
                                            <div className="space-y-4">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                                        <Square className="w-6 h-6 text-yellow-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-yellow-300">测试已取消</p>
                                                    <p className="text-xs text-gray-300 mt-1">测试被用户手动停止</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={resetTestState}
                                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>重新测试</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <button
                                                    type="button"
                                                    onClick={handleStartTest}
                                                    disabled={!testConfig.url.trim()}
                                                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200"
                                                >
                                                    <Play className="w-5 h-5" />
                                                    <span>开始压力测试</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* 快速模板 - 改进版 */}
                                        <div className="mt-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-medium text-gray-300 flex items-center">
                                                    <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                                                    快速模板
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={importConfigFromClipboard}
                                                    className="px-2 py-1 text-xs border border-gray-600 text-gray-400 rounded-md hover:bg-gray-700/50 hover:text-gray-300 transition-colors flex items-center space-x-1"
                                                    title="从剪贴板导入配置"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    <span>导入</span>
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {/* 轻量测试 */}
                                                <button
                                                    type="button"
                                                    onClick={() => applyTemplate('light-load')}
                                                    className={`w-full p-3 text-sm border rounded-lg transition-all text-left ${selectedTemplate === 'light-load'
                                                        ? 'border-green-500 bg-green-500/10 text-green-300'
                                                        : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-green-400'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                            <span className="font-medium">轻量测试</span>
                                                        </div>
                                                        <span className="text-xs bg-gray-600/50 px-2 py-1 rounded">5用户/30秒</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">适合小型网站初次测试</div>
                                                </button>

                                                {/* 中等负载 */}
                                                <button
                                                    type="button"
                                                    onClick={() => applyTemplate('medium-load')}
                                                    className={`w-full p-3 text-sm border rounded-lg transition-all text-left ${selectedTemplate === 'medium-load'
                                                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                                                        : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-yellow-400'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                                            <span className="font-medium">中等负载</span>
                                                            <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">推荐</span>
                                                        </div>
                                                        <span className="text-xs bg-gray-600/50 px-2 py-1 rounded">20用户/60秒</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">适合企业网站常规测试</div>
                                                </button>

                                                {/* 重负载 */}
                                                <button
                                                    type="button"
                                                    onClick={() => applyTemplate('heavy-load')}
                                                    className={`w-full p-3 text-sm border rounded-lg transition-all text-left ${selectedTemplate === 'heavy-load'
                                                        ? 'border-red-500 bg-red-500/10 text-red-300'
                                                        : 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-red-400'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                                            <span className="font-medium">重负载</span>
                                                            <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">专业</span>
                                                        </div>
                                                        <span className="text-xs bg-gray-600/50 px-2 py-1 rounded">50用户/120秒</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">适合大型网站压力测试</div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* 测试引擎状态 - 改进版 */}
                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                                                <Globe className="w-4 h-4 mr-2 text-green-400" />
                                                引擎状态
                                            </h4>
                                            <div className="bg-gray-700/30 rounded-lg p-3">
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                            <span className="text-gray-300">真实网络测试</span>
                                                        </div>
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                                            <span className="text-gray-300">准确性能指标</span>
                                                        </div>
                                                        <CheckCircle className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                                            <span className="text-gray-300">实时错误检测</span>
                                                        </div>
                                                        <CheckCircle className="w-4 h-4 text-purple-400" />
                                                    </div>

                                                    {/* 引擎信息 */}
                                                    <div className="pt-2 border-t border-gray-600/50">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-400">引擎版本:</span>
                                                            <span className="text-gray-300 font-mono">v2.1.0</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs mt-1">
                                                            <span className="text-gray-400">连接状态:</span>
                                                            <span className="text-green-300 flex items-center space-x-1">
                                                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                                                <span>已连接</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 导出功能 - 统一组件 */}
                                        {result && (
                                            <div className="mt-6">
                                                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                                                    <Download className="w-4 h-4 mr-2 text-blue-400" />
                                                    导出报告
                                                </h4>
                                                <button
                                                    onClick={() => setIsExportModalOpen(true)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span>导出</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 测试结果 */}
                            {(result || metrics) && (
                                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-white">测试结果</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsExportModalOpen(true)}
                                            className="px-3 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-colors flex items-center space-x-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>导出</span>
                                        </button>
                                    </div>

                                    {/* 主要性能指标卡片 */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                        <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                            <div className="text-xl font-bold text-blue-400">
                                                {result?.metrics?.totalRequests || metrics?.totalRequests || 0}
                                            </div>
                                            <div className="text-xs text-blue-300">总请求数</div>
                                        </div>
                                        <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                                            <div className="text-xl font-bold text-green-400">
                                                {result?.metrics?.successfulRequests || metrics?.successfulRequests || 0}
                                            </div>
                                            <div className="text-xs text-green-300">成功请求</div>
                                        </div>
                                        <div className="text-center p-3 bg-orange-500/20 rounded-lg border border-orange-500/30">
                                            <div className="text-xl font-bold text-orange-400">
                                                {(result?.metrics?.averageResponseTime || metrics?.averageResponseTime || 0).toFixed(3)}ms
                                            </div>
                                            <div className="text-xs text-orange-300">平均响应时间</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                                            <div className="text-xl font-bold text-red-400">
                                                {(() => {
                                                    const errorRate = result?.metrics?.errorRate || metrics?.errorRate || 0;
                                                    return typeof errorRate === 'string' ? errorRate : errorRate.toFixed(1);
                                                })()}%
                                            </div>
                                            <div className="text-xs text-red-300">错误率</div>
                                        </div>
                                    </div>

                                    {/* 详细性能指标 */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                        {/* 左侧：响应时间和吞吐量分析 */}
                                        <div className="lg:col-span-2 space-y-4">
                                            {/* 响应时间分析 */}
                                            <div className="bg-gray-700/50 rounded-lg p-3">
                                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                                                    <Clock className="w-4 h-4 mr-2 text-orange-400" />
                                                    响应时间分析
                                                </h4>
                                                <div className="grid grid-cols-4 gap-3">
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-green-400">
                                                            {result?.metrics?.p50ResponseTime || metrics?.p50ResponseTime || 0}ms
                                                        </div>
                                                        <div className="text-xs text-gray-400">P50响应时间</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-red-400">
                                                            {result?.metrics?.p90ResponseTime || metrics?.p90ResponseTime || 0}ms
                                                        </div>
                                                        <div className="text-xs text-gray-400">P90响应时间</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-blue-400">
                                                            {result?.metrics?.p95ResponseTime || metrics?.p95ResponseTime || 0}ms
                                                        </div>
                                                        <div className="text-xs text-gray-400">P95响应时间</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-purple-400">
                                                            {result?.metrics?.p99ResponseTime || metrics?.p99ResponseTime || 0}ms
                                                        </div>
                                                        <div className="text-xs text-gray-400">P99响应时间</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 吞吐量分析 */}
                                            <div className="bg-gray-700/50 rounded-lg p-3">
                                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                                                    <BarChart3 className="w-4 h-4 mr-2 text-blue-400" />
                                                    吞吐量分析
                                                </h4>
                                                <div className="grid grid-cols-4 gap-3">
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-blue-400">
                                                            {result?.metrics?.currentTPS || metrics?.currentTPS || 0}
                                                        </div>
                                                        <div className="text-xs text-gray-400">当前TPS</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-green-400">
                                                            {result?.metrics?.peakTPS || metrics?.peakTPS || 0}
                                                        </div>
                                                        <div className="text-xs text-gray-400">峰值TPS</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-yellow-400">
                                                            {(() => {
                                                                const throughput = result?.metrics?.throughput || metrics?.throughput || 0;
                                                                return throughput;
                                                            })()}
                                                        </div>
                                                        <div className="text-xs text-gray-400">平均TPS</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-indigo-400">
                                                            {result?.metrics?.requestsPerSecond || metrics?.requestsPerSecond || 0}
                                                        </div>
                                                        <div className="text-xs text-gray-400">请求/秒</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 右侧：测试配置 */}
                                        <div className="bg-gray-700/50 rounded-lg p-3">
                                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                                                <Users className="w-4 h-4 mr-2 text-cyan-400" />
                                                测试配置
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="text-center p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                                    <div className="text-lg font-bold text-cyan-400">{testConfig.users}</div>
                                                    <div className="text-xs text-gray-400">并发用户数</div>
                                                </div>
                                                <div className="text-center p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                                    <div className="text-lg font-bold text-cyan-400">{testConfig.duration}s</div>
                                                    <div className="text-xs text-gray-400">测试时长</div>
                                                </div>
                                                <div className="text-center p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                                    <div className="text-lg font-bold text-cyan-400">{testConfig.rampUp}s</div>
                                                    <div className="text-xs text-gray-400">加压时间</div>
                                                </div>
                                                <div className="text-center p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                                    <div className="text-lg font-bold text-cyan-400">
                                                        {testConfig.testType === 'gradual' ? '梯度加压' :
                                                            testConfig.testType === 'spike' ? '峰值测试' :
                                                                testConfig.testType === 'constant' ? '恒定负载' :
                                                                    testConfig.testType === 'stress' ? '压力极限' :
                                                                        testConfig.testType === 'load' ? '负载测试' :
                                                                            testConfig.testType === 'volume' ? '容量测试' : '未知类型'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">测试类型</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 错误分析 */}
                                    {(result?.metrics?.errorBreakdown || metrics?.errorBreakdown) &&
                                        Object.keys(result?.metrics?.errorBreakdown || metrics?.errorBreakdown || {}).length > 0 && (
                                            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                                                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                                                    <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                                                    错误类型分析
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                    {Object.entries(result?.metrics?.errorBreakdown || metrics?.errorBreakdown || {}).map(([errorType, count]) => (
                                                        <div key={errorType} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                                                            <div className="text-lg font-bold text-red-400">{String(count)}</div>
                                                            <div className="text-xs text-red-300">{errorType}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    {/* 数据传输分析 */}
                                    {(result?.metrics?.dataReceived || metrics?.dataReceived || result?.metrics?.dataSent || metrics?.dataSent) && (
                                        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                                            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                                                <Download className="w-5 h-5 mr-2 text-teal-400" />
                                                数据传输分析
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center">
                                                    <div className="text-xl font-bold text-teal-400">
                                                        {(() => {
                                                            const bytes = result?.metrics?.dataReceived || metrics?.dataReceived || 0;
                                                            if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
                                                            if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                                                            return `${bytes}B`;
                                                        })()}
                                                    </div>
                                                    <div className="text-xs text-gray-400">接收数据量</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xl font-bold text-teal-400">
                                                        {(() => {
                                                            const bytes = result?.metrics?.dataSent || metrics?.dataSent || 0;
                                                            if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
                                                            if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                                                            return `${bytes}B`;
                                                        })()}
                                                    </div>
                                                    <div className="text-xs text-gray-400">发送数据量</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xl font-bold text-teal-400">
                                                        {(() => {
                                                            const received = result?.metrics?.dataReceived || metrics?.dataReceived || 0;
                                                            const sent = result?.metrics?.dataSent || metrics?.dataSent || 0;
                                                            const total = received + sent;
                                                            if (total > 1024 * 1024) return `${(total / (1024 * 1024)).toFixed(1)}MB`;
                                                            if (total > 1024) return `${(total / 1024).toFixed(1)}KB`;
                                                            return `${total}B`;
                                                        })()}
                                                    </div>
                                                    <div className="text-xs text-gray-400">总数据量</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xl font-bold text-teal-400">
                                                        {(() => {
                                                            const received = result?.metrics?.dataReceived || metrics?.dataReceived || 0;
                                                            const totalRequests = result?.metrics?.totalRequests || metrics?.totalRequests || 1;
                                                            const avgPerRequest = received / totalRequests;
                                                            if (avgPerRequest > 1024) return `${(avgPerRequest / 1024).toFixed(1)}KB`;
                                                            return `${avgPerRequest.toFixed(0)}B`;
                                                        })()}
                                                    </div>
                                                    <div className="text-xs text-gray-400">平均响应大小</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 性能评估 */}
                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                                            性能评估
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="text-center p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                <div className="text-lg font-bold text-green-400">
                                                    {(() => {
                                                        const successRate = result?.metrics?.totalRequests ?
                                                            ((result.metrics.successfulRequests / result.metrics.totalRequests) * 100) :
                                                            metrics?.totalRequests ?
                                                                ((metrics.successfulRequests / metrics.totalRequests) * 100) : 0;
                                                        return successRate.toFixed(1);
                                                    })()}%
                                                </div>
                                                <div className="text-xs text-green-300">成功率</div>
                                            </div>
                                            <div className="text-center p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                                <div className="text-lg font-bold text-blue-400">
                                                    {(() => {
                                                        const avgResponseTime = result?.metrics?.averageResponseTime || metrics?.averageResponseTime || 0;
                                                        if (avgResponseTime < 200) return 'A+';
                                                        if (avgResponseTime < 500) return 'A';
                                                        if (avgResponseTime < 1000) return 'B';
                                                        if (avgResponseTime < 2000) return 'C';
                                                        return 'D';
                                                    })()}
                                                </div>
                                                <div className="text-xs text-blue-300">响应时间等级</div>
                                            </div>
                                            <div className="text-center p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                                <div className="text-lg font-bold text-purple-400">
                                                    {(() => {
                                                        const tps = result?.metrics?.currentTPS || metrics?.currentTPS || 0;
                                                        if (tps > 100) return '优秀';
                                                        if (tps > 50) return '良好';
                                                        if (tps > 20) return '一般';
                                                        return '较差';
                                                    })()}
                                                </div>
                                                <div className="text-xs text-purple-300">吞吐量评级</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 统一压力测试图表 - 空间复用 */}
                            {useUnifiedCharts ? (
                                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white">
                                            {isRunning && testStatus !== 'cancelled' ? '实时性能监控' :
                                                result || testStatus === 'cancelled' ? '测试结果分析' : '压力测试图表'}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setUseUnifiedCharts(false)}
                                                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                                            >
                                                切换到传统图表
                                            </button>
                                        </div>
                                    </div>
                                    <StressTestCharts
                                        realTimeData={(() => {
                                            const convertedData = convertToEnhancedRealTimeData(unifiedTestData.realTimeData);
                                            console.log('🎯 图表数据传递检查:', {
                                                原始数据长度: unifiedTestData.realTimeData.length,
                                                转换后数据长度: convertedData.length,
                                                测试状态: testStatus,
                                                是否运行中: testStatus === 'running',
                                                是否完成: testStatus === 'completed',
                                                样本数据: convertedData.slice(0, 2)
                                            });
                                            return convertedData;
                                        })()}
                                        isRunning={testStatus === 'running'}
                                        testCompleted={testStatus === 'completed'}
                                        currentMetrics={unifiedTestData.currentMetrics}
                                        height={500}
                                        dataPointDensity="medium"
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* 传统压力测试图表 - 始终显示 */}
                                    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-white">
                                                {isRunning && testStatus !== 'cancelled' ? '实时性能监控' :
                                                    testStatus === 'cancelled' || result ? '测试结果分析' : '传统压力测试图表'}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setUseUnifiedCharts(true)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                            >
                                                切换到统一图表
                                            </button>
                                        </div>

                                        {/* 根据状态显示不同内容 */}
                                        {((): null => {
                                            console.log('🔍 图表渲染条件检查:', {
                                                isRunning,
                                                stressTestDataLength: stressTestData.length,
                                                testStatus,
                                                stressTestDataSample: stressTestData.slice(0, 2)
                                            });
                                            return null;
                                        })()}
                                        {(stressTestData && stressTestData.length > 0) ? (
                                            <div>
                                                <div className="mb-2 text-sm text-gray-400">
                                                    传统图表模式 (数据点: {stressTestData.length})
                                                    {isRunning && <span className="ml-2 text-green-400">● 运行中</span>}
                                                </div>
                                                {/* <StressTestChart
                                                    data={stressTestData.map((point: any) => ({
                                                time: new Date(point.timestamp).toLocaleTimeString(),
                                                timestamp: point.timestamp,
                                                responseTime: point.responseTime,
                                                throughput: point.rps || point.throughput,
                                                errors: point.errors,
                                                users: point.users,
                                                p95ResponseTime: point.p95ResponseTime,
                                                errorRate: point.errorRate,
                                                phase: point.phase || 'steady'
                                            }))}
                                        showAdvancedMetrics={false}
                                        height={400}
                                        theme="dark"
                                        interactive={true}
                                        realTime={testStatus === 'running'}
                                                /> */}
                                                <div className="p-4 text-center text-gray-400">
                                                    图表组件暂时不可用
                                                </div>
                                            </div>
                                        ) : isRunning ? (
                                            /* 测试运行中但还没有数据时的占位图表 */
                                            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 h-96">
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 mx-auto mb-4 relative">
                                                            <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
                                                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                                                        </div>
                                                        <div className="text-white font-medium text-lg mb-2">等待实时数据</div>
                                                        <div className="text-gray-400 text-sm mb-4">
                                                            压力测试正在运行，等待WebSocket数据...
                                                        </div>
                                                        <div className="text-gray-500 text-xs mb-4">
                                                            数据点: {stressTestData.length} | WebSocket: {socketRef.current?.connected ? '已连接' : '未连接'}
                                                        </div>

                                                    </div>
                                                </div>
                                            </div>
                                        ) : stressTestData && stressTestData.length > 0 ? (
                                            /* 显示测试完成后的数据 */
                                            <div className="bg-white rounded-lg border border-gray-200 h-96">
                                                <div className="p-4 h-full">
                                                    <h4 className="text-lg font-semibold text-gray-800 mb-4">传统压力测试图表</h4>
                                                    {/* <StressTestChart
                                                data={stressTestData.map((point: any) => ({
                                                    time: new Date(point.timestamp).toLocaleTimeString(),
                                                    timestamp: point.timestamp,
                                                    responseTime: point.responseTime,
                                                    throughput: point.rps || point.throughput,
                                                    errors: point.errors,
                                                    users: point.users,
                                                    p95ResponseTime: point.p95ResponseTime,
                                                    errorRate: point.errorRate,
                                                    phase: point.phase || 'steady'
                                                }))}
                                                showAdvancedMetrics={false}
                                                height={320}
                                                theme="light"
                                                interactive={true}
                                                realTime={false}
                                                    /> */}
                                                    <div className="p-4 text-center text-gray-400">
                                                        图表组件暂时不可用
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 占位图表区域 */
                                            <div className="bg-white rounded-lg border border-gray-200 h-96">
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                            </svg>
                                                        </div>
                                                        <div className="text-gray-600 font-medium text-lg mb-2">传统压力测试图表</div>
                                                        <div className="text-gray-500 text-sm mb-4">
                                                            开始测试后将显示真实的压力测试数据
                                                        </div>
                                                        <div className="text-gray-400 text-xs">
                                                            ✅ 真实HTTP请求 | ✅ 实时响应时间 | ✅ 专业级指标
                                                        </div>
                                                        <div className="text-gray-400 text-xs mt-2">
                                                            Active Threads Over Time
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>



                                </>
                            )}

                            {/* 实时测试日志 */}
                            {isRunning && (
                                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">实时日志</h3>
                                    <div className="bg-gray-900/80 text-green-400 p-4 rounded-lg font-mono text-sm h-32 overflow-y-auto border border-gray-700">
                                        <div>[{new Date().toLocaleTimeString()}] 🚀 压力测试开始</div>
                                        <div>[{new Date().toLocaleTimeString()}] 📊 配置: {testConfig.users}用户, {testConfig.duration}秒</div>
                                        <div>[{new Date().toLocaleTimeString()}] ⏳ 测试进行中...</div>
                                        {testProgress && (
                                            <div>[{new Date().toLocaleTimeString()}] 📋 {testProgress}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : activeTab === 'history' ? (
                        /* 压力测试历史 */
                        <div className="space-y-6">
                            <StressTestHistory />

                            {/* 测试记录管理提示 */}
                            {currentRecord && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-blue-400 font-medium">当前测试记录</h4>
                                            <p className="text-gray-300 text-sm">
                                                正在跟踪测试: {currentRecord.testName} - {currentRecord.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null
                }

                {LoginPromptComponent}

                {/* 取消测试确认对话框 */}
                <CancelTestConfirmDialog
                    isOpen={showCancelDialog}
                    onCancel={handleCancelDialogClose}
                    onConfirm={handleCancelConfirm}
                    testProgress={isRunning ? {
                        duration: (() => {
                            // 🔧 修复：正确计算运行时长
                            if (result?.startTime) {
                                return Math.floor((Date.now() - new Date(result.startTime).getTime()) / 1000);
                            }
                            // 如果没有startTime，使用第一个数据点的时间戳
                            if (stressTestData.length > 0) {
                                const firstDataTime = typeof stressTestData[0].timestamp === 'string'
                                    ? new Date(stressTestData[0].timestamp).getTime()
                                    : stressTestData[0].timestamp;
                                return Math.floor((Date.now() - firstDataTime) / 1000);
                            }
                            // 都没有的话，返回0
                            return 0;
                        })(),
                        completedRequests: stressTestData.length,
                        // 🔧 修复：保留请求数显示，但进度计算改为基于时间
                        totalRequests: (() => {
                            const currentDuration = Math.floor((Date.now() - (result?.startTime ? new Date(result.startTime).getTime() : Date.now())) / 1000);
                            const completedRequests = stressTestData.length;

                            // 如果测试刚开始（前10秒），使用理论估算
                            if (currentDuration < 10 || completedRequests < 20) {
                                // 理论值：每个用户每秒大约1个请求
                                return Math.round(testConfig.users * testConfig.duration);
                            }

                            // 测试进行中，基于当前实际TPS估算
                            const currentTPS = completedRequests / currentDuration;
                            const estimatedTotal = Math.round(currentTPS * testConfig.duration);

                            // 确保估算值合理：不能小于已完成的请求数
                            return Math.max(estimatedTotal, completedRequests);
                        })(),
                        currentUsers: testConfig.users,
                        // 🔧 新增：添加总测试时长，用于基于时间的进度计算
                        totalDuration: testConfig.duration,
                        // 🔧 修复：显示更合适的阶段信息，而不是包含百分比的testProgress
                        phase: currentStatus === 'RUNNING' ? '压力测试运行中' :
                            currentStatus === 'STARTING' ? '测试启动中' :
                                currentStatus === 'WAITING' ? '等待开始' :
                                    '运行中'
                    } : undefined}
                    isLoading={cancelInProgress}
                />

                {/* 取消进度反馈 */}
                <CancelProgressFeedback
                    isVisible={showCancelProgress}
                    onComplete={handleCancelProgressComplete}
                    testId={currentTestId || undefined}
                />

                {/* 导出模态框 */}
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    data={{
                        testConfig,
                        result,
                        metrics,
                        realTimeData: stressTestData
                    }}
                    testType="stress"
                    testId={currentTestId || undefined}
                    testName={`压力测试-${getHostnameFromUrl(testConfig.url) || '未知'}`}
                    onExport={handleExport}
                />
            </div >

            {/* 历史标签页内容 */}
            {
                activeTab === 'history' && (
                    <div className="mt-6">
                        <StressTestHistory
                            onTestSelect={handleTestSelect}
                            onTestRerun={handleTestRerun}
                        />
                    </div>
                )
            }

            {/* 登录提示组件 */}
            {LoginPromptComponent}
        </div >
    );
};

export default StressTest;
