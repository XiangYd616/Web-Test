import {Activity, Globe, Shield, Zap, Monitor, Network, BarChart3, ArrowRight, CheckCircle, TrendingUp, Clock, Users} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';



const HomePage = () => {
  const navigate = useNavigate();

  const testCategories = [
    {
      title: '性能测试（增强版）',
      description: '使用Lighthouse进行全面的性能分析，包括Core Web Vitals指标',
      icon: Zap,
      href: '/EnhancedPerformanceTest',
      color: 'from-green-500 to-emerald-600',
      features: ['Core Web Vitals分析', 'Lighthouse集成', '性能评分', '优化建议'],
      badge: '新功能'
    },
    {
      title: 'SEO测试',
      description: '深度SEO分析，优化搜索引擎排名',
      icon: Globe,
      href: '/SEOTest',
      color: 'from-blue-500 to-indigo-600',
      features: ['关键词分析', '元标签检查', '站点地图验证', '结构化数据']
    },
    {
      title: '安全测试',
      description: '全面的安全漏洞扫描和风险评估',
      icon: Shield,
      href: '/SecurityTest',
      color: 'from-red-500 to-rose-600',
      features: ['漏洞扫描', 'SSL检查', 'CSP验证', '安全头检测']
    },
    {
      title: '兼容性测试',
      description: '跨浏览器和设备的兼容性检测',
      icon: Monitor,
      href: '/CompatibilityTest',
      color: 'from-purple-500 to-violet-600',
      features: ['浏览器兼容', '响应式设计', '移动端适配', 'PWA支持']
    },
    {
      title: 'API测试',
      description: '接口功能、性能和安全性测试',
      icon: Network,
      href: '/APITest',
      color: 'from-orange-500 to-amber-600',
      features: ['接口调试', '批量测试', '性能监控', '文档生成']
    },
    {
      title: '压力测试',
      description: '模拟高并发场景，测试系统承载能力',
      icon: BarChart3,
      href: '/UnifiedStressTest',
      color: 'from-cyan-500 to-teal-600',
      features: ['并发测试', '负载测试', '实时监控', '性能报告']
    }
  ];

  const stats = [
    { label: '测试执行', value: '10K+', icon: Activity },
    { label: '活跃用户', value: '500+', icon: Users },
    { label: '平均响应时间', value: '1.2s', icon: Clock },
    { label: '性能提升', value: '45%', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              网站测试平台
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              全方位的网站性能、安全性和用户体验测试解决方案，
              帮助您构建更快、更安全、更可靠的Web应用
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/EnhancedPerformanceTest"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                开始测试
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/Help"
                className="inline-flex items-center px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                查看文档
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            全面的测试能力
          </h2>
          <p className="text-lg text-gray-600">
            选择适合您需求的测试类型，获得专业的分析报告
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testCategories.map((category, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
              onClick={() => navigate(category.href)}
            >
              {/* Card Header */}
              <div className={`h-2 bg-gradient-to-r ${category.color}`}></div>
              
              {/* Card Body */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${category.color} bg-opacity-10`}>
                    <category.icon className="h-6 w-6 text-gray-700" />
                  </div>
                  {category.badge && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      {category.badge}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {category.description}
                </p>
                
                {/* Features */}
                <div className="space-y-2 mb-4">
                  {category.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                {/* Action */}
                <Link
                  to={category.href}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm group-hover:translate-x-1 transition-transform"
                >
                  开始测试
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16 mt-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好提升您的网站性能了吗？
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            立即开始使用我们的增强版性能测试工具，获得详细的Core Web Vitals分析
          </p>
          <Link to="/EnhancedPerformanceTest"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            立即体验增强版性能测试
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
