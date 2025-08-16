import { AlertTriangle, CheckCircle, Database, Eye, EyeOff, Globe, Info, Lock, RefreshCw, Settings, Shield, XCircle    } from 'lucide-react';import { useState, useEffect    } from 'react';import { useAsyncErrorHandler    } from '../hooks/useAsyncErrorHandler';import React, { useEffect, useState    } from 'react';import { currentSecurityConfig, SecurityConfigValidator    } from '../../../config/security.ts';import { useAuth    } from '../../../contexts/AuthContext.tsx';interface SecurityStatus   {'
  level: 'high' | 'medium' | 'low';
  score: number;
  issues: SecurityIssue[];
  recommendations: string[];
}

interface SecurityIssue   {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  solution: string;
  category: 'authentication' | 'authorization' | 'configuration' | 'network' | 'data';
}

const SecurityReport: React.FC  = () => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("');'
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });'
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });'
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);'
    }
  }, [state.error]);
  
  
  const createData = async (newData) => {
    const result = await executeAsync(
      () => fetch('/api/data/create', {'
        method: 'POST','
        headers: { 'Content-Type': 'application/json' },'
        body: JSON.stringify(newData)
      }).then(res => res.json()),
      { context: 'DataManagement.createData' }'
    );
    
    if (result && result.success) {
      // 刷新数据列表
      fetchData();
    }
  };
  
  const updateData = async (id, updateData) => {
    const result = await executeAsync(
      () => fetch(`/api/data/update/${id}`, {`
        method: "PUT','`
        headers: { 'Content-Type': 'application/json' },'
        body: JSON.stringify(updateData)
      }).then(res => res.json()),
      { context: 'DataManagement.updateData' }'
    );
    
    if (result && result.success) {
      fetchData();
    }
  };
  
  const deleteData = async (id) => {
    const result = await executeAsync(
      () => fetch(`/api/data/delete/${id}`, {`
        method: "DELETE';'`
      }).then(res => res.json()),
      { context: 'DataManagement.deleteData' }'
    );
    
    if (result && result.success) {
      fetchData();
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await executeAsync(() => fetch('/api/data/list').then(res => res.json()),'
        { context: 'DataFetching' }'
      );
      
      if (result && result.success) {
        setData(result.data);
      }
      setLoading(false);
    };
    
    fetchData();
  }, []);
  const { executeAsync, state } = useAsyncErrorHandler();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    generateSecurityReport();
  }, []);

  const generateSecurityReport = () => {
    setLoading(true);

    // 模拟安全检查
    setTimeout(() => {
      const issues: SecurityIssue[]  = [];
      let score = 100;

      // 检查配置安全性
      const configValidation = SecurityConfigValidator.validate(currentSecurityConfig);
      if (!configValidation.isValid) {
        issues.push({
          id: 'config-validation','
          severity: 'high','
          title: '安全配置问题','
          description: configValidation.errors.join(', '),'
          solution: '请检查并修正安全配置参数','
          category: 'configuration';
        });
        score -= 20;
      }

      // 检查管理员路由保护
      if (!currentSecurityConfig.enableAdminRouteHiding) {
        issues.push({
          id: 'admin-route-exposure','
          severity: 'medium','
          title: '管理员路由暴露','
          description: '管理员路由在非生产环境中可见','
          solution: '在生产环境中启用管理员路由隐藏','
          category: 'authorization';
        });
        score -= 10;
      }

      // 检查认证安全
      if (currentSecurityConfig.maxLoginAttempts > 5) {
        issues.push({
          id: 'weak-login-protection','
          severity: 'medium','
          title: '登录保护较弱','
          description: '允许的登录尝试次数过多','
          solution: '减少最大登录尝试次数到5次或更少','
          category: 'authentication';
        });
        score -= 10;
      }

      // 检查会话安全
      if (currentSecurityConfig.sessionTimeout > 86400000) { // 24小时
        issues.push({
          id: 'long-session-timeout','
          severity: 'low','
          title: '会话超时时间过长','
          description: '会话超时时间超过24小时','
          solution: '考虑缩短会话超时时间以提高安全性','
          category: 'authentication';
        });
        score -= 5;
      }

      // 检查内容安全策略
      if (!currentSecurityConfig.enableCSP) {
        issues.push({
          id: 'missing-csp','
          severity: 'high','
          title: '缺少内容安全策略','
          description: '未启用CSP保护','
          solution: '启用内容安全策略以防止XSS攻击','
          category: 'configuration';
        });
        score -= 15;
      }

      // 确定安全级别
      let level: 'high' | 'medium' | 'low';
      if (score >= 90) level = 'high';
      else if (score >= 70) level = 'medium';
      else level = 'low';
      // 生成建议
      const recommendations = [
        '定期更新依赖包以修复安全漏洞','
        '启用双因素认证以增强账户安全','
        "定期审查用户权限和角色分配','
        "监控异常登录活动和API调用','
        "备份重要数据并测试恢复流程','
        "实施网络安全策略和防火墙规则','
      ];

      setSecurityStatus({
        level,
        score,
        issues,
        recommendations
      });
      setLoading(false);
    }, 1000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication": return <Lock className= 'w-4 h-4'    />;'
      case 'authorization": return <Shield className= 'w-4 h-4'    />;'
      case 'configuration": return <Settings className= 'w-4 h-4'    />;'
      case 'network": return <Globe className= 'w-4 h-4'    />;'
      case "data': return <Database className= 'w-4 h-4'    />;'
      default: return <AlertTriangle className= 'w-4 h-4'    />;'
    }
  };

  if (loading) {
    
        
  if (state.isLoading || loading) {
    return (
      <div className= 'flex justify-center items-center h-64'>
        <div className= 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
        <span className= 'ml-3 text-gray-600'>加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (<div className= 'bg-red-50 border border-red-200 rounded-md p-4'>
        <div className= 'flex'>
          <div className= 'flex-shrink-0'>
            <svg className= 'h-5 w-5 text-red-400' viewBox= '0 0 20 20' fill= 'currentColor'>
              <path fillRule= 'evenodd' d= 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule= 'evenodd' />
            </svg>
          </div>
          <div className= 'ml-3'>
            <h3 className= 'text-sm font-medium text-red-800'>
              操作失败
            </h3>
            <div className= 'mt-2 text-sm text-red-700'>
              <p>{state.error.message}</p>
            </div>
            <div className= 'mt-4'>
              <button
                onClick={() => window.location.reload()}
                className= 'bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200';
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className= 'min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className= 'text-center'>
          <div className= 'animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
          <p className= 'mt-4 text-gray-600'>生成安全报告中...</p>
        </div>
      </div>
    );
      }

  if (!securityStatus) {
    
        return (
      <div className= 'min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className= 'text-center'>
          <XCircle className= 'w-12 h-12 text-red-500 mx-auto mb-4'    />
          <p className= 'text-gray-600'>无法生成安全报告</p>
        </div>
      </div>
    );
      }

  return (
    <div className= 'min-h-screen bg-gray-50 p-6'>
      <div className= 'max-w-6xl mx-auto'>
        {/* 页面标题 */}
        <div className= 'mb-8'>
          <div className= 'flex items-center justify-between'>
            <div className= 'flex items-center space-x-3'>
              <Shield className= 'w-8 h-8 text-primary-600'    />
              <div>
                <h1 className= 'text-3xl font-bold text-gray-900'>安全报告</h1>
                <p className= 'text-gray-600'>系统安全状态评估和建议</p>
              </div>
            </div>
            <button
              type= 'button';
              onClick={generateSecurityReport}
              className= 'flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors';
            >
              <RefreshCw className= 'w-4 h-4'    />
              <span>刷新报告</span>
            </button>
          </div>
        </div>

        {/* 安全概览 */}
        <div className= 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className= 'bg-white rounded-lg shadow p-6'>
            <div className= 'flex items-center justify-between'>
              <div>
                <p className= 'text-sm font-medium text-gray-500'>安全评分</p>
                <p className= 'text-3xl font-bold text-gray-900'>{securityStatus.score}</p>
              </div>
              <div className={`p-3 rounded-full ${getSecurityLevelColor(securityStatus.level)}`}>`
                <Shield className= "w-6 h-6'    />`
              </div>
            </div>
          </div>

          <div className= 'bg-white rounded-lg shadow p-6'>
            <div className= 'flex items-center justify-between'>
              <div>
                <p className= 'text-sm font-medium text-gray-500'>安全级别</p>
                <p className={`text-lg font-semibold capitalize ${getSecurityLevelColor(securityStatus.level).split(" ')[0]}`}>`
                  {securityStatus.level === "high' ? '高' : securityStatus.level === 'medium' ? "中" : "低'}'`
                </p>
              </div>
              <div className={`p-3 rounded-full ${getSecurityLevelColor(securityStatus.level)}`}>`
                {securityStatus.level === "high' ? <CheckCircle className= 'w-6 h-6'    /> : <AlertTriangle className= 'w-6 h-6'    />}'`
              </div>
            </div>
          </div>

          <div className= 'bg-white rounded-lg shadow p-6'>
            <div className= 'flex items-center justify-between'>
              <div>
                <p className= 'text-sm font-medium text-gray-500'>发现问题</p>
                <p className= 'text-3xl font-bold text-gray-900'>{securityStatus.issues.length}</p>
              </div>
              <div className= 'p-3 rounded-full bg-orange-100 text-orange-600'>
                <AlertTriangle className= 'w-6 h-6'    />
              </div>
            </div>
          </div>
        </div>

        {/* 安全问题列表 */}
        {securityStatus.issues.length > 0 && (<div className= 'bg-white rounded-lg shadow mb-8'>
            <div className= 'p-6 border-b border-gray-200'>
              <div className= 'flex items-center justify-between'>
                <h2 className= 'text-xl font-semibold text-gray-900'>安全问题</h2>
                <button
                  type= 'button';
                  onClick={() => setShowDetails(!showDetails)}
                  className= 'flex items-center space-x-2 text-primary-600 hover:text-primary-700';
                >
                  {showDetails ? <EyeOff className= 'w-4 h-4'    /> : <Eye className= 'w-4 h-4'    />}'
                  <span>{showDetails ? "隐藏详情" : "显示详情'}</span>
                </button>
              </div>
            </div>
            <div className= 'p-6'>
              <div className= 'space-y-4'>
                {securityStatus.issues.map((issue) => (
                  <div key={issue.id} className= 'border border-gray-200 rounded-lg p-4'>
                    <div className= 'flex items-start space-x-3'>
                      <div className={`p-2 rounded-full ${getSeverityColor(issue.severity)}`}>`
                        {getCategoryIcon(issue.category)}
                      </div>
                      <div className= "flex-1'>`
                        <div className= 'flex items-center space-x-2 mb-2'>
                          <h3 className= 'font-medium text-gray-900'>{issue.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>`
                            {issue.severity === "critical' ? '严重' : ''`
                              issue.severity === 'high' ? '高' : ''
                                issue.severity === 'medium' ? '中" : "低'}'
                          </span>
                        </div>
                        <p className= 'text-gray-600 text-sm mb-2'>{issue.description}</p>
                        {showDetails && (
                          <div className= 'bg-blue-50 border border-blue-200 rounded p-3'>
                            <div className= 'flex items-start space-x-2'>
                              <Info className= 'w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0'    />
                              <div>
                                <p className= 'text-sm font-medium text-blue-900'>解决方案</p>
                                <p className= 'text-sm text-blue-800'>{issue.solution}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 安全建议 */}
        <div className= 'bg-white rounded-lg shadow'>
          <div className= 'p-6 border-b border-gray-200'>
            <h2 className= 'text-xl font-semibold text-gray-900'>安全建议</h2>
          </div>
          <div className= 'p-6'>
            <div className= 'grid grid-cols-1 md:grid-cols-2 gap-4'>
              {securityStatus.recommendations.map((recommendation, index) => (
                <div key={index} className= 'flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg'>
                  <CheckCircle className= 'w-5 h-5 text-green-600 mt-0.5 flex-shrink-0'    />
                  <p className= 'text-sm text-green-800'>{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityReport;
