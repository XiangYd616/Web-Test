/* cSpell:ignore cooldown rampup rampdown */
import { AlertCircle, AlertTriangle, BarChart3, CheckCircle, Clock, Download, FileText, Loader, Lock, Play, RotateCcw, Square, TrendingUp, Users, XCircle, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { AdvancedStressTestChart, UnifiedStressTestCharts } from '../components/charts';
import { RealTimeStressChart } from '../components/charts/RealTimeStressChart';
import type { TestStatusType } from '../components/charts/UnifiedStressTestCharts';
import CancelTestConfirmDialog from '../components/dialogs/CancelTestConfirmDialog';
import CancelProgressFeedback from '../components/feedback/CancelProgressFeedback';
import StressTestHistory from '../components/stress/StressTestHistory';
import { URLInput } from '../components/testing';
import {
    TestPageLayout
} from '../components/testing/UnifiedTestingComponents';
import { AdvancedStressTestConfig as ImportedAdvancedStressTestConfig } from '../hooks/useSimpleTestEngine';
import { useStressTestRecord } from '../hooks/useStressTestRecord';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/backgroundTestManager';
import { testEngineManager } from '../services/testEngines';
import { TestPhase, type RealTimeMetrics, type TestDataPoint } from '../services/testStateManager';
import '../styles/compact-layout.css';
import '../styles/optimized-charts.css';
import '../styles/unified-testing-tools.css';
import { getTemplateById } from '../utils/testTemplates';

// 本地配置接口，继承导入的配置
interface StressTestConfig extends ImportedAdvancedStressTestConfig {
    // 可以添加额外的本地配置
}

// 生命周期压力测试配置接口 - 直接使用 StressTestConfig
type LifecycleStressTestConfig = StressTestConfig;



const StressTest: React.FC = () => {
    console.log('🔍 StressTest 组件开始渲染');

    // 登录检查
    const {
        isAuthenticated,
        requireLogin,
        LoginPromptComponent
    } = useAuthCheck({
        feature: "压力测试",
        description: "使用压力测试功能"
    });

    console.log('🔍 useAuthCheck 完成');

    // 用户统计
    const { recordTestCompletion } = useUserStats();
    console.log('🔍 useUserStats 完成');

    // 测试记录管理
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
    console.log('🔍 useStressTestRecord 完成');

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
    });






    const [testData, setTestData] = useState<TestDataPoint[]>([]);
    const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
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
    const [realTimeData, setRealTimeData] = useState<any[]>([]);
    const [finalResultData, setFinalResultData] = useState<TestDataPoint[]>([]);

    // 新的状态管理系统 - 修复require错误
    const [lifecycleManager] = useState<any>(() => {
        // 创建一个简化的生命周期管理器
        return {
            startTest: async (config: any) => {
                console.log('🔄 生命周期管理器启动测试:', config);
                setCurrentStatus('STARTING');
                setStatusMessage('正在启动压力测试引擎...');

                // 直接调用压力测试API
                try {
                    const response = await fetch('/api/test/stress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(config)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('✅ 生命周期管理器测试启动成功:', result);

                    // 不要立即设置为RUNNING，让WebSocket数据来驱动状态变化
                    setCurrentStatus('WAITING');
                    setStatusMessage('等待测试开始...');

                    // 设置测试ID，这将触发WebSocket房间加入
                    // 🔧 修复：从多个可能的位置提取testId
                    const testId = result.testId || result.data?.testId || result.data?.recordId;
                    if (testId) {
                        setCurrentTestId(testId);
                        console.log('🔑 生命周期管理器设置测试ID:', testId);
                    }

                    return testId;
                } catch (error) {
                    console.error('❌ 生命周期管理器测试启动失败:', error);
                    setCurrentStatus('FAILED');
                    setStatusMessage('测试启动失败');
                    throw error;
                }
            },
            cancelTest: async (reason: string) => {
                console.log('🔄 生命周期管理器取消测试:', reason);
                setCurrentStatus('CANCELLING');
                setStatusMessage('正在取消测试...');

                try {
                    // 🔧 修复：优先使用ref，然后是state，最后尝试从WebSocket数据中获取
                    let testIdToCancel = currentTestIdRef.current || currentTestId;

                    // 如果都没有，尝试从最近的WebSocket数据中获取testId
                    if (!testIdToCancel && realTimeData.length > 0) {
                        const lastDataPoint = realTimeData[realTimeData.length - 1];
                        if (lastDataPoint && lastDataPoint.testId) {
                            testIdToCancel = lastDataPoint.testId;
                            console.log('🔧 从WebSocket数据中恢复testId:', testIdToCancel);
                        }
                    }

                    console.log('🔍 取消测试ID检查:', {
                        testIdToCancel,
                        currentTestIdRef: currentTestIdRef.current,
                        currentTestId,
                        realTimeDataLength: realTimeData.length,
                        isRunning,
                        testStatus
                    });

                    if (testIdToCancel) {
                        console.log('🛑 调用后端取消API:', testIdToCancel);

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
            }
        };
    });
    const [currentStatus, setCurrentStatus] = useState<any>('IDLE'); // TestStatus.IDLE
    const [statusMessage, setStatusMessage] = useState<string>('准备开始测试');

    // 标签页状态
    const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

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

    // 统一的数据更新函数
    const updateChartData = useCallback((newPoints: any[], isRealTime: boolean = true) => {
        const processedPoints = newPoints.map(point => processDataPoint(point, isRealTime));

        if (isRealTime) {
            // 实时数据：追加到现有数据，用于实时监控视图
            setTestData(prev => {
                const combined = [...prev, ...processedPoints];
                console.log(`🔄 实时数据更新: ${prev.length} -> ${combined.length}`);
                return combined;
            });
        } else {
            // 最终结果：设置为独立的聚合数据，用于测试结果视图
            setFinalResultData(processedPoints);
            console.log(`🏁 最终结果数据设置: ${processedPoints.length} 个数据点`);
        }
    }, [processDataPoint]);

    // WebSocket相关状态
    const socketRef = useRef<any>(null);
    const [currentTestId, setCurrentTestId] = useState<string | null>(null);
    const currentTestIdRef = useRef<string>(''); // 用于在事件监听器中获取最新的testId

    // 同步currentTestId到ref
    useEffect(() => {
        currentTestIdRef.current = currentTestId || '';
        console.log('🔄 同步测试ID到ref:', currentTestId);
    }, [currentTestId]);

    // 测试记录ID状态
    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

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
        setTestStatus('starting');
        setTestProgress('正在初始化压力测试...');
        setTestData([]);
        setRealTimeData([]);
        setFinalResultData([]);
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
                    status: 'pending',
                    config: {
                        users: testConfig.users,
                        duration: testConfig.duration,
                        rampUpTime: testConfig.rampUp,
                        testType: testConfig.testType,
                        method: testConfig.method,
                        timeout: testConfig.timeout,
                        thinkTime: testConfig.thinkTime,
                        warmupDuration: testConfig.warmupDuration,
                        cooldownDuration: testConfig.cooldownDuration
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

            // 发送真实的压力测试请求
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
                    options: {
                        users: testConfig.users,
                        duration: testConfig.duration,
                        rampUpTime: testConfig.rampUp,
                        testType: testConfig.testType,
                        method: testConfig.method,
                        timeout: testConfig.timeout,
                        thinkTime: testConfig.thinkTime
                    }
                })
            });

            const data = await response.json();
            console.log('🔄 收到后端响应:', {
                success: data.success,
                hasData: !!data.data,
                responseTestId: data.data?.testId,
                sentTestId: realTestId
            });

            if (data.success && data.data) {
                // ✅ 时序修复：后端确认测试启动后，立即设置testId并加入房间
                const confirmedTestId = data.data.testId || realTestId;
                console.log('✅ 后端确认测试启动，设置testId:', confirmedTestId);

                // 立即设置testId，这将触发useEffect加入WebSocket房间
                setCurrentTestId(confirmedTestId);

                if (data.data.testId && data.data.testId === realTestId) {
                    console.log('✅ 测试ID验证成功，前后端testId一致:', data.data.testId);
                } else {
                    console.warn('⚠️ 测试ID不匹配，使用后端返回的testId:', {
                        sent: realTestId,
                        received: data.data.testId
                    });
                }

                // 设置测试状态
                setTestStatus('running');
                setTestProgress('压力测试正在运行...');

                // 启动定期数据检查
                if (data.data.testId) {
                    dataCheckIntervalRef.current = setInterval(async () => {
                        if (realTimeData.length === 0 && isRunning) {
                            console.log('🔄 定期检查：没有收到WebSocket数据，尝试API轮询...');
                            try {
                                const response = await fetch(`/api/test/stress/status/${data.data.testId}`);
                                const statusData = await response.json();

                                if (statusData.success && statusData.data) {
                                    console.log('📡 API轮询获取到数据:', {
                                        hasRealTimeData: !!statusData.data.realTimeData,
                                        realTimeDataLength: statusData.data.realTimeData?.length || 0,
                                        hasMetrics: !!statusData.data.metrics
                                    });

                                    // 更新实时数据
                                    if (statusData.data.realTimeData && statusData.data.realTimeData.length > 0) {
                                        setRealTimeData(statusData.data.realTimeData);

                                        // 使用统一的数据处理函数，只处理新增的数据点
                                        const newPoints = statusData.data.realTimeData.slice(testData.length);
                                        if (newPoints.length > 0) {
                                            updateChartData(newPoints, true);
                                        }
                                    }

                                    // 更新指标
                                    if (statusData.data.metrics) {
                                        setMetrics(statusData.data.metrics);
                                    }
                                }
                            } catch (error) {
                                console.error('❌ 定期API轮询失败:', error);
                            }
                        }
                    }, 3000); // 每3秒检查一次
                }

                // WebSocket房间加入将由connect事件自动处理，无需在此处重复发送
                if (data.data.testId) {
                    console.log('🔗 测试ID已设置，WebSocket将自动加入房间:', data.data.testId);

                    // 设置一个定时器来检查是否收到数据
                    setTimeout(async () => {
                        console.log('⏰ 5秒后检查数据接收状态:', {
                            realTimeDataLength: realTimeData.length,
                            testDataLength: testData.length,
                            currentMetrics: metrics,
                            testStatus: testStatus
                        });

                        // 如果没有收到数据，尝试通过API获取
                        if (realTimeData.length === 0) {
                            console.log('🔄 没有收到WebSocket数据，尝试API轮询...');
                            try {
                                const response = await fetch(`/api/test/stress/status/${data.data.testId}`);
                                const statusData = await response.json();
                                console.log('📡 API状态查询结果:', statusData);

                                if (statusData.success && statusData.data) {
                                    // 手动更新数据
                                    if (statusData.data.realTimeData && statusData.data.realTimeData.length > 0) {
                                        console.log('🔄 通过API获取到实时数据，手动更新UI');
                                        setRealTimeData(statusData.data.realTimeData);
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
                // 检查是否是取消状态，如果是则不覆盖
                if (data.data.status === 'cancelled') {
                    setTestStatus('cancelled');
                    setTestProgress('测试已取消');
                    // 🔧 修复：取消状态时延迟清空testId
                    setTimeout(() => setCurrentTestId(null), 1000);
                } else {
                    setTestStatus('completed');
                    setTestProgress('压力测试完成！');
                    // 完成状态可以立即清空testId
                    setCurrentTestId(null);
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
                throw new Error(data.message || '测试启动失败');
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
        const template = getTemplateById(templateId);
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

    // 新的状态管理系统监听器
    useEffect(() => {
        console.log('🔄 状态更新:', currentStatus, statusMessage);

        // 将新的状态映射到旧的状态系统，保持兼容性
        const statusMapping: Record<string, TestStatusType> = {
            'IDLE': 'idle',
            'PREPARING': 'running',
            'WAITING': 'running',
            'STARTING': 'running',
            'RUNNING': 'running',
            'COMPLETING': 'running',
            'COMPLETED': 'completed',
            'FAILING': 'running',
            'FAILED': 'failed',
            'CANCELLING': 'running',
            'CANCELLED': 'cancelled',
            'TIMEOUT': 'failed'
        };

        const mappedStatus = statusMapping[currentStatus] || 'idle';
        setTestStatus(mappedStatus);
        setTestProgress(statusMessage);

        // 根据状态更新运行状态
        const runningStates = ['PREPARING', 'WAITING', 'STARTING', 'RUNNING', 'COMPLETING', 'FAILING', 'CANCELLING'];
        setIsRunning(runningStates.includes(currentStatus));
        setIsCancelling(currentStatus === 'CANCELLING');
    }, [currentStatus, statusMessage]);

    // 监听生命周期管理器的状态变化 - 已修复并启用
    useEffect(() => {
        if (lifecycleManager) {
            console.log('🔄 生命周期管理器已启用并准备就绪');
        }
    }, [lifecycleManager]);

    // 自动选择默认模板（仅在简化模式下且未手动选择时）
    React.useEffect(() => {
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
    React.useEffect(() => {
        if (isAdvancedMode) {
            setHasAutoSelectedTemplate(false);
        }
    }, [isAdvancedMode]);

    // 不再生成模拟数据，只使用真实的测试数据

    // 统一图表数据处理 - 使用真实数据或示例数据
    const unifiedTestData = {
        // 实时监控使用处理过的testData，保持原始数据的细节
        realTimeData: testData.length > 0 ? testData : [],
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
            timeSeriesData: testData.length > 0 ? testData : finalResultData
        } : undefined,
        historicalResults: [] as any[],
        baseline: baselineData
    };

    // 测试状态同步 - 修复状态冲突问题，保持取消状态
    useEffect(() => {
        // ✅ 修复：使用函数式更新避免依赖 testStatus
        setTestStatus(prevStatus => {
            // 优先级：cancelled > completed > failed > running > idle
            // 如果当前状态是 cancelled，不要覆盖它
            if (prevStatus === 'cancelled') {
                console.log('🔍 保持取消状态，不覆盖');
                return 'cancelled';
            }

            if (result && !isRunning) {
                // 检查结果中的状态，如果是取消状态则保持
                if (result.status === 'cancelled') {
                    console.log('🔍 结果状态为取消，设置为 cancelled');
                    return 'cancelled';
                } else {
                    console.log('🔍 结果状态为:', result.status, '设置为 completed');
                    return 'completed';
                }
            } else if (error && !isRunning) {
                return 'failed';
            } else if (isRunning) {
                return 'running';
            } else {
                return 'idle';
            }
        });
    }, [isRunning, result, error]); // ✅ 修复：移除 testStatus 依赖

    // 监听后台测试状态变化
    useEffect(() => {
        const unsubscribe = backgroundTestManager.addListener((event: string, testInfo: any) => {
            if (testInfo.type === 'stress' && testInfo.id === currentTestId) {
                switch (event) {
                    case 'testProgress':
                        setBackgroundTestInfo(testInfo);
                        setTestProgress(testInfo.currentStep);
                        setTestStatus('running');
                        setIsRunning(true);

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
                        // 检查是否是取消状态，如果是则不覆盖
                        if (processedResult.status === 'cancelled') {
                            setTestStatus('cancelled');
                            setTestProgress('测试已取消');
                        } else {
                            setTestStatus('completed');
                            setTestProgress('压力测试完成！');
                        }
                        setIsRunning(false);
                        // 🔧 修复：延迟清空testId，确保取消请求能正常发送
                        setTimeout(() => setCurrentTestId(null), 1000);
                        // 记录测试完成统计
                        if (processedResult) {
                            const success = processedResult.success !== false;
                            const score = processedResult.metrics?.averageResponseTime ?
                                Math.max(0, 100 - Math.min(100, processedResult.metrics.averageResponseTime / 10)) : undefined;
                            const duration = processedResult.actualDuration || processedResult.duration || testConfig.duration;
                            recordTestCompletion('压力测试', success, score, duration);

                            // 更新测试记录 (背景测试)
                            if (currentRecord) {
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
                            }
                        }
                        break;
                    case 'testFailed':
                        setBackgroundTestInfo(testInfo);
                        setError(testInfo.error || '测试失败');
                        setTestStatus('failed');
                        setIsRunning(false);
                        // 🔧 修复：延迟清空testId，确保取消请求能正常发送
                        setTimeout(() => setCurrentTestId(null), 1000);

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
                        // 🔧 修复：延迟清空testId，确保取消请求能正常发送
                        setTimeout(() => setCurrentTestId(null), 1000);

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
            setTestStatus('running');
            setTestProgress(stressTest.currentStep);
            setIsRunning(true);
        }

        return unsubscribe;
    }, [currentTestId]);

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
                    console.log('🔌 WebSocket连接成功');
                    console.log('🔌 Socket连接状态:', socket.connected);
                    console.log('🔌 Socket ID:', socket.id);

                    // 连接成功后立即检查是否有当前测试需要加入房间
                    const currentTestIdValue = currentTestIdRef.current;
                    if (currentTestIdValue) {
                        console.log('🏠 连接成功后立即加入当前测试房间:', currentTestIdValue);
                        socket.emit('join-stress-test', currentTestIdValue);
                    }
                });

                // 设置房间加入确认监听器（全局监听）
                socket.on('room-joined', (roomData: any) => {
                    console.log('✅ 房间加入确认:', roomData);
                    console.log('🎯 房间加入成功，开始接收实时数据');

                    // 更新房间连接状态
                    setIsInRoom(true);
                });

                // ✅ 监听测试完成事件 (简化版，主要处理在下面的完整监听器中)

                // ✅ 监听测试错误事件
                socket.on('stress-test-error', (data: any) => {
                    console.log('❌ 收到测试错误事件:', data);
                    if (data.testId === currentTestIdRef.current) {
                        setCurrentStatus('FAILED');
                        setStatusMessage('测试失败: ' + data.error);
                        console.error('❌ 压力测试失败:', data);
                    }

                    // 房间加入成功，不需要额外的ping验证
                    console.log('🎯 房间加入成功，开始接收实时数据');
                });

                // 监听测试ping响应
                socket.on('test-pong', (pongData: any) => {
                    console.log('🏓 收到测试pong响应:', pongData);
                });

                // 保存socket实例到全局，供其他地方使用
                (window as any).socket = socket;

                socket.on('disconnect', () => {
                    console.log('🔌 WebSocket连接断开');
                    setIsInRoom(false);
                });

                // 添加通用事件监听器来调试所有接收到的事件
                socket.onAny((eventName, ...args) => {
                    if (eventName.includes('stress') || eventName.includes('test') || eventName.includes('data')) {
                        console.log('🎯 收到事件:', eventName, '数据:', args);
                    }
                });

                // 压力测试实时数据
                socket.on('stress-test-data', (data) => {
                    console.log('📊 收到WebSocket实时数据:', {
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
                            throughput: data.currentTPS || 0,
                            errorRate: 0, // 需要计算
                            success: true
                        };
                        console.log('📈 处理直接数据点:', dataPoint);
                    }

                    if (dataPoint) {
                        // 添加到实时数据
                        setRealTimeData(prev => {
                            const newData = [...prev, dataPoint];
                            console.log('🔄 realTimeData更新:', {
                                previousLength: prev.length,
                                newLength: newData.length,
                                latestPoint: dataPoint
                            });
                            // 限制数据点数量，避免内存溢出
                            return newData.length > 1000 ? newData.slice(-800) : newData;
                        });

                        // 使用统一的数据处理函数
                        const chartDataPoint = processDataPoint(dataPoint, true);
                        console.log('📊 统一处理后的图表数据点:', chartDataPoint);

                        setTestData(prev => {
                            const newData = [...prev, chartDataPoint];
                            console.log('🔄 testData更新:', {
                                previousLength: prev.length,
                                newLength: newData.length,
                                latestPoint: chartDataPoint
                            });
                            return newData.length > 1000 ? newData.slice(-800) : newData;
                        });
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
                            throughput: data.currentTPS || 0,
                            errorRate: 0,
                            p50ResponseTime: data.dataPointResponseTime || 0,
                            p90ResponseTime: data.dataPointResponseTime || 0,
                            p95ResponseTime: data.dataPointResponseTime || 0,
                            p99ResponseTime: data.dataPointResponseTime || 0
                        };
                        console.log('📊 收到直接指标数据:', metricsData);
                    }

                    if (metricsData) {
                        const updatedMetrics = {
                            ...metricsData,
                            currentTPS: typeof metricsData.currentTPS === 'number' ? metricsData.currentTPS : 0,
                            peakTPS: typeof metricsData.peakTPS === 'number' ? metricsData.peakTPS : 0,
                            throughput: typeof metricsData.throughput === 'number' ? metricsData.throughput : 0,
                            errorRate: typeof metricsData.errorRate === 'number' ? metricsData.errorRate : 0
                        };

                        setMetrics(prev => {
                            console.log('🔄 指标更新:', {
                                previous: prev,
                                new: updatedMetrics,
                                hasChanged: JSON.stringify(prev) !== JSON.stringify(updatedMetrics)
                            });

                            return updatedMetrics;
                        });
                    }

                    // 更新进度
                    if (data.progress !== undefined) {
                        setTestProgress(`测试进行中... ${Math.round(data.progress)}%`);
                    }
                });

                // 压力测试状态更新
                socket.on('stress-test-status', (data) => {
                    console.log('📊 收到状态更新:', data);

                    // 处理取消状态
                    if (data.status === 'cancelled') {
                        console.log('🛑 收到取消状态通知');
                        setTestStatus('cancelled');
                        setTestProgress(data.message || '测试已取消');
                        setIsRunning(false);
                        setIsCancelling(false);
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

                    // ✅ 修复：保护取消状态不被覆盖
                    setTestStatus(prevStatus => {
                        if (prevStatus === 'cancelled') {
                            console.log('🔒 保护取消状态，忽略状态更新:', data.status);
                            return 'cancelled';
                        }
                        return data.status || 'running';
                    });

                    if (data.progress !== undefined) {
                        setTestProgress(`测试进行中... ${Math.round(data.progress)}%`);
                    }
                });

                // 压力测试完成
                socket.on('stress-test-complete', (data) => {
                    console.log('✅ 测试完成:', data);

                    // 检查testId是否匹配
                    if (data.testId !== currentTestIdRef.current) {
                        console.warn('⚠️ 收到的完成事件testId不匹配:', {
                            received: data.testId,
                            current: currentTestIdRef.current
                        });
                        return;
                    }

                    // 检查是否是取消状态
                    if (data.results?.status === 'cancelled' || data.status === 'cancelled' || data.results?.cancelled) {
                        console.log('🛑 测试已取消，设置取消状态');
                        setTestStatus('cancelled');
                        setTestProgress('测试已取消');
                        setCurrentStatus('CANCELLED');
                        setStatusMessage('测试已取消');
                    } else {
                        console.log('✅ 测试正常完成');
                        setTestStatus('completed');
                        setTestProgress('压力测试完成！');
                        setCurrentStatus('COMPLETED');
                        setStatusMessage('测试已完成');
                    }
                    setIsRunning(false);
                    // 🔧 修复：延迟清空testId，确保不会影响其他操作
                    setTimeout(() => setCurrentTestId(null), 1000);
                    setIsInRoom(false);
                    setResult(data.results);

                    if (data.results?.metrics) {
                        setMetrics(data.results.metrics);
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
                    if (currentRecord && data.results) {
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

    // 房间加入函数
    const joinWebSocketRoom = useCallback((testId: string) => {
        const socket = socketRef.current;
        if (socket && socket.connected && testId) {
            console.log('🏠 准备加入WebSocket房间:', testId);
            socket.emit('join-stress-test', testId);
            console.log('🏠 已发送加入房间请求:', `stress-test-${testId}`);

            // 房间加入请求已发送，等待确认
        } else {
            console.warn('⚠️ 无法加入房间:', {
                hasSocket: !!socket,
                connected: socket?.connected,
                testId: testId
            });

            // 如果socket存在但未连接，等待连接后再加入
            if (socket && !socket.connected) {
                socket.once('connect', () => {
                    console.log('🔌 Socket重新连接，现在加入房间:', testId);
                    socket.emit('join-stress-test', testId);
                });
            }
        }
    }, []);

    // ✅ 根本性修复：简化房间管理逻辑，只要有testId和WebSocket连接就加入房间
    useEffect(() => {
        console.log('🔍 简化房间加入条件检查:', {
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
                    if (realTimeData.length === 0) {
                        console.log('🔍 没有收到数据，重新加入房间:', currentTestId);
                        socketRef.current.emit('join-stress-test', currentTestId);
                    }
                }
            }, 10000); // 每10秒检查一次

            return () => {
                clearInterval(roomCheckInterval);
            };
        }

        return undefined;
    }, [currentTestId, joinWebSocketRoom]); // 移除testStatus依赖，简化触发条件

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

        try {
            console.log('🎯 开始压力测试:', testConfig.url);

            // 清理之前的状态
            setError('');
            setResult(null);
            setTestData([]);
            setFinalResultData([]);
            setRealTimeData([]);
            setMetrics(null);
            setCanSwitchPages(false);

            // 格式化 URL
            const formatUrl = (url: string): string => {
                const trimmedUrl = url.trim();
                if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                    return trimmedUrl;
                }
                return `https://${trimmedUrl}`;
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
            setTestStatus('failed');
            setIsRunning(false);
        }
    };

    // 完整的重置函数
    const resetTestState = useCallback(() => {
        console.log('🔄 重置所有测试状态...');

        // 重置基本状态
        setTestStatus('idle');
        setTestProgress('');
        setIsRunning(false);
        setIsStopping(false);
        setIsCancelling(false);
        setError('');

        // 重置数据
        setTestData([]);
        setRealTimeData([]);
        setFinalResultData([]);
        setMetrics(null);
        setResult(null);

        // 重置测试ID和记录ID
        setCurrentTestId(null);
        setCurrentRecordId(null);
        currentTestIdRef.current = '';

        // 重置状态管理
        setCurrentStatus('IDLE');
        setStatusMessage('准备开始测试');

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
            realTimeDataLength: realTimeData.length,
            lastDataPoint: realTimeData[realTimeData.length - 1]
        });

        // 防止重复取消
        if (isCancelling || cancelInProgress) {
            console.log('⚠️ 正在取消中，忽略重复请求');
            return;
        }

        // 检查是否有正在运行的测试
        if (!isRunning && testStatus !== 'running') {
            console.log('⚠️ 没有正在运行的测试需要取消');
            return;
        }

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
                        body: JSON.stringify({ reason: '用户手动取消' })
                    });

                    console.log('📡 响应状态:', response.status, response.statusText);
                    console.log('📡 响应头:', Object.fromEntries(response.headers.entries()));

                    if (response.ok) {
                        const result = await response.json();
                        console.log('✅ 后端取消成功:', result);

                        // 如果后端确认取消成功，立即设置本地状态
                        if (result.success) {
                            console.log('🎯 后端确认取消成功，更新本地状态');
                            setIsRunning(false);
                            setTestStatus('cancelled');
                            setCurrentStatus('CANCELLED');
                            setStatusMessage('测试已取消');
                        }
                    } else {
                        const errorText = await response.text();
                        console.warn('⚠️ 后端取消失败:', response.status, errorText);

                        // 即使后端取消失败，也要设置本地状态
                        console.log('🔄 后端取消失败，但仍设置本地取消状态');
                    }
                } catch (fetchError) {
                    console.error('❌ 网络请求失败:', fetchError);
                }
            } else {
                console.warn('⚠️ 没有找到测试ID，无法调用后端取消API');
            }

            // 确保本地状态已设置为已取消（防止重复设置）
            console.log('🔄 确保本地取消状态已设置...');
            setIsRunning(false);
            setTestStatus('cancelled');
            setCanSwitchPages(true);
            setCurrentStatus('CANCELLED');
            setStatusMessage('测试已取消');

            // 断开WebSocket连接
            if (socketRef.current) {
                console.log('🔌 断开WebSocket连接...');
                socketRef.current.disconnect();
            }

            // 清理实时数据接收
            console.log('🧹 清理测试相关状态...');

            console.log('✅ 取消测试完成');

        } catch (error: any) {
            console.error('❌ 取消测试失败:', error);
            setError(error.message || '取消测试失败');
        } finally {
            setIsCancelling(false);
            setCancelInProgress(false);
        }
    };

    // 处理取消进度完成
    const handleCancelProgressComplete = () => {
        setShowCancelProgress(false);
        setCancelInProgress(false);
        setIsCancelling(false);

        // 确保状态正确设置
        setIsRunning(false);
        setTestStatus('cancelled');
        setTestProgress('测试已取消');

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
        currentTestIdRef.current = '';

        console.log('✅ 强制取消完成');
    }, []);

    // 导出数据处理函数
    const handleExportData = (data: any) => {
        const exportData = {
            testConfig,
            testResult: data.testResult,
            realTimeData: data.realTimeData,
            metrics: data.currentMetrics,
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stress-test-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
                    dataStr = `URL,Duration,Total Requests,Success Rate,Average Response Time\n${testConfig.url},${testConfig.duration},${result.metrics.totalRequests},${result.metrics.successRate}%,${result.metrics.averageResponseTime}ms`;
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

    return (
        <TestPageLayout className="space-y-3 dark-page-scrollbar compact-layout">

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
                                        {isAuthenticated ? <Play className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                        <span>{isAuthenticated ? '开始测试' : '需要登录'}</span>
                                    </button>
                                ) : testStatus === 'starting' ? (
                                    <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-md">
                                        <Loader className="w-3 h-3 animate-spin text-blue-400" />
                                        <span className="text-xs text-blue-300 font-medium">正在启动...</span>
                                    </div>
                                ) : testStatus === 'running' || isRunning ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md">
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-300 font-medium">测试进行中</span>
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
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 根据标签页显示不同内容 */}
            {
                activeTab === 'test' ? (
                    <>
                        {/* URL 输入 */}
                        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">测试URL</label>
                            <URLInput
                                value={testConfig.url}
                                onChange={(url) => setTestConfig((prev: StressTestConfig) => ({ ...prev, url }))}
                                placeholder="输入要进行压力测试的网站URL..."
                                enableReachabilityCheck={false}
                            />
                        </div>

                        {/* 进度和错误显示 */}
                        {(testProgress || backgroundTestInfo || error) && (
                            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                                {/* 测试进度 */}
                                {(testProgress || backgroundTestInfo) && (
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-base font-semibold text-white">测试进度</h4>
                                            {backgroundTestInfo && (
                                                <span className="text-xs text-blue-300 font-medium">
                                                    {Math.round(backgroundTestInfo.progress || 0)}%
                                                </span>
                                            )}
                                        </div>

                                        {/* 进度条 */}
                                        {backgroundTestInfo && (
                                            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                                                <div
                                                    className={`test-progress-dynamic h-2 rounded-full transition-all duration-300 ${backgroundTestInfo.progress >= 100 ? 'progress-100' :
                                                        backgroundTestInfo.progress >= 95 ? 'progress-95' :
                                                            backgroundTestInfo.progress >= 90 ? 'progress-90' :
                                                                backgroundTestInfo.progress >= 85 ? 'progress-85' :
                                                                    backgroundTestInfo.progress >= 80 ? 'progress-80' :
                                                                        backgroundTestInfo.progress >= 75 ? 'progress-75' :
                                                                            backgroundTestInfo.progress >= 70 ? 'progress-70' :
                                                                                backgroundTestInfo.progress >= 65 ? 'progress-65' :
                                                                                    backgroundTestInfo.progress >= 60 ? 'progress-60' :
                                                                                        backgroundTestInfo.progress >= 55 ? 'progress-55' :
                                                                                            backgroundTestInfo.progress >= 50 ? 'progress-50' :
                                                                                                backgroundTestInfo.progress >= 45 ? 'progress-45' :
                                                                                                    backgroundTestInfo.progress >= 40 ? 'progress-40' :
                                                                                                        backgroundTestInfo.progress >= 35 ? 'progress-35' :
                                                                                                            backgroundTestInfo.progress >= 30 ? 'progress-30' :
                                                                                                                backgroundTestInfo.progress >= 25 ? 'progress-25' :
                                                                                                                    backgroundTestInfo.progress >= 20 ? 'progress-20' :
                                                                                                                        backgroundTestInfo.progress >= 15 ? 'progress-15' :
                                                                                                                            backgroundTestInfo.progress >= 10 ? 'progress-10' :
                                                                                                                                backgroundTestInfo.progress >= 5 ? 'progress-5' : 'progress-0'
                                                        }`}
                                                ></div>
                                            </div>
                                        )}

                                        <p className="text-blue-300 text-sm mb-2">{testProgress}</p>

                                        {/* 测试时间信息 */}
                                        {backgroundTestInfo && backgroundTestInfo.startTime && (
                                            <div className="flex items-center space-x-3 text-xs text-gray-400">
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>开始: {new Date(backgroundTestInfo.startTime).toLocaleTimeString()}</span>
                                                </div>
                                                <span>•</span>
                                                <span>
                                                    运行: {Math.floor((Date.now() - new Date(backgroundTestInfo.startTime).getTime()) / 1000)}秒
                                                </span>
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
                                    </div>
                                )}

                                {/* 错误提示 */}
                                {error && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                                        <div className="flex items-center space-x-1.5">
                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                            <p className="text-red-300 text-sm">{error}</p>
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
                                                        const fullTemplate = getTemplateById(template.id);
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
                                                    testConfig.testType === 'spike' ? '峰值冲击' : '恒定负载'}
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
                                                <Lock className="w-5 h-5" />
                                                <span>需要登录</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* 高级模式 - 原有的详细配置 */
                            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                                {/* 测试配置 */}
                                <div className="xl:col-span-3 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                    <h3 className="text-xl font-semibold text-white mb-4">高级测试配置</h3>

                                    {/* 测试类型选择 - 移动端优化布局 */}
                                    <div className="mb-4">
                                        <h4 className="text-lg font-medium text-white mb-3">测试类型</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {/* 梯度加压 */}
                                            <div
                                                className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'gradual'
                                                    ? 'border-green-500 bg-green-500/10'
                                                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                    }`}
                                                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'gradual' }))}
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
                                                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'spike' }))}
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
                                                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'constant' }))}
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
                                                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'stress' }))}
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
                                        </div>
                                    </div>

                                    {/* 测试参数 - 移动端优化 */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* 并发用户数 */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                并发用户数
                                            </label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={testConfig.users}
                                                    onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, users: parseInt(e.target.value) || 0 }))}
                                                    className="w-full pl-14 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    min="1"
                                                    max="1000"
                                                    placeholder="用户数"
                                                />
                                            </div>
                                        </div>

                                        {/* 测试时长 */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                测试时长 (秒)
                                            </label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={testConfig.duration}
                                                    onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                                                    className="w-full pl-14 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    min="10"
                                                    max="3600"
                                                    placeholder="时长"
                                                />
                                            </div>
                                        </div>

                                        {/* 加压时间 */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                加压时间 (秒)
                                            </label>
                                            <div className="relative">
                                                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={testConfig.rampUp}
                                                    onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, rampUp: parseInt(e.target.value) || 0 }))}
                                                    className="w-full pl-14 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    min="1"
                                                    max="300"
                                                    placeholder="加压时间"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 测试状态显示区域 */}
                                    {isRunning ? (
                                        <div className="bg-gray-900/50 rounded-lg p-4 h-80 flex items-center justify-center">
                                            <div className="text-center max-w-md">
                                                <div className="w-16 h-16 mx-auto mb-4 relative">
                                                    <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
                                                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                                                </div>
                                                <div className="text-white font-medium text-lg mb-2">压力测试进行中</div>
                                                <div className="text-gray-400 text-base mb-4">
                                                    {realTimeData.length === 0 ? '正在初始化监控数据...' : '等待更多数据...'}
                                                </div>

                                                {/* 详细状态信息 */}
                                                <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
                                                    <div className="grid grid-cols-2 gap-4 text-left">
                                                        <div>
                                                            <div className="text-gray-300 font-medium mb-2">测试配置</div>
                                                            <div className="text-gray-400 space-y-1">
                                                                <div>目标用户: {testConfig.users}</div>
                                                                <div>测试时长: {testConfig.duration}秒</div>
                                                                <div>加压时间: {testConfig.rampUp}秒</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-300 font-medium mb-2">实时状态</div>
                                                            <div className="text-gray-400 space-y-1">
                                                                <div>数据点: {realTimeData.length}</div>
                                                                <div>WebSocket: {socketRef.current?.connected ? '✅ 已连接' : '❌ 未连接'}</div>
                                                                <div>测试ID: {currentTestId ? currentTestId.slice(-8) : '生成中...'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                                        <div className="text-gray-300 font-medium mb-2">当前进度</div>
                                                        <div className="text-blue-300">{testProgress || '正在启动测试引擎...'}</div>
                                                        {metrics && (
                                                            <div className="mt-2 text-xs text-gray-400">
                                                                已收集 {metrics.totalRequests || 0} 个请求数据
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-900/50 rounded-lg p-4 h-80 flex items-center justify-center">
                                            <div className="text-center max-w-lg">
                                                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                <div className="text-gray-400 font-medium text-lg mb-2">专业级压力测试监控</div>
                                                <div className="text-gray-500 text-base mb-6">
                                                    开始测试后将显示实时性能数据
                                                </div>

                                                {/* 功能预览 */}
                                                <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
                                                    <div className="text-gray-300 font-medium mb-3">监控功能预览</div>
                                                    <div className="grid grid-cols-2 gap-4 text-left">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                                                <span>实时请求统计</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <Clock className="w-4 h-4 text-yellow-400" />
                                                                <span>响应时间监控</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <TrendingUp className="w-4 h-4 text-purple-400" />
                                                                <span>TPS性能指标</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                                <span>成功率分析</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                                                <span>错误率监控</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <Zap className="w-4 h-4 text-blue-400" />
                                                                <span>WebSocket实时数据</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                                        <div className="text-xs text-gray-500">
                                                            💡 提示：配置测试参数并点击"开始测试"来启动实时监控
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 调试信息面板 */}
                                    {(isRunning || realTimeData.length > 0) && (
                                        <div className="mt-4 bg-gray-800/30 rounded-lg p-3">
                                            <details className="group">
                                                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center">
                                                    <span className="mr-2">🔧 调试信息</span>
                                                    <span className="text-xs">(点击展开)</span>
                                                </summary>
                                                <div className="mt-3 text-xs text-gray-500 space-y-2">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-gray-400 font-medium">WebSocket状态</div>
                                                            <div>连接: {socketRef.current?.connected ? '✅' : '❌'}</div>
                                                            <div>房间: {currentTestId ? `stress-test-${currentTestId.slice(-8)}` : '未加入'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 font-medium">数据统计</div>
                                                            <div>实时数据点: {realTimeData.length}</div>
                                                            <div>图表数据点: {testData.length}</div>
                                                            <div>最后更新: {realTimeData.length > 0 ? new Date(realTimeData[realTimeData.length - 1].timestamp).toLocaleTimeString() : '无'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-gray-700">
                                                        <div className="text-gray-400 font-medium mb-1">最新指标</div>
                                                        <div className="text-xs">
                                                            {metrics ? (
                                                                `总请求: ${metrics.totalRequests} | 成功: ${metrics.successfulRequests} | 失败: ${metrics.failedRequests} | 平均响应: ${metrics.averageResponseTime}ms | 当前TPS: ${metrics.currentTPS}`
                                                            ) : '暂无指标数据'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    )}


                                </div>

                                {/* 右侧控制面板 */}
                                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">测试控制</h3>

                                    {/* 当前配置摘要 */}
                                    <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">并发用户:</span>
                                                <span className="text-white font-medium">{testConfig.users} 个</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">测试时长:</span>
                                                <span className="text-white font-medium">{testConfig.duration} 秒</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">测试类型:</span>
                                                <span className="text-white font-medium">
                                                    {testConfig.testType === 'gradual' ? '梯度加压' :
                                                        testConfig.testType === 'spike' ? '峰值测试' :
                                                            testConfig.testType === 'constant' ? '恒定负载' : '压力极限'}
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

                                    {/* 快速模板 */}
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-gray-300 mb-3">快速模板</h4>
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => applyTemplate('light-load')}
                                                className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-green-400">●</span>
                                                    <span>轻量测试</span>
                                                </div>
                                                <span className="text-xs text-gray-500">5用户/30秒</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyTemplate('medium-load')}
                                                className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-yellow-400">●</span>
                                                    <span>中等负载</span>
                                                </div>
                                                <span className="text-xs text-gray-500">20用户/60秒</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyTemplate('heavy-load')}
                                                className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-red-400">●</span>
                                                    <span>重负载</span>
                                                </div>
                                                <span className="text-xs text-gray-500">50用户/120秒</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 测试引擎状态 */}
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-gray-300 mb-3">引擎状态</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                <span className="text-gray-300">真实网络测试</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                <span className="text-gray-300">准确性能指标</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                                <span className="text-gray-300">实时错误检测</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 导出功能 */}
                                    {result && (
                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium text-gray-300 mb-3">导出报告</h4>
                                            <button
                                                type="button"
                                                onClick={() => handleExportReport('json')}
                                                className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>导出 JSON</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 测试结果 */}
                        {(result || metrics) && (
                            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-semibold text-white">测试结果</h3>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleExportReport('json')}
                                            className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                                            title="导出JSON数据"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>JSON</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleExportReport('csv')}
                                            className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                                            title="导出CSV数据"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span>CSV</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 主要性能指标卡片 */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                        <div className="text-2xl font-bold text-blue-400">
                                            {result?.metrics?.totalRequests || metrics?.totalRequests || 0}
                                        </div>
                                        <div className="text-sm text-blue-300">总请求数</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                                        <div className="text-2xl font-bold text-green-400">
                                            {result?.metrics?.successfulRequests || metrics?.successfulRequests || 0}
                                        </div>
                                        <div className="text-sm text-green-300">成功请求</div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
                                        <div className="text-2xl font-bold text-orange-400">
                                            {result?.metrics?.averageResponseTime || metrics?.averageResponseTime || 0}ms
                                        </div>
                                        <div className="text-sm text-orange-300">平均响应时间</div>
                                    </div>
                                    <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                                        <div className="text-2xl font-bold text-red-400">
                                            {(() => {
                                                const errorRate = result?.metrics?.errorRate || metrics?.errorRate || 0;
                                                return typeof errorRate === 'string' ? errorRate : errorRate.toFixed(1);
                                            })()}%
                                        </div>
                                        <div className="text-sm text-red-300">错误率</div>
                                    </div>
                                </div>

                                {/* 详细性能指标 */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* 响应时间分析 */}
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                                            <Clock className="w-5 h-5 mr-2 text-orange-400" />
                                            响应时间分析
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-green-400">
                                                    {result?.metrics?.p50ResponseTime || metrics?.p50ResponseTime || 0}ms
                                                </div>
                                                <div className="text-xs text-gray-400">P50响应时间</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-red-400">
                                                    {result?.metrics?.p90ResponseTime || metrics?.p90ResponseTime || 0}ms
                                                </div>
                                                <div className="text-xs text-gray-400">P90响应时间</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-blue-400">
                                                    {result?.metrics?.p95ResponseTime || metrics?.p95ResponseTime || 0}ms
                                                </div>
                                                <div className="text-xs text-gray-400">P95响应时间</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-purple-400">
                                                    {result?.metrics?.p99ResponseTime || metrics?.p99ResponseTime || 0}ms
                                                </div>
                                                <div className="text-xs text-gray-400">P99响应时间</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 吞吐量分析 */}
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                                            <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                                            吞吐量分析
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-blue-400">
                                                    {result?.metrics?.currentTPS || metrics?.currentTPS || 0}
                                                </div>
                                                <div className="text-xs text-gray-400">当前TPS</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-green-400">
                                                    {result?.metrics?.peakTPS || metrics?.peakTPS || 0}
                                                </div>
                                                <div className="text-xs text-gray-400">峰值TPS</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-yellow-400">
                                                    {(() => {
                                                        const throughput = result?.metrics?.throughput || metrics?.throughput || 0;
                                                        console.log('🔍 总吞吐量显示值:', throughput, 'result:', result?.metrics?.throughput, 'metrics:', metrics?.throughput);
                                                        return throughput;
                                                    })()}
                                                </div>
                                                <div className="text-xs text-gray-400">平均TPS</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-indigo-400">
                                                    {result?.metrics?.requestsPerSecond || metrics?.requestsPerSecond || 0}
                                                </div>
                                                <div className="text-xs text-gray-400">请求/秒</div>
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

                                {/* 测试配置信息 */}
                                <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <Users className="w-5 h-5 mr-2 text-cyan-400" />
                                        测试配置
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-cyan-400">{testConfig.users}</div>
                                            <div className="text-xs text-gray-400">并发用户数</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-cyan-400">{testConfig.duration}s</div>
                                            <div className="text-xs text-gray-400">测试时长</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-cyan-400">{testConfig.rampUp}s</div>
                                            <div className="text-xs text-gray-400">加压时间</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-cyan-400">
                                                {testConfig.testType === 'gradual' ? '梯度加压' :
                                                    testConfig.testType === 'spike' ? '峰值测试' :
                                                        testConfig.testType === 'constant' ? '恒定负载' : '压力极限'}
                                            </div>
                                            <div className="text-xs text-gray-400">测试类型</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 性能评估 */}
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                                        性能评估
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="text-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                            <div className="text-2xl font-bold text-green-400">
                                                {(() => {
                                                    const successRate = result?.metrics?.totalRequests ?
                                                        ((result.metrics.successfulRequests / result.metrics.totalRequests) * 100) :
                                                        metrics?.totalRequests ?
                                                            ((metrics.successfulRequests / metrics.totalRequests) * 100) : 0;
                                                    return successRate.toFixed(1);
                                                })()}%
                                            </div>
                                            <div className="text-sm text-green-300">成功率</div>
                                        </div>
                                        <div className="text-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-400">
                                                {(() => {
                                                    const avgResponseTime = result?.metrics?.averageResponseTime || metrics?.averageResponseTime || 0;
                                                    if (avgResponseTime < 200) return 'A+';
                                                    if (avgResponseTime < 500) return 'A';
                                                    if (avgResponseTime < 1000) return 'B';
                                                    if (avgResponseTime < 2000) return 'C';
                                                    return 'D';
                                                })()}
                                            </div>
                                            <div className="text-sm text-blue-300">响应时间等级</div>
                                        </div>
                                        <div className="text-center p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                            <div className="text-2xl font-bold text-purple-400">
                                                {(() => {
                                                    const tps = result?.metrics?.currentTPS || metrics?.currentTPS || 0;
                                                    if (tps > 100) return '优秀';
                                                    if (tps > 50) return '良好';
                                                    if (tps > 20) return '一般';
                                                    return '较差';
                                                })()}
                                            </div>
                                            <div className="text-sm text-purple-300">吞吐量评级</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 数据调试信息 */}
                        {isRunning && (
                            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">数据调试信息</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-400">realTimeData:</span>
                                        <span className="text-green-400 ml-2">{realTimeData.length} 条</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">testData:</span>
                                        <span className="text-blue-400 ml-2">{testData.length} 条</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">metrics:</span>
                                        <span className="text-yellow-400 ml-2">{metrics ? '有数据' : '无数据'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">backgroundTestInfo:</span>
                                        <span className="text-purple-400 ml-2">{backgroundTestInfo ? '有数据' : '无数据'}</span>
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
                                <UnifiedStressTestCharts
                                    testStatus={testStatus}
                                    testData={unifiedTestData}
                                    testConfig={testConfig}
                                    height={500}
                                    onExportData={handleExportData}
                                    onSaveAsBaseline={handleSaveAsBaseline}
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
                                            realTimeDataLength: realTimeData.length,
                                            testDataLength: testData.length,
                                            testStatus,
                                            realTimeDataSample: realTimeData.slice(0, 2),
                                            testDataSample: testData.slice(0, 2)
                                        });
                                        return null;
                                    })()}
                                    {realTimeData && realTimeData.length > 0 ? (
                                        <div>
                                            <div className="mb-2 text-sm text-gray-400">
                                                实时数据图表 (数据点: {realTimeData.length})
                                            </div>
                                            <RealTimeStressChart
                                                data={realTimeData}
                                                isRunning={isRunning}
                                                testConfig={testConfig}
                                                height={400}
                                            />
                                        </div>
                                    ) : testData && testData.length > 0 ? (
                                        /* 显示测试完成后的数据 */
                                        <div className="bg-white rounded-lg border border-gray-200 h-96">
                                            <div className="p-4 h-full">
                                                <h4 className="text-lg font-semibold text-gray-800 mb-4">传统压力测试图表</h4>
                                                <AdvancedStressTestChart
                                                    data={testData.map((point: any) => ({
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
                                                />
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

                                {/* 高级测试图表 */}
                                {(testData.length > 0 || result) && (
                                    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">性能趋势图表</h3>
                                        <AdvancedStressTestChart
                                            data={testData.map((point: any) => ({
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
                                            showAdvancedMetrics={true}
                                            height={350}
                                            theme="dark"
                                            interactive={true}
                                            realTime={testStatus === 'running'}
                                        />
                                    </div>
                                )}

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
                ) : null}

            {LoginPromptComponent}

            {/* 取消测试确认对话框 */}
            <CancelTestConfirmDialog
                isOpen={showCancelDialog}
                onCancel={handleCancelDialogClose}
                onConfirm={handleCancelConfirm}
                testProgress={isRunning ? {
                    duration: Math.floor((Date.now() - (result?.startTime ? new Date(result.startTime).getTime() : Date.now())) / 1000),
                    completedRequests: realTimeData.length,
                    totalRequests: testConfig.users * testConfig.duration,
                    currentUsers: testConfig.users,
                    phase: testProgress || '运行中'
                } : undefined}
                isLoading={cancelInProgress}
            />

            {/* 取消进度反馈 */}
            <CancelProgressFeedback
                isVisible={showCancelProgress}
                onComplete={handleCancelProgressComplete}
                testId={currentTestId || undefined}
            />
        </TestPageLayout >
    );
};

export default StressTest;
