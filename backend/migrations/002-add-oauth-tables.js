/**
 * 数据库迁移脚本 - 添加OAuth2支持表
 * 迁移版本: 002
 * 描述: 创建OAuth账户关联表和相关索引
 */

const { DataTypes } = require('sequelize');

module.exports = {
  // 迁移版本
  version: '002',
  description: '添加OAuth2第三方登录支持表',
  
  /**
   * 执行迁移 - 创建OAuth表
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      
      // 创建OAuth账户关联表
      await queryInterface.createTable('user_oauth_accounts', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          comment: '主键ID'
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          comment: '关联的用户ID'
        },
        provider: {
          type: DataTypes.ENUM('google', 'github', 'microsoft', 'discord', 'apple', 'facebook'),
          allowNull: false,
          comment: 'OAuth提供商'
        },
        provider_user_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: '提供商用户ID'
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: '来自提供商的邮箱'
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: '来自提供商的姓名'
        },
        avatar: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '头像URL'
        },
        raw_data: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: '来自提供商的原始用户数据'
        },
        access_token: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '访问令牌（加密存储）'
        },
        refresh_token: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '刷新令牌（加密存储）'
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: '令牌过期时间'
        },
        scopes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '授权范围'
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: '账户是否活跃'
        },
        last_login_at: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: '最后登录时间'
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          comment: '创建时间'
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          comment: '更新时间'
        }
      }, {
        transaction,
        indexes: [
          // 唯一索引：同一个提供商的同一个用户ID只能绑定一个本地用户
          {
            unique: true,
            fields: ['provider', 'provider_user_id'],
            name: 'user_oauth_accounts_provider_user_unique'
          },
          // 用户ID索引
          {
            fields: ['user_id'],
            name: 'user_oauth_accounts_user_id_idx'
          },
          // 提供商索引
          {
            fields: ['provider'],
            name: 'user_oauth_accounts_provider_idx'
          },
          // 邮箱索引
          {
            fields: ['email'],
            name: 'user_oauth_accounts_email_idx'
          },
          // 活跃状态索引
          {
            fields: ['is_active'],
            name: 'user_oauth_accounts_is_active_idx'
          },
          // 最后登录时间索引
          {
            fields: ['last_login_at'],
            name: 'user_oauth_accounts_last_login_idx'
          }
        ]
      });

      // 创建OAuth应用配置表（用于管理OAuth应用信息）
      await queryInterface.createTable('oauth_applications', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: '应用名称'
        },
        provider: {
          type: DataTypes.ENUM('google', 'github', 'microsoft', 'discord', 'apple', 'facebook'),
          allowNull: false,
          unique: true,
          comment: 'OAuth提供商'
        },
        client_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: '客户端ID'
        },
        client_secret: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: '客户端密钥（加密存储）'
        },
        redirect_uri: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: '重定向URI'
        },
        scopes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '默认授权范围'
        },
        is_enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: '是否启用'
        },
        config: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: '额外配置信息'
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
            fields: ['provider'],
            unique: true,
            name: 'oauth_applications_provider_unique'
          },
          {
            fields: ['is_enabled'],
            name: 'oauth_applications_is_enabled_idx'
          }
        ]
      });

      // 创建OAuth会话表（用于跟踪OAuth登录会话）
      await queryInterface.createTable('oauth_sessions', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        session_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          comment: '会话ID'
        },
        provider: {
          type: DataTypes.ENUM('google', 'github', 'microsoft', 'discord', 'apple', 'facebook'),
          allowNull: false,
          comment: 'OAuth提供商'
        },
        state: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: 'OAuth state参数'
        },
        code_verifier: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'PKCE code verifier'
        },
        redirect_uri: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '登录成功后的重定向地址'
        },
        ip_address: {
          type: DataTypes.INET,
          allowNull: true,
          comment: '客户端IP地址'
        },
        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '用户代理'
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: '会话过期时间'
        },
        is_used: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: '是否已使用'
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
            fields: ['session_id'],
            unique: true,
            name: 'oauth_sessions_session_id_unique'
          },
          {
            fields: ['provider'],
            name: 'oauth_sessions_provider_idx'
          },
          {
            fields: ['expires_at'],
            name: 'oauth_sessions_expires_at_idx'
          },
          {
            fields: ['is_used'],
            name: 'oauth_sessions_is_used_idx'
          }
        ]
      });

      // 注意：security_logs表的risk_level是VARCHAR类型，不是ENUM
      // OAuth登录事件可以使用现有的risk_level值 (如 'low', 'medium', 'high')

      // 提交事务
      await transaction.commit();
      console.log('✅ OAuth2表迁移完成');
      
      return {
        success: true,
        message: 'OAuth2表迁移成功完成',
        tablesCreated: ['user_oauth_accounts', 'oauth_applications', 'oauth_sessions']
      };
      
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      console.error('❌ OAuth2表迁移失败:', error);
      throw error;
    }
  },

  /**
   * 回滚迁移 - 删除OAuth表
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      
      // 删除OAuth表（按依赖关系逆序删除）
      const tablesToDrop = ['oauth_sessions', 'oauth_applications', 'user_oauth_accounts'];
      
      for (const table of tablesToDrop) {
        await queryInterface.dropTable(table, { transaction });
      }
      
      await transaction.commit();
      console.log('✅ OAuth2表迁移回滚完成');
      
      return {
        success: true,
        message: 'OAuth2表迁移回滚成功完成',
        tablesDropped: tablesToDrop
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ OAuth2表迁移回滚失败:', error);
      throw error;
    }
  },

  /**
   * 验证迁移结果
   */
  async validate(queryInterface) {
    try {
      console.log('🔍 验证OAuth2迁移结果...');
      
      // 检查表是否存在
      const tables = await queryInterface.showAllTables();
      const requiredTables = ['user_oauth_accounts', 'oauth_applications', 'oauth_sessions'];
      const missingTables = requiredTables.filter(table => !tables.includes(table));
      
      if (missingTables.length > 0) {
        throw new Error(`缺少必需表: ${missingTables.join(', ')}`);
      }
      
      // 检查user_oauth_accounts表结构
      const oauthAccountsStructure = await queryInterface.describeTable('user_oauth_accounts');
      const requiredFields = ['id', 'user_id', 'provider', 'provider_user_id', 'email'];
      const missingFields = requiredFields.filter(field => !oauthAccountsStructure[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`user_oauth_accounts表缺少必需字段: ${missingFields.join(', ')}`);
      }
      
      // 检查索引是否存在
      const indexes = await queryInterface.showIndex('user_oauth_accounts');
      const hasUniqueIndex = indexes.some(index => 
        index.unique && 
        index.fields.includes('provider') && 
        index.fields.includes('provider_user_id')
      );
      
      if (!hasUniqueIndex) {
        console.warn('⚠️ 警告: user_oauth_accounts表缺少provider+provider_user_id唯一索引');
      }
      
      console.log('✅ OAuth2迁移验证通过');
      return { success: true, message: '所有OAuth2表和索引都已正确创建' };
      
    } catch (error) {
      console.error('❌ OAuth2迁移验证失败:', error);
      throw error;
    }
  }
};
