#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于创建数据库表和初始数据
 */

const databaseService = require('../services/DatabaseService');
const { models } = require('../database/sequelize');

async function initDatabase() {
  console.log('🚀 开始初始化数据库...');

  try {
    // 初始化数据库连接
    await databaseService.initialize();

    // 创建默认配置模板
    await createDefaultConfigTemplates();

    // 创建默认用户（如果不存在）
    await createDefaultUser();

    console.log('✅ 数据库初始化完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

async function createDefaultConfigTemplates() {
  console.log('📋 创建默认配置模板...');

  const defaultTemplates = [
    {
      name: 'API基础测试',
      test_type: 'api',
      config: {
        timeout: 10000,
        retries: 3,
        followRedirects: true,
        validateSSL: true,
        headers: {
          'User-Agent': 'Test-Web-API-Tester/1.0'
        }
      },
      description: '基础的API测试配置，适用于大多数REST API测试',
      is_default: true,
      is_public: true
    },
    {
      name: '安全标准测试',
      test_type: 'security',
      config: {
        checkSSL: true,
        checkHeaders: true,
        checkCookies: true,
        checkVulnerabilities: false,
        depth: 'standard'
      },
      description: '标准的安全测试配置，检查SSL、HTTP头和Cookie安全',
      is_default: true,
      is_public: true
    },
    {
      name: '压力基础测试',
      test_type: 'stress',
      config: {
        concurrency: 10,
        duration: 60,
        rampUp: 10,
        timeout: 30000
      },
      description: '基础的压力测试配置，适用于小规模负载测试',
      is_default: true,
      is_public: true
    },
    {
      name: 'SEO标准检查',
      test_type: 'seo',
      config: {
        checkMetaTags: true,
        checkHeadings: true,
        checkImages: true,
        checkLinks: true,
        checkMobile: true
      },
      description: '标准的SEO检查配置，覆盖基本的SEO要素',
      is_default: true,
      is_public: true
    },
    {
      name: '兼容性基础测试',
      test_type: 'compatibility',
      config: {
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
        devices: ['desktop', 'tablet', 'mobile'],
        checkCSS: true,
        checkJS: true
      },
      description: '基础的兼容性测试配置，检查主流浏览器和设备',
      is_default: true,
      is_public: true
    },
    {
      name: 'UX标准评估',
      test_type: 'ux',
      config: {
        checkAccessibility: true,
        checkUsability: true,
        checkPerformance: true,
        checkMobile: true
      },
      description: '标准的用户体验评估配置，包含可访问性和可用性检查',
      is_default: true,
      is_public: true
    },
    {
      name: '网站综合检查',
      test_type: 'website',
      config: {
        checkAvailability: true,
        checkContent: true,
        checkTechnical: true,
        checkUX: true,
        depth: 'standard'
      },
      description: '综合的网站检查配置，全面评估网站质量',
      is_default: true,
      is_public: true
    },
    {
      name: '基础设施标准检查',
      test_type: 'infrastructure',
      config: {
        checkServer: true,
        checkNetwork: true,
        checkDNS: true,
        checkCDN: false,
        depth: 'basic'
      },
      description: '基础的基础设施检查配置，检查服务器和网络状态',
      is_default: true,
      is_public: true
    }
  ];

  for (const template of defaultTemplates) {
    try {
      // 检查是否已存在
      const existing = await models.ConfigTemplate.findOne({
        where: {
          name: template.name,
          test_type: template.test_type
        }
      });

      if (!existing) {
        await models.ConfigTemplate.create(template);
        console.log(`  ✅ 创建配置模板: ${template.name}`);
      } else {
        console.log(`  ⏭️ 配置模板已存在: ${template.name}`);
      }
    } catch (error) {
      console.error(`  ❌ 创建配置模板失败 (${template.name}):`, error.message);
    }
  }
}

async function createDefaultUser() {
  console.log('👤 创建默认用户...');

  try {
    // 检查是否已有管理员用户
    const adminUser = await models.User.findOne({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      const bcrypt = require('bcrypt');
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      await models.User.create({
        username: 'admin',
        email: 'admin@testweb.local',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
        settings: {
          theme: 'light',
          language: 'zh-CN',
          notifications: true
        }
      });

      console.log('  ✅ 创建默认管理员用户');
      console.log('  📧 用户名: admin');
      console.log('  🔑 密码:', defaultPassword);
      console.log('  ⚠️  请在生产环境中修改默认密码！');
    } else {
      console.log('  ⏭️ 管理员用户已存在');
    }
  } catch (error) {
    console.error('  ❌ 创建默认用户失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

module.exports = {
  initDatabase,
  createDefaultConfigTemplates,
  createDefaultUser
};
