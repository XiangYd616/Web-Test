/**
 * Modern Dashboard Page
 * Displays user test overview, statistics data, and quick actions
 */

import { Activity, BarChart3, CheckCircle, Clock, Database, Globe, Play, Users, Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserStats } from '../../hooks/useUserStats';

const Dashboard: React.FC = () => {
  const { stats, loading } = useUserStats();

  // Mock recent test data
  const recentTests = [
    { name: 'Network Test', status: 'success', timestamp: '2 minutes ago' },
    { name: 'API Test', status: 'success', timestamp: '5 minutes ago' },
    { name: 'Stress Test', status: 'failed', timestamp: '10 minutes ago' },
    { name: 'UX Test', status: 'success', timestamp: '15 minutes ago' },
    { name: 'Database Test', status: 'running', timestamp: '20 minutes ago' }
  ];

  const quickActions = [
    { name: 'Stress Test', icon: Zap, path: '/stress-test', color: 'bg-red-500', description: 'Test system load capacity' },
    { name: 'Network Test', icon: Globe, path: '/network-test', color: 'bg-blue-500', description: 'Check network connection quality' },
    { name: 'API Test', icon: Activity, path: '/api-test', color: 'bg-green-500', description: 'Validate API interface functionality' },
    { name: 'Database Test', icon: Database, path: '/database-test', color: 'bg-purple-500', description: 'Test database performance' },
    { name: 'UX Test', icon: Users, path: '/ux-test', color: 'bg-orange-500', description: 'Analyze user experience' },
    { name: 'Website Test', icon: BarChart3, path: '/website-test', color: 'bg-indigo-500', description: 'Comprehensive website evaluation' }
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Modern Dashboard</h1>
          <p className="mt-2 text-gray-600">Comprehensive testing management and monitoring center</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tests</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests || 0}</p>
                <p className="text-xs text-green-600 mt-1">+12% this month</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests ? Math.round((stats?.totalTests / 100) * 85) : 85}%</p>
                <p className="text-xs text-green-600 mt-1">+2.1% last week</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests ? Math.round(stats?.totalTests * 1.2) : 120}ms</p>
                <p className="text-xs text-red-600 mt-1">+5ms yesterday</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Score</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.averageScore || 0}</p>
                <p className="text-xs text-green-600 mt-1">+1.2 this week</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Start Testing</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a test type to begin your testing</p>
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

          {/* System Status and Recent Tests */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Service</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">Normal</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">Normal</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Test Engine</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm text-yellow-600">Under Load</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Tests */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Tests</h2>
              </div>
              <div className="p-6">
                {recentTests && recentTests.length > 0 ? (
                  <div className="space-y-4">
                    {recentTests.slice(0, 5).map((test: any, index: number) => (
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
                          {test.status === 'success' ? 'Success' : test.status === 'failed' ? 'Failed' : 'Running'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent tests</p>
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
