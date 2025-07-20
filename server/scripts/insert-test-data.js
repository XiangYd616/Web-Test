/**
 * 插入测试数据的脚本
 * 用于创建一些压力测试历史记录进行测试
 */

const { query } = require('../config/database');

async function insertTestData() {
  console.log('📝 插入测试数据...\n');

  try {
    // 1. 检查是否有用户
    console.log('1. 检查用户...');
    const users = await query('SELECT id, username FROM users LIMIT 1');
    
    let userId;
    if (users.rows.length === 0) {
      console.log('⚠️ 没有找到用户，创建测试用户...');
      const newUser = await query(`
        INSERT INTO users (username, email, password_hash, role, status)
        VALUES ('testuser', 'test@example.com', 'dummy_hash', 'user', 'active')
        RETURNING id
      `);
      userId = newUser.rows[0].id;
      console.log('✅ 创建测试用户:', userId);
    } else {
      userId = users.rows[0].id;
      console.log('✅ 使用现有用户:', users.rows[0].username, userId);
    }

    // 2. 创建测试数据
    console.log('\n2. 创建压力测试记录...');
    
    const testData = [
      {
        testName: '百度首页压力测试',
        url: 'https://www.baidu.com',
        status: 'completed',
        config: {
          users: 10,
          duration: 60,
          testType: 'gradual',
          method: 'GET'
        },
        results: {
          metrics: {
            totalRequests: 600,
            successfulRequests: 595,
            failedRequests: 5,
            averageResponseTime: 120,
            throughput: 10,
            errorRate: 0.83
          }
        },
        overallScore: 85.5,
        duration: 60000
      },
      {
        testName: 'GitHub API 压力测试',
        url: 'https://api.github.com',
        status: 'completed',
        config: {
          users: 5,
          duration: 30,
          testType: 'constant',
          method: 'GET'
        },
        results: {
          metrics: {
            totalRequests: 150,
            successfulRequests: 148,
            failedRequests: 2,
            averageResponseTime: 250,
            throughput: 5,
            errorRate: 1.33
          }
        },
        overallScore: 78.2,
        duration: 30000
      },
      {
        testName: '本地服务器测试',
        url: 'http://localhost:3000',
        status: 'failed',
        config: {
          users: 20,
          duration: 120,
          testType: 'spike',
          method: 'GET'
        },
        results: null,
        overallScore: null,
        duration: null
      },
      {
        testName: 'Google 搜索压力测试',
        url: 'https://www.google.com',
        status: 'running',
        config: {
          users: 15,
          duration: 90,
          testType: 'step',
          method: 'GET'
        },
        results: null,
        overallScore: null,
        duration: null
      }
    ];

    for (let i = 0; i < testData.length; i++) {
      const test = testData[i];
      
      // 计算时间
      const now = new Date();
      const createdAt = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000); // 每个测试间隔1小时
      const startTime = new Date(createdAt.getTime() + 5 * 60 * 1000); // 开始时间晚5分钟
      const endTime = test.status === 'completed' ? 
        new Date(startTime.getTime() + (test.duration || 60000)) : null;

      console.log(`  插入测试 ${i + 1}: ${test.testName}`);
      
      const result = await query(`
        INSERT INTO test_history 
        (test_name, test_type, url, status, user_id, config, results, 
         overall_score, duration, start_time, end_time, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        test.testName,
        'stress',
        test.url,
        test.status,
        userId,
        JSON.stringify(test.config),
        test.results ? JSON.stringify(test.results) : null,
        test.overallScore,
        test.duration,
        startTime.toISOString(),
        endTime ? endTime.toISOString() : null,
        createdAt.toISOString(),
        now.toISOString()
      ]);

      console.log(`    ✅ 创建记录 ID: ${result.rows[0].id}`);
    }

    // 3. 验证插入的数据
    console.log('\n3. 验证插入的数据...');
    const insertedRecords = await query(`
      SELECT id, test_name, status, created_at, start_time
      FROM test_history 
      WHERE test_type = 'stress'
      ORDER BY created_at DESC
    `);

    console.log('📊 插入的记录:');
    insertedRecords.rows.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.test_name} (${record.status})`);
      console.log(`     ID: ${record.id}`);
      console.log(`     创建时间: ${record.created_at}`);
      console.log(`     开始时间: ${record.start_time}`);
      console.log('');
    });

    console.log('✅ 测试数据插入完成！');

  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    console.error('错误详情:', error.message);
    throw error;
  }
}

// 清理测试数据的函数
async function cleanupTestData() {
  console.log('🧹 清理测试数据...');
  
  try {
    const result = await query(`
      DELETE FROM test_history 
      WHERE test_name IN (
        '百度首页压力测试',
        'GitHub API 压力测试', 
        '本地服务器测试',
        'Google 搜索压力测试'
      )
    `);
    
    console.log(`✅ 清理了 ${result.rowCount} 条测试记录`);
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clean') {
    cleanupTestData()
      .then(() => {
        console.log('\n🎉 清理完成');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 清理失败:', error);
        process.exit(1);
      });
  } else {
    insertTestData()
      .then(() => {
        console.log('\n🎉 脚本执行完成');
        console.log('💡 使用 "node insert-test-data.js clean" 来清理测试数据');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 脚本执行失败:', error);
        process.exit(1);
      });
  }
}

module.exports = { insertTestData, cleanupTestData };
