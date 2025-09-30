/**
 * 鐜颁唬鍖栦华琛ㄦ澘椤甸潰
 * 鏄剧ず鐢ㄦ埛鐨勬祴璇曟瑙堛€佺粺璁℃暟鎹拰蹇€熸搷浣? */

import { Activity, BarChart3, CheckCircle, Clock, Database, Globe, Play, Users, Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserStats } from '../../hooks/useUserStats';

const Dashboard: React.FC = () => {
  const { stats, loading } = useUserStats();

  // 妯℃嫙鏈€杩戞祴璇曟暟鎹?  const recentTests = [
    { name: '缃戠粶娴嬭瘯', status: 'success', timestamp: '2鍒嗛挓鍓? },
    { name: 'API娴嬭瘯', status: 'success', timestamp: '5鍒嗛挓鍓? },
    { name: '鍘嬪姏娴嬭瘯', status: 'failed', timestamp: '10鍒嗛挓鍓? },
    { name: 'UX娴嬭瘯', status: 'success', timestamp: '15鍒嗛挓鍓? },
    { name: '鏁版嵁搴撴祴璇?, status: 'running', timestamp: '20鍒嗛挓鍓? }
  ];

  const quickActions = [
    { name: '鍘嬪姏娴嬭瘯', icon: Zap, path: '/stress-test', color: 'bg-red-500', description: '娴嬭瘯绯荤粺璐熻浇鑳藉姏' },
    { name: '缃戠粶娴嬭瘯', icon: Globe, path: '/network-test', color: 'bg-blue-500', description: '妫€娴嬬綉缁滆繛鎺ヨ川閲? },
    { name: 'API娴嬭瘯', icon: Activity, path: '/api-test', color: 'bg-green-500', description: '楠岃瘉API鎺ュ彛鍔熻兘' },
    { name: '鏁版嵁搴撴祴璇?, icon: Database, path: '/database-test', color: 'bg-purple-500', description: '娴嬭瘯鏁版嵁搴撴€ц兘' },
    { name: 'UX娴嬭瘯', icon: Users, path: '/ux-test', color: 'bg-orange-500', description: '鍒嗘瀽鐢ㄦ埛浣撻獙' },
    { name: '缃戠珯娴嬭瘯', icon: BarChart3, path: '/website-test', color: 'bg-indigo-500', description: '缁煎悎缃戠珯璇勪及' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 椤甸潰鏍囬 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">鐜颁唬鍖栦华琛ㄦ澘</h1>
          <p className="mt-2 text-gray-600">鍏ㄩ潰鐨勬祴璇曠鐞嗗拰鐩戞帶涓績</p>
        </div>

        {/* 缁熻鍗＄墖 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">鎬绘祴璇曟鏁?/p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests || 0}</p>
                <p className="text-xs text-green-600 mt-1">+12% 鏈湀</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">鎴愬姛鐜?/p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests ? Math.round((stats?.totalTests / 100) * 85) : 85}%</p>
                <p className="text-xs text-green-600 mt-1">+2.1% 涓婂懆</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">骞冲潎鍝嶅簲鏃堕棿</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests ? Math.round(stats?.totalTests * 1.2) : 120}ms</p>
                <p className="text-xs text-red-600 mt-1">+5ms 鏄ㄦ棩</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">骞冲潎璇勫垎</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.averageScore || 0}</p>
                <p className="text-xs text-green-600 mt-1">+1.2 鏈懆</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 蹇€熸搷浣?*/}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">蹇€熷紑濮嬫祴璇?/h2>
                <p className="text-sm text-gray-500 mt-1">閫夋嫨娴嬭瘯绫诲瀷寮€濮嬫偍鐨勬祴璇?/p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quickActions.map((action) => (
                    <Link
                      key={action.name}
                      to={action.path}
                      className="group relative bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-start">
                        <div className={`inline-flex p-3 rounded-lg ${action.color} text-white`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {action.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 绯荤粺鐘舵€佸拰鏈€杩戞祴璇?*/}
          <div className="space-y-6">
            {/* 绯荤粺鐘舵€?*/}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">绯荤粺鐘舵€?/h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API鏈嶅姟</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">姝ｅ父</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">鏁版嵁搴?/span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">姝ｅ父</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">娴嬭瘯寮曟搸</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm text-yellow-600">璐熻浇涓?/span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 鏈€杩戠殑娴嬭瘯 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">鏈€杩戠殑娴嬭瘯</h2>
              </div>
              <div className="p-6">
                {recentTests && recentTests.length > 0 ? (
                  <div className="space-y-4">
                    {recentTests.slice(0, 5).map((test: unknown, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${test.status === 'success' ? 'bg-green-400' :
                            test.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                            }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{test.name}</p>
                            <p className="text-xs text-gray-500">{test.timestamp}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${test.status === 'success' ? 'bg-green-100 text-green-800' :
                          test.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {test.status === 'success' ? '鎴愬姛' : test.status === 'failed' ? '澶辫触' : '杩涜涓?}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">鏆傛棤娴嬭瘯璁板綍</h3>
                    <p className="mt-1 text-sm text-gray-500">寮€濮嬫偍鐨勭涓€涓祴璇曞惂锛?/p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
