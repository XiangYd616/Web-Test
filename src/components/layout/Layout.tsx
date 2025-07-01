import {
  Award,
  Github,
  Heart,
  Mail,
  MapPin,
  Phone,
  Shield,
  Twitter,
  Users,
  Zap
} from 'lucide-react';
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ModernNavigation } from '../modern';

interface LayoutProps {
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ showFooter = true }) => {
  const footerLinks = {
    product: [
      { name: '性能测试', href: '/stress-test' },
      { name: 'SEO分析', href: '/content-test' },
      { name: '安全检测', href: '/security-test' },
      { name: '兼容性测试', href: '/compatibility-test' },
      { name: 'API测试', href: '/api-test' },
      { name: '实时监控', href: '/monitoring' }
    ],
    company: [
      { name: '关于我们', href: '/about' },
      { name: '联系我们', href: '/contact' },
      { name: '博客', href: '/blog' },
      { name: '职业机会', href: '/careers' },
      { name: '新闻中心', href: '/news' }
    ],
    support: [
      { name: '帮助中心', href: '/help' },
      { name: '文档', href: '/docs' },
      { name: 'API文档', href: '/api-docs' },
      { name: '状态页面', href: '/status' },
      { name: '社区论坛', href: '/community' }
    ],
    legal: [
      { name: '隐私政策', href: '/privacy' },
      { name: '服务条款', href: '/terms' },
      { name: '使用协议', href: '/agreement' },
      { name: 'Cookie政策', href: '/cookies' }
    ]
  };

  const features = [
    {
      icon: Zap,
      title: '高性能',
      description: '毫秒级响应速度'
    },
    {
      icon: Shield,
      title: '安全可靠',
      description: '企业级安全保障'
    },
    {
      icon: Award,
      title: '专业认证',
      description: '行业标准认证'
    },
    {
      icon: Users,
      title: '团队协作',
      description: '多人协作支持'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <ModernNavigation />

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="bg-gray-900 text-white">
          {/* Features Section */}
          <div className="border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <div key={index} className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Company Info */}
              <div className="lg:col-span-1">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">TestWeb</span>
                </div>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  专业的网站测试平台，为开发者和企业提供全方位的网站性能、安全性和用户体验测试服务。
                </p>
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="访问我们的GitHub"
                    title="GitHub"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="关注我们的Twitter"
                    title="Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="发送邮件联系我们"
                    title="邮箱联系"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Product Links */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">产品</h3>
                <ul className="space-y-3">
                  {footerLinks.product.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Links */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">公司</h3>
                <ul className="space-y-3">
                  {footerLinks.company.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Links */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">支持</h3>
                <ul className="space-y-3">
                  {footerLinks.support.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Links */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">法律</h3>
                <ul className="space-y-3">
                  {footerLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">邮箱</p>
                    <p className="text-sm text-gray-400">xyd91964208@gamil.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">电话</p>
                    <p className="text-sm text-gray-400">xxx-xxx-xxxx</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">地址</p>
                    <p className="text-sm text-gray-400">四川省</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span>© 2025 TestWeb. 保留所有权利.</span>
                  <span>|</span>
                  <span className="flex items-center space-x-1">
                    <span>Made with</span>
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>in China</span>
                  </span>
                </div>
                <div className="flex items-center space-x-6 mt-4 md:mt-0">
                  <span className="text-sm text-gray-400">
                    服务状态: <span className="text-green-400">正常运行</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-400">实时监控中</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
