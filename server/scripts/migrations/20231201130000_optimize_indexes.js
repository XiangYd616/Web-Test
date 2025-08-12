/**
 * Migration: optimize_indexes
 * Created: 2023-12-01T13:00:00.000Z
 * Description: 优化数据库索引以提升查询性能
 */

module.exports = {
  /**
   * 执行迁移 - 添加优化索引
   * @param {Pool} pool - 数据库连接池
   */
  async up(pool) {
    console.log('🔄 开始优化数据库索引...');

    // 1. 添加复合索引以优化常见查询
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_user_type_created 
      ON test_results(user_id, test_type, created_at DESC)
    `);
    console.log('✅ 创建测试结果复合索引');

    // 2. 添加部分索引以优化状态查询
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_failed 
      ON test_results(user_id, created_at DESC) 
      WHERE status = 'failed'
    `);
    console.log('✅ 创建失败测试部分索引');

    // 3. 添加监控站点活跃状态索引
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_sites_active 
      ON monitoring_sites(user_id, created_at DESC) 
      WHERE status = 'active' AND deleted_at IS NULL
    `);
    console.log('✅ 创建活跃监控站点索引');

    // 4. 添加通知未读索引
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notifications_unread_priority 
      ON user_notifications(user_id, priority, created_at DESC) 
      WHERE read_at IS NULL
    `);
    console.log('✅ 创建未读通知优先级索引');

    // 5. 添加文件类型索引
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uploaded_files_type_user 
      ON uploaded_files(file_type, user_id, created_at DESC)
    `);
    console.log('✅ 创建文件类型索引');

    // 6. 更新表统计信息
    await pool.query('ANALYZE users, test_results, monitoring_sites, user_notifications, uploaded_files');
    console.log('✅ 更新表统计信息');

    console.log('🎉 索引优化完成');
  },

  /**
   * 回滚迁移 - 删除优化索引
   * @param {Pool} pool - 数据库连接池
   */
  async down(pool) {
    console.log('🔄 开始回滚索引优化...');

    // 删除添加的索引
    const indexesToDrop = [
      'idx_test_results_user_type_created',
      'idx_test_results_failed',
      'idx_monitoring_sites_active',
      'idx_user_notifications_unread_priority',
      'idx_uploaded_files_type_user'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`);
        console.log(`✅ 删除索引: ${indexName}`);
      } catch (error) {
        console.warn(`⚠️ 删除索引失败 ${indexName}:`, error.message);
      }
    }

    // 更新表统计信息
    await pool.query('ANALYZE users, test_results, monitoring_sites, user_notifications, uploaded_files');
    console.log('✅ 更新表统计信息');

    console.log('🎉 索引优化回滚完成');
  }
};
