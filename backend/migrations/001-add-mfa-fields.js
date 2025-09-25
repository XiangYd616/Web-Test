/**
 * 数据库迁移脚本 - 添加MFA支持字段
 * 迁移版本: 001
 * 描述: 为users表添加MFA (Multi-Factor Authentication) 相关字段
 */

const { DataTypes } = require('sequelize');

module.exports = {
  // 迁移版本
  version: '001',
  description: '添加MFA支持字段到users表',
  
  /**
   * 执行迁移 - 添加字段
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      
      // 检查表是否存在
      const tableExists = await queryInterface.describeTable('users');
      if (!tableExists) {
        throw new Error('users表不存在，请先运行基础迁移');
      }
      
      // 添加MFA相关字段
      const fieldsToAdd = [
        {
          field: 'mfa_enabled',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'MFA是否启用'
        },
        {
          field: 'mfa_secret',
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'MFA密钥（base32编码）'
        },
        {
          field: 'mfa_backup_codes',
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'MFA备用码（JSON格式存储）'
        },
        {
          field: 'mfa_temp_secret',
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'MFA临时设置数据（JSON格式）'
        },
        {
          field: 'failed_login_attempts',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '失败登录尝试次数'
        },
        {
          field: 'locked_until',
          type: DataTypes.DATE,
          allowNull: true,
          comment: '账户锁定到期时间'
        },
        {
          field: 'last_password_change',
          type: DataTypes.DATE,
          allowNull: true,
          comment: '最后密码修改时间'
        },
        {
          field: 'password_reset_token',
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: '密码重置令牌'
        },
        {
          field: 'password_reset_expires',
          type: DataTypes.DATE,
          allowNull: true,
          comment: '密码重置令牌过期时间'
        },
        {
          field: 'email_verification_token',
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: '邮箱验证令牌'
        },
        {
          field: 'email_verified_at',
          type: DataTypes.DATE,
          allowNull: true,
          comment: '邮箱验证时间'
        }
      ];
      
      // 检查字段是否已存在，避免重复添加
      const existingColumns = await queryInterface.describeTable('users');
      
      for (const fieldInfo of fieldsToAdd) {
        const { field, ...options } = fieldInfo;
        
        if (!existingColumns[field]) {
          await queryInterface.addColumn('users', field, options, { transaction });
        } else {
        }
      }
      
      // 创建安全日志表（如果不存在）
      const securityLogsTableExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('security_logs'));
      
      if (!securityLogsTableExists) {
        await queryInterface.createTable('security_logs', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onDelete: 'SET NULL',
            comment: '用户ID'
          },
          event_type: {
            type: DataTypes.STRING(100),
            allowNull: false,
            index: true,
            comment: '事件类型'
          },
          event_data: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: '事件详细数据'
          },
          ip_address: {
            type: DataTypes.INET,
            allowNull: true,
            comment: 'IP地址'
          },
          user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '用户代理'
          },
          success: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            index: true,
            comment: '是否成功'
          },
          risk_level: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
            defaultValue: 'low',
            index: true,
            comment: '风险级别'
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            index: true
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          }
        }, {
          transaction,
          indexes: [
            {
              fields: ['user_id', 'created_at']
            },
            {
              fields: ['event_type', 'created_at']
            },
            {
              fields: ['risk_level', 'created_at']
            }
          ]
        });
      }
      
      // 创建用户会话表（如果不存在）
      const userSessionsTableExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('user_sessions'));
      
      if (!userSessionsTableExists) {
        await queryInterface.createTable('user_sessions', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onDelete: 'CASCADE',
            index: true,
            comment: '用户ID'
          },
          session_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            comment: '会话ID'
          },
          access_token_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: '访问令牌哈希'
          },
          refresh_token_hash: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '刷新令牌哈希'
          },
          ip_address: {
            type: DataTypes.INET,
            allowNull: true,
            comment: 'IP地址'
          },
          user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '用户代理'
          },
          device_fingerprint: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '设备指纹'
          },
          is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            index: true,
            comment: '是否活跃'
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
            index: true,
            comment: '过期时间'
          },
          last_activity_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: '最后活动时间'
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          }
        }, {
          transaction,
          indexes: [
            {
              fields: ['user_id', 'is_active']
            },
            {
              fields: ['expires_at', 'is_active']
            }
          ]
        });
      }
      
      // 提交事务
      await transaction.commit();
      console.log('✅ MFA字段迁移完成');
      
      return {
        success: true,
        message: 'MFA字段迁移成功完成',
        fieldsAdded: fieldsToAdd.map(f => f.field)
      };
      
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      console.error('❌ MFA字段迁移失败:', error);
      throw error;
    }
  },

  /**
   * 回滚迁移 - 移除字段
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      
      // 要移除的字段列表
      const fieldsToRemove = [
        'mfa_enabled',
        'mfa_secret',
        'mfa_backup_codes',
        'mfa_temp_secret',
        'failed_login_attempts',
        'locked_until',
        'last_password_change',
        'password_reset_token',
        'password_reset_expires',
        'email_verification_token',
        'email_verified_at'
      ];
      
      // 检查字段是否存在然后移除
      const existingColumns = await queryInterface.describeTable('users');
      
      for (const field of fieldsToRemove) {
        if (existingColumns[field]) {
          await queryInterface.removeColumn('users', field, { transaction });
        }
      }
      
      // 删除安全日志表
      await queryInterface.dropTable('security_logs', { transaction });
      
      // 删除用户会话表
      await queryInterface.dropTable('user_sessions', { transaction });
      
      await transaction.commit();
      console.log('✅ MFA字段迁移回滚完成');
      
      return {
        success: true,
        message: 'MFA字段迁移回滚成功完成',
        fieldsRemoved: fieldsToRemove
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ MFA字段迁移回滚失败:', error);
      throw error;
    }
  },

  /**
   * 验证迁移结果
   */
  async validate(queryInterface) {
    try {
      console.log('🔍 验证MFA迁移结果...');
      
      const tableStructure = await queryInterface.describeTable('users');
      
      const requiredFields = [
        'mfa_enabled',
        'mfa_secret',
        'mfa_backup_codes',
        'mfa_temp_secret',
        'failed_login_attempts',
        'locked_until'
      ];
      
      const missingFields = requiredFields.filter(field => !tableStructure[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`缺少必需字段: ${missingFields.join(', ')}`);
      }
      
      // 检查表是否存在
      const tables = await queryInterface.showAllTables();
      const requiredTables = ['security_logs', 'user_sessions'];
      const missingTables = requiredTables.filter(table => !tables.includes(table));
      
      if (missingTables.length > 0) {
        throw new Error(`缺少必需表: ${missingTables.join(', ')}`);
      }
      
      console.log('✅ MFA迁移验证通过');
      return { success: true, message: '所有MFA字段和表都已正确创建' };
      
    } catch (error) {
      console.error('❌ MFA迁移验证失败:', error);
      throw error;
    }
  }
};
