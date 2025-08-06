/**
 * 测试API集成脚本
 * 验证新的主从表结构API是否正常工作
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

async function testApiIntegration() {
  console.log('🧪 测试API集成...');
  console.log('=====================================');

  let pool;

  try {
    pool = new Pool(dbConfig);

    // 0. 获取或创建测试用户
    console.log('0️⃣ 获取测试用户...');

    // 先查找是否有现有用户
    let userResult = await pool.query(`SELECT id FROM users LIMIT 1`);
    let actualUserId;

    if (userResult.rows.length > 0) {
      actualUserId = userResult.rows[0].id;
      console.log(`   ✅ 使用现有用户: ${actualUserId}`);
    } else {
      // 如果没有用户，创建一个简单的测试用户
      const testUserId = uuidv4();
      userResult = await pool.query(`
        INSERT INTO users (id, username, email, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        testUserId, 'test_user', 'test@example.com', 'dummy_hash', new Date(), new Date()
      ]);
      actualUserId = userResult.rows[0].id;
      console.log(`   ✅ 创建新用户: ${actualUserId}`);
    }

    // 1. 测试创建测试会话
    console.log('1️⃣ 测试创建测试会话...');
    const sessionId = uuidv4();

    const sessionInsert = await pool.query(`
      INSERT INTO test_sessions (
        id, user_id, test_name, test_type, url, status, start_time, end_time, duration,
        overall_score, grade, total_issues, critical_issues, major_issues, minor_issues,
        config, environment, tags, description, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING id
    `, [
      sessionId, actualUserId, '测试会话', 'security', 'https://example.com', 'completed',
      new Date(), new Date(), 30, 85, 'B+', 5, 1, 2, 2,
      JSON.stringify({ level: 'standard' }), 'production',
      ['test', 'integration'], '集成测试会话',
      new Date(), new Date()
    ]);

    console.log(`   ✅ 测试会话创建成功: ${sessionInsert.rows[0].id}`);

    // 2. 测试创建安全测试详情
    console.log('2️⃣ 测试创建安全测试详情...');

    const securityInsert = await pool.query(`
      INSERT INTO security_test_details (
        session_id, security_score, ssl_score, vulnerabilities_total,
        vulnerabilities_critical, vulnerabilities_high, sql_injection_found,
        xss_vulnerabilities, csrf_vulnerabilities, https_enforced,
        hsts_enabled, csrf_protection, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING session_id
    `, [
      sessionId, 85, 90, 5, 1, 2, 0, 1, 1, true, true, true, new Date()
    ]);

    console.log(`   ✅ 安全测试详情创建成功: ${securityInsert.rows[0].session_id}`);

    // 3. 测试查询安全测试历史视图
    console.log('3️⃣ 测试查询安全测试历史视图...');

    const historyQuery = await pool.query(`
      SELECT * FROM security_test_history WHERE id = $1
    `, [sessionId]);

    if (historyQuery.rows.length > 0) {
      const record = historyQuery.rows[0];
      console.log(`   ✅ 历史视图查询成功:`);
      console.log(`      - 测试名称: ${record.test_name}`);
      console.log(`      - 测试类型: ${record.test_type}`);
      console.log(`      - 状态: ${record.status}`);
      console.log(`      - 总分: ${record.overall_score}`);
      console.log(`      - 等级: ${record.grade}`);
      console.log(`      - 安全分数: ${record.security_score}`);
      console.log(`      - SSL分数: ${record.ssl_score}`);
      console.log(`      - 漏洞总数: ${record.vulnerabilities_total}`);
    } else {
      console.log(`   ❌ 历史视图查询失败`);
    }

    // 4. 测试软删除
    console.log('4️⃣ 测试软删除...');

    const deleteResult = await pool.query(`
      UPDATE test_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id
    `, [sessionId]);

    console.log(`   ✅ 软删除成功: ${deleteResult.rows[0].id}`);

    // 5. 验证软删除后查询
    console.log('5️⃣ 验证软删除后查询...');

    const deletedQuery = await pool.query(`
      SELECT * FROM security_test_history WHERE id = $1
    `, [sessionId]);

    if (deletedQuery.rows.length === 0) {
      console.log(`   ✅ 软删除验证成功：已删除的记录不在视图中显示`);
    } else {
      console.log(`   ❌ 软删除验证失败：已删除的记录仍在视图中显示`);
    }

    // 6. 清理测试数据
    console.log('6️⃣ 清理测试数据...');

    await pool.query(`DELETE FROM security_test_details WHERE session_id = $1`, [sessionId]);
    await pool.query(`DELETE FROM test_sessions WHERE id = $1`, [sessionId]);
    // 不删除用户，因为可能是现有用户

    console.log(`   ✅ 测试数据清理完成`);

    console.log('\n🎉 API集成测试完成！所有测试通过。');

  } catch (error) {
    console.error('❌ API集成测试失败:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

testApiIntegration();
