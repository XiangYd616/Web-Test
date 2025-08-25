import { useState } from 'react';
import type { FC } from 'react';

import { Check, X, Star, Zap, Shield, Globe, BarChart3, Users, Clock, Headphones, Crown, Sparkles, ArrowRight, CreditCard, Gift } from 'lucide-react';

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  popular?: boolean;
  description: string;
  features: PlanFeature[];
  limits: {
    tests: number;
    sites: number;
    storage: string;
    apiCalls: number;
  };
}

const Subscription: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: '免费版',
      price: 0,
      period: 'month',
      description: '适合个人开发者和小型项目',
      features: [
        { name: '基础性能测试', included: true },
        { name: 'SEO分析', included: true },
        { name: '安全检测', included: false },
        { name: '实时监控', included: false },
        { name: 'API访问', included: false },
        { name: '自定义报告', included: false },
        { name: '邮件支持', included: true },
        { name: '优先支持', included: false }
      ],
      limits: {
        tests: 100,
        sites: 3,
        storage: '1GB',
        apiCalls: 1000
      }
    },
    {
      id: 'pro',
      name: '专业版',
      price: billingPeriod === 'monthly' ? 99 : 990,
      period: billingPeriod === 'monthly' ? 'month' : 'year',
      popular: true,
      description: '适合中小企业和专业团队',
      features: [
        { name: '全部测试功能', included: true },
        { name: 'SEO深度分析', included: true },
        { name: '安全漏洞扫描', included: true },
        { name: '实时监控', included: true, limit: '10个站点' },
        { name: 'API访问', included: true },
        { name: '自定义报告', included: true },
        { name: '邮件支持', included: true },
        { name: '优先支持', included: true }
      ],
      limits: {
        tests: 5000,
        sites: 10,
        storage: '50GB',
        apiCalls: 50000
      }
    },
    {
      id: 'enterprise',
      name: '企业版',
      price: billingPeriod === 'monthly' ? 299 : 2990,
      period: billingPeriod === 'monthly' ? 'month' : 'year',
      description: '适合大型企业和高频使用场景',
      features: [
        { name: '全部测试功能', included: true },
        { name: '高级分析报告', included: true },
        { name: '企业级安全', included: true },
        { name: '无限监控站点', included: true },
        { name: '无限API访问', included: true },
        { name: '白标定制', included: true },
        { name: '专属客户经理', included: true },
        { name: '24/7电话支持', included: true }
      ],
      limits: {
        tests: -1, // 无限制
        sites: -1,
        storage: '无限制',
        apiCalls: -1
      }
    }
  ];

  const currentPlan = plans.find(p => p.id === selectedPlan) || plans[1];

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    // 这里实现升级逻辑
    console.log('升级到计划:', planId);
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return '无限制';
    if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K`;
    return limit.toString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          选择适合您的计划
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          从个人开发者到大型企业，我们为每种需求提供合适的解决方案
        </p>
      </div>

      {/* 计费周期切换 */}
      <div className="flex justify-center mb-12">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            按月付费
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
              billingPeriod === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            按年付费
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              省20%
            </span>
          </button>
        </div>
      </div>

      {/* 订阅计划 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-lg ${
              plan.popular
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>最受欢迎</span>
                </span>
              </div>
            )}

            <div className="p-8">
              {/* 计划名称和价格 */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">¥{plan.price}</span>
                  <span className="text-gray-600 ml-1">/{plan.period === 'month' ? '月' : '年'}</span>
                </div>
                {billingPeriod === 'yearly' && plan.price > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    相比月付节省 ¥{Math.round(plan.price * 12 * 0.2 / 12)}
                  </p>
                )}
              </div>

              {/* 使用限制 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">使用限制</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">测试次数</span>
                    <div className="font-medium">{formatLimit(plan.limits.tests)}/月</div>
                  </div>
                  <div>
                    <span className="text-gray-600">监控站点</span>
                    <div className="font-medium">{formatLimit(plan.limits.sites)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">存储空间</span>
                    <div className="font-medium">{plan.limits.storage}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">API调用</span>
                    <div className="font-medium">{formatLimit(plan.limits.apiCalls)}/月</div>
                  </div>
                </div>
              </div>

              {/* 功能列表 */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-400'}`}>
                      {feature.name}
                      {feature.limit && (
                        <span className="text-gray-500 ml-1">({feature.limit})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* 操作按钮 */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.id === 'free' ? '免费开始' : '选择此计划'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 企业定制 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center mb-12">
        <Crown className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-4">需要定制解决方案？</h3>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          我们为大型企业提供定制化的测试解决方案，包括私有部署、专属功能开发和专业服务支持
        </p>
        <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
          联系销售团队
        </button>
      </div>

      {/* 常见问题 */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">常见问题</h2>
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">可以随时升级或降级计划吗？</h3>
            <p className="text-gray-600">
              是的，您可以随时升级或降级您的订阅计划。升级立即生效，降级将在当前计费周期结束后生效。
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">支持哪些支付方式？</h3>
            <p className="text-gray-600">
              我们支持支付宝、微信支付、银行卡支付等多种支付方式，企业用户还可以申请发票。
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">有免费试用期吗？</h3>
            <p className="text-gray-600">
              专业版和企业版都提供14天免费试用，无需信用卡，试用期结束后可以选择继续订阅或降级到免费版。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
