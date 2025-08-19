import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Play, Square } from 'lucide-react';

interface SecurityTestConfig {
  url: string;
  checkSSL: boolean;
  checkHeaders: boolean;
  checkVulnerabilities: boolean;
  checkPorts: boolean;
  checkCookies: boolean;
  checkCSP: boolean;
  scanDepth: 'basic' | 'standard' | 'deep';
}

interface SecurityTestResult {
  overallScore: number;
  ssl: { valid: boolean; grade: string; expires: string };
  headers: { score: number; missing: string[]; present: string[] };
  vulnerabilities: { critical: number; high: number; medium: number; low: number };
  ports: { open: number[]; closed: number[]; filtered: number[] };
  cookies: { secure: number; total: number; httpOnly: number };
  csp: { present: boolean; score: number };
}

const SecurityTest: React.FC = () => {
  const [config, setConfig] = useState<SecurityTestConfig>({
    url: '',
    checkSSL: true,
    checkHeaders: true,
    checkVulnerabilities: true,
    checkPorts: false,
    checkCookies: true,
    checkCSP: true,
    scanDepth: 'standard',
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SecurityTestResult | null>(null);

  const handleStartTest = () => {
    if (!config.url) return;
    
    setIsRunning(true);
    // 模拟测试过程
    setTimeout(() => {
      setResults({
        overallScore: 78,
        ssl: { valid: true, grade: 'A', expires: '2024-12-31' },
        headers: { 
          score: 85, 
          missing: ['X-Frame-Options', 'X-Content-Type-Options'], 
          present: ['Strict-Transport-Security', 'X-XSS-Protection'] 
        },
        vulnerabilities: { critical: 0, high: 1, medium: 3, low: 5 },
        ports: { open: [80, 443], closed: [21, 22, 23], filtered: [8080] },
        cookies: { secure: 3, total: 5, httpOnly: 4 },
        csp: { present: true, score: 72 }
      });
      setIsRunning(false);
    }, 5000);
  };

  const handleStopTest = () => {
    setIsRunning(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="security-test-container">
      <div className="page-header mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-400" />
          安全测试
        </h2>
        <p className="text-gray-400 mt-2">
          全面检测网站安全漏洞，评估安全防护水平
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 测试配置 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  目标URL *
                </label>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  扫描深度
                </label>
                <select
                  value={config.scanDepth}
                  onChange={(e) => setConfig({ ...config, scanDepth: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="basic">基础扫描</option>
                  <option value="standard">标准扫描</option>
                  <option value="deep">深度扫描</option>
                </select>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">检查项目</h4>
                
                {[
                  { key: 'checkSSL', label: 'SSL/TLS检查' },
                  { key: 'checkHeaders', label: '安全头检查' },
                  { key: 'checkVulnerabilities', label: '漏洞扫描' },
                  { key: 'checkPorts', label: '端口扫描' },
                  { key: 'checkCookies', label: 'Cookie安全' },
                  { key: 'checkCSP', label: 'CSP策略检查' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config[key as keyof SecurityTestConfig] as boolean}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleStartTest}
                  disabled={!config.url || isRunning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  开始扫描
                </button>
                <button
                  onClick={handleStopTest}
                  disabled={!isRunning}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">安全评估结果</h3>
            
            {isRunning ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-green-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">正在进行安全扫描...</p>
                  <p className="text-sm text-gray-500 mt-2">这可能需要几分钟时间</p>
                </div>
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* 安全总分 */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">{results.overallScore}</div>
                  <div className="text-gray-400">安全评分</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                    results.overallScore >= 80 ? 'bg-green-600 text-white' :
                    results.overallScore >= 60 ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {results.overallScore >= 80 ? '安全' : results.overallScore >= 60 ? '一般' : '危险'}
                  </div>
                </div>

                {/* 详细结果 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SSL/TLS */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      SSL/TLS
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">证书状态</span>
                        {results.ssl.valid ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> :
                          <XCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">安全等级</span>
                        <span className="text-green-400 font-medium">{results.ssl.grade}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">过期时间</span>
                        <span className="text-gray-300">{results.ssl.expires}</span>
                      </div>
                    </div>
                  </div>

                  {/* 漏洞统计 */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      漏洞统计
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-red-500">严重</span>
                        <span className="text-red-500 font-medium">{results.vulnerabilities.critical}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-500">高危</span>
                        <span className="text-orange-500 font-medium">{results.vulnerabilities.high}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-500">中危</span>
                        <span className="text-yellow-500 font-medium">{results.vulnerabilities.medium}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-500">低危</span>
                        <span className="text-blue-500 font-medium">{results.vulnerabilities.low}</span>
                      </div>
                    </div>
                  </div>

                  {/* 安全头 */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">安全头检查</h4>
                    <div className="text-sm">
                      <div className="mb-2">
                        <span className="text-gray-300">评分: </span>
                        <span className="text-white font-medium">{results.headers.score}/100</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-green-400">
                          已配置: {results.headers.present.length}
                        </div>
                        <div className="text-red-400">
                          缺失: {results.headers.missing.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cookie安全 */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Cookie安全</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>总Cookie数: {results.cookies.total}</div>
                      <div>安全Cookie: {results.cookies.secure}</div>
                      <div>HttpOnly: {results.cookies.httpOnly}</div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(results.cookies.secure / results.cookies.total) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {Math.round((results.cookies.secure / results.cookies.total) * 100)}% 安全率
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 端口扫描结果 */}
                {config.checkPorts && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">端口扫描结果</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-green-400 font-medium mb-1">开放端口</div>
                        <div className="text-gray-300">
                          {results.ports.open.join(', ') || '无'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium mb-1">关闭端口</div>
                        <div className="text-gray-300">
                          {results.ports.closed.join(', ') || '无'}
                        </div>
                      </div>
                      <div>
                        <div className="text-yellow-400 font-medium mb-1">过滤端口</div>
                        <div className="text-gray-300">
                          {results.ports.filtered.join(', ') || '无'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请配置测试参数并开始安全扫描</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityTest;
