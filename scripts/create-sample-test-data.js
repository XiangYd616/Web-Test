#!/usr/bin/env node

/**
 * 创建示例测试数据脚本
 * 用于在测试历史页面显示一些示例记录
 */

const { query } = require('../server/config/database');

async function createSampleTestData() {
  console.log('🚀 开始创建示例测试数据...');

  try {
    // 示例测试记录数据
    const sampleTests = [
      {
        testName: '压力测试 - httpbin.org',
        testType: 'stress',
        url: 'https://httpbin.org/delay/1',
        status: 'completed',
        startTime: new Date(Date.now() - 3600000).toISOString(), // 1小时前
        endTime: new Date(Date.now() - 3300000).toISOString(),   // 55分钟前
        duration: 300, // 5分钟
        config: {
          users: 10,
          duration: 30,
          rampUpTime: 5,
          testType: 'gradual'
        },
        results: {
          metrics: {
            totalRequests: 1500,
            successfulRequests: 1485,
            failedRequests: 15,
            averageResponseTime: 1200,
            minResponseTime: 800,
            maxResponseTime: 2500,
            throughput: 50.5
          }
        },
        overallScore: 85
      },
      {
        testName: '压力测试 - 本地服务器',
        testType: 'stress',
        url: 'http://localhost:3001/health',
        status: 'completed',
        startTime: new Date(Date.now() - 7200000).toISOString(), // 2小时前
        endTime: new Date(Date.now() - 6900000).toISOString(),   // 1小时55分钟前
        duration: 300,
        config: {
          users: 20,
          duration: 60,
          rampUpTime: 10,
          testType: 'spike'
        },
        results: {
          metrics: {
            totalRequests: 3000,
            successfulRequests: 2950,
            failedRequests: 50,
            averageResponseTime: 150,
            minResponseTime: 50,
            maxResponseTime: 800,
            throughput: 98.3
          }
        },
        overallScore: 92
      },
      {
        testName: '压力测试 - API端点',
        testType: 'stress',
        url: 'https://jsonplaceholder.typicode.com/posts',
        status: 'running',
        startTime: new Date(Date.now() - 600000).toISOString(), // 10分钟前
        duration: null,
        config: {
          users: 15,
          duration: 45,
          rampUpTime: 8,
          testType: 'gradual'
        },
        results: null,
        overallScore: null
      },
      {
        testName: '压力测试 - 外部API',
        testType: 'stress',
        url: 'https://api.github.com',
        status: 'failed',
        startTime: new Date(Date.now() - 1800000).toISOString(), // 30分钟前
        endTime: new Date(Date.now() - 1740000).toISOString(),   // 29分钟前
        duration: 60,
        config: {
          users: 50,
          duration: 120,
          rampUpTime: 20,
          testType: 'constant'
        },
        results: {
          metrics: {
            totalRequests: 500,
            successfulRequests: 200,
            failedRequests: 300,
            averageResponseTime: 5000,
            minResponseTime: 1000,
            maxResponseTime: 10000,
            throughput: 8.3
          }
        },
        overallScore: 35
      },
      {
        testName: 'SEO测试 - 示例网站',
        testType: 'seo',
        url: 'https://example.com',
        status: 'completed',
        startTime: new Date(Date.now() - 5400000).toISOString(), // 1.5小时前
        endTime: new Date(Date.now() - 5100000).toISOString(),   // 1小时25分钟前
        duration: 300,
        config: {
          checkMeta: true,
          checkImages: true,
          checkLinks: true
        },
        results: {
          score: 78,
          issues: ['缺少meta描述', '部分图片缺少alt属性'],
          recommendations: ['添加meta描述', '为所有图片添加alt属性']
        },
        overallScore: 78
      },
      {
        testName: '安全测试 - Web应用',
        testType: 'security',
        url: 'https://httpbin.org',
        status: 'completed',
        startTime: new Date(Date.now() - 9000000).toISOString(), // 2.5小时前
        endTime: new Date(Date.now() - 8700000).toISOString(),   // 2小时25分钟前
        duration: 300,
        config: {
          checkHeaders: true,
          checkSSL: true,
          checkVulnerabilities: true
        },
        results: {
          securityScore: 88,
          vulnerabilities: [],
          recommendations: ['启用HSTS', '添加CSP头']
        },
        overallScore: 88
      }
    ];

    // 插入示例数据
    for (const test of sampleTests) {
      const result = await query(`
        INSERT INTO test_history 
        (test_name, test_type, url, status, start_time, end_time, duration, config, results, overall_score, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `, [
        test.testName,
        test.testType,
        test.url,
        test.status,
        test.startTime,
        test.endTime,
        test.duration,
        JSON.stringify(test.config),
        test.results ? JSON.stringify(test.results) : null,
        test.overallScore
      ]);

      console.log(`✅ 创建测试记录: ${test.testName} (ID: ${result.rows[0].id})`);
    }

    console.log(`🎉 成功创建 ${sampleTests.length} 条示例测试记录！`);

    // 显示统计信息
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN test_type = 'stress' THEN 1 END) as stress,
        COUNT(CASE WHEN test_type = 'seo' THEN 1 END) as seo,
        COUNT(CASE WHEN test_type = 'security' THEN 1 END) as security
      FROM test_history
    `);

    const stats = statsResult.rows[0];
    console.log('\n📊 数据库统计信息:');
    console.log(`  总记录数: ${stats.total}`);
    console.log(`  已完成: ${stats.completed}`);
    console.log(`  运行中: ${stats.running}`);
    console.log(`  失败: ${stats.failed}`);
    console.log(`  压力测试: ${stats.stress}`);
    console.log(`  SEO测试: ${stats.seo}`);
    console.log(`  安全测试: ${stats.security}`);

  } catch (error) {
    console.error('❌ 创建示例数据失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    await createSampleTestData();
    console.log('\n✅ 示例数据创建完成！现在可以在测试历史页面查看记录了。');
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createSampleTestData };
