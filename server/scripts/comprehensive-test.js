/**
 * 全面功能测试脚本
 * 验证新数据库架构下的所有测试历史功能
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

class ComprehensiveTest {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.testResults = [];
    this.testUserId = null;
    this.createdSessions = [];
  }

  async runAllTests() {
    console.log('🧪 开始全面功能测试...');
    console.log('=====================================');

    try {
      await this.setupTestEnvironment();
      await this.testDatabaseStructure();
      await this.testSessionCreation();
      await this.testDetailsTables();
      await this.testHistoryViews();
      await this.testSoftDelete();
      await this.testQueryPerformance();
      await this.generateTestReport();
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error);
      this.testResults.push({
        test: '整体测试',
        status: 'FAILED',
        error: error.message
      });
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('1️⃣ 设置测试环境...');
    
    try {
      // 获取或创建测试用户
      const userResult = await this.pool.query('SELECT id FROM users LIMIT 1');
      if (userResult.rows.length > 0) {
        this.testUserId = userResult.rows[0].id;
        console.log(`   ✅ 使用现有用户: ${this.testUserId}`);
      } else {
        const newUserId = uuidv4();
        await this.pool.query(`
          INSERT INTO users (id, username, email, password, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [newUserId, 'test_user', 'test@example.com', 'dummy_hash', new Date(), new Date()]);
        this.testUserId = newUserId;
        console.log(`   ✅ 创建新用户: ${this.testUserId}`);
      }

      this.testResults.push({
        test: '测试环境设置',
        status: 'PASSED',
        details: `用户ID: ${this.testUserId}`
      });
    } catch (error) {
      console.error('   ❌ 测试环境设置失败:', error.message);
      this.testResults.push({
        test: '测试环境设置',
        status: 'FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async testDatabaseStructure() {
    console.log('2️⃣ 测试数据库结构...');

    const expectedTables = [
      'test_sessions',
      'stress_test_details',
      'security_test_details',
      'api_test_details',
      'seo_test_details',
      'accessibility_test_details',
      'compatibility_test_details',
      'performance_test_details',
      'test_artifacts'
    ];

    const expectedViews = [
      'stress_test_history',
      'security_test_history',
      'api_test_history',
      'seo_test_history',
      'accessibility_test_history',
      'compatibility_test_history',
      'performance_test_history'
    ];

    try {
      // 检查表
      const tablesResult = await this.pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = ANY($1)
      `, [expectedTables]);

      const existingTables = tablesResult.rows.map(row => row.tablename);
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));

      if (missingTables.length === 0) {
        console.log(`   ✅ 所有必需表都存在 (${existingTables.length}/${expectedTables.length})`);
      } else {
        console.log(`   ❌ 缺失表: ${missingTables.join(', ')}`);
        throw new Error(`缺失表: ${missingTables.join(', ')}`);
      }

      // 检查视图
      const viewsResult = await this.pool.query(`
        SELECT viewname FROM pg_views 
        WHERE schemaname = 'public' AND viewname = ANY($1)
      `, [expectedViews]);

      const existingViews = viewsResult.rows.map(row => row.viewname);
      const missingViews = expectedViews.filter(view => !existingViews.includes(view));

      if (missingViews.length === 0) {
        console.log(`   ✅ 所有必需视图都存在 (${existingViews.length}/${expectedViews.length})`);
      } else {
        console.log(`   ❌ 缺失视图: ${missingViews.join(', ')}`);
        throw new Error(`缺失视图: ${missingViews.join(', ')}`);
      }

      this.testResults.push({
        test: '数据库结构检查',
        status: 'PASSED',
        details: `表: ${existingTables.length}, 视图: ${existingViews.length}`
      });
    } catch (error) {
      console.error('   ❌ 数据库结构检查失败:', error.message);
      this.testResults.push({
        test: '数据库结构检查',
        status: 'FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async testSessionCreation() {
    console.log('3️⃣ 测试会话创建...');

    const testTypes = ['stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility'];
    
    try {
      for (const testType of testTypes) {
        const sessionId = uuidv4();
        
        await this.pool.query(`
          INSERT INTO test_sessions (
            id, user_id, test_name, test_type, url, status, start_time, end_time, duration,
            overall_score, grade, total_issues, critical_issues, major_issues, minor_issues,
            config, environment, tags, description, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          )
        `, [
          sessionId, this.testUserId, `测试会话 - ${testType}`, testType, 'https://example.com',
          'completed', new Date(), new Date(), 60, 85.5, 'B+', 5, 1, 2, 2,
          JSON.stringify({ level: 'standard' }), 'production',
          ['test', testType], `${testType}测试会话`, new Date(), new Date()
        ]);

        this.createdSessions.push({ id: sessionId, type: testType });
        console.log(`   ✅ ${testType} 会话创建成功: ${sessionId}`);
      }

      this.testResults.push({
        test: '测试会话创建',
        status: 'PASSED',
        details: `创建了 ${testTypes.length} 个测试会话`
      });
    } catch (error) {
      console.error('   ❌ 会话创建失败:', error.message);
      this.testResults.push({
        test: '测试会话创建',
        status: 'FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async testDetailsTables() {
    console.log('4️⃣ 测试详情表...');

    try {
      // 测试安全测试详情
      const securitySession = this.createdSessions.find(s => s.type === 'security');
      if (securitySession) {
        await this.pool.query(`
          INSERT INTO security_test_details (
            session_id, security_score, ssl_score, vulnerabilities_total,
            vulnerabilities_critical, vulnerabilities_high, sql_injection_found,
            xss_vulnerabilities, csrf_vulnerabilities, https_enforced,
            hsts_enabled, csrf_protection, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          securitySession.id, 85.5, 90.0, 5, 1, 2, 0, 1, 1, true, true, true, new Date()
        ]);
        console.log(`   ✅ 安全测试详情创建成功`);
      }

      // 测试性能测试详情
      const performanceSession = this.createdSessions.find(s => s.type === 'performance');
      if (performanceSession) {
        await this.pool.query(`
          INSERT INTO performance_test_details (
            session_id, first_contentful_paint, largest_contentful_paint,
            first_input_delay, cumulative_layout_shift, time_to_interactive,
            speed_index, total_blocking_time, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          performanceSession.id, 1200, 2500, 100, 0.1, 3000, 1500, 200, new Date()
        ]);
        console.log(`   ✅ 性能测试详情创建成功`);
      }

      this.testResults.push({
        test: '详情表测试',
        status: 'PASSED',
        details: '安全和性能测试详情创建成功'
      });
    } catch (error) {
      console.error('   ❌ 详情表测试失败:', error.message);
      this.testResults.push({
        test: '详情表测试',
        status: 'FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async testHistoryViews() {
    console.log('5️⃣ 测试历史视图...');

    try {
      // 测试安全测试历史视图
      const securityHistoryResult = await this.pool.query(`
        SELECT * FROM security_test_history WHERE user_id = $1
      `, [this.testUserId]);

      console.log(`   ✅ 安全测试历史视图: ${securityHistoryResult.rows.length} 条记录`);

      // 测试性能测试历史视图
      const performanceHistoryResult = await this.pool.query(`
        SELECT * FROM performance_test_history WHERE user_id = $1
      `, [this.testUserId]);

      console.log(`   ✅ 性能测试历史视图: ${performanceHistoryResult.rows.length} 条记录`);

      this.testResults.push({
        test: '历史视图测试',
        status: 'PASSED',
        details: `安全: ${securityHistoryResult.rows.length}, 性能: ${performanceHistoryResult.rows.length}`
      });
    } catch (error) {
      console.error('   ❌ 历史视图测试失败:', error.message);
      this.testResults.push({
        test: '历史视图测试',
        status: 'FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async testSoftDelete() {
    console.log('6️⃣ 测试软删除功能...');

    try {
      if (this.createdSessions.length > 0) {
        const sessionToDelete = this.createdSessions[0];
        
        // 执行软删除
        await this.pool.query(`
          UPDATE test_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [sessionToDelete.id]);

        // 验证软删除
        const deletedResult = await this.pool.query(`
          SELECT * FROM test_sessions WHERE id = $1
        `, [sessionToDelete.id]);

        const historyResult = await this.pool.query(`
          SELECT * FROM ${sessionToDelete.type}_test_history WHERE id = $1
        `, [sessionToDelete.id]);

        if (deletedResult.rows.length > 0 && deletedResult.rows[0].deleted_at) {
          console.log(`   ✅ 软删除成功: 记录仍存在但标记为已删除`);
        } else {
          throw new Error('软删除失败: 记录未正确标记');
        }

        if (historyResult.rows.length === 0) {
          console.log(`   ✅ 历史视图正确过滤已删除记录`);
        } else {
          throw new Error('历史视图未正确过滤已删除记录');
        }

        this.testResults.push({
          test: '软删除功能',
          status: 'PASSED',
          details: '软删除和视图过滤正常工作'
        });
      }
    } catch (error) {
      console.error('   ❌ 软删除测试失败:', error.message);
      this.testResults.push({
        test: '软删除功能',
        status: 'FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async testQueryPerformance() {
    console.log('7️⃣ 测试查询性能...');

    try {
      const startTime = Date.now();

      // 测试主表查询性能
      await this.pool.query(`
        SELECT * FROM test_sessions 
        WHERE user_id = $1 AND deleted_at IS NULL 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [this.testUserId]);

      const mainQueryTime = Date.now() - startTime;

      // 测试视图查询性能
      const viewStartTime = Date.now();
      await this.pool.query(`
        SELECT * FROM security_test_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [this.testUserId]);

      const viewQueryTime = Date.now() - viewStartTime;

      console.log(`   ✅ 主表查询时间: ${mainQueryTime}ms`);
      console.log(`   ✅ 视图查询时间: ${viewQueryTime}ms`);

      this.testResults.push({
        test: '查询性能测试',
        status: 'PASSED',
        details: `主表: ${mainQueryTime}ms, 视图: ${viewQueryTime}ms`
      });
    } catch (error) {
      console.error('   ❌ 查询性能测试失败:', error.message);
      this.testResults.push({
        test: '查询性能测试',
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async generateTestReport() {
    console.log('\n📊 生成测试报告...');
    console.log('=====================================');

    const passedTests = this.testResults.filter(r => r.status === 'PASSED');
    const failedTests = this.testResults.filter(r => r.status === 'FAILED');

    console.log(`✅ 通过测试: ${passedTests.length}`);
    console.log(`❌ 失败测试: ${failedTests.length}`);
    console.log(`📊 总体成功率: ${((passedTests.length / this.testResults.length) * 100).toFixed(1)}%`);

    if (failedTests.length > 0) {
      console.log('\n❌ 失败的测试:');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.error}`);
      });
    }

    console.log('\n✅ 通过的测试:');
    passedTests.forEach(test => {
      console.log(`   - ${test.test}: ${test.details || '成功'}`);
    });
  }

  async cleanup() {
    console.log('\n🧹 清理测试数据...');

    try {
      // 删除创建的测试数据
      for (const session of this.createdSessions) {
        await this.pool.query('DELETE FROM test_sessions WHERE id = $1', [session.id]);
      }
      console.log(`   ✅ 清理了 ${this.createdSessions.length} 个测试会话`);
    } catch (error) {
      console.error('   ⚠️  清理过程中发生错误:', error.message);
    } finally {
      await this.pool.end();
    }
  }
}

async function main() {
  const test = new ComprehensiveTest();
  await test.runAllTests();
}

if (require.main === module) {
  main();
}

module.exports = ComprehensiveTest;
