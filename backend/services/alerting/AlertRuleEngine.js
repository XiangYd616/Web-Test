/**
 * 告警规则引擎
 * 负责规则评估、条件检查和告警触发
 * Version: 1.0
 */

const logger = require('../../utils/logger');
const { query } = require('../../config/database');

class AlertRuleEngine {
  constructor() {
    this.rules = new Map();
    this.cooldowns = new Map(); // 冷却期管理
    this.evaluationHistory = new Map(); // 评估历史
    this.initialized = false;
  }

  /**
   * 初始化规则引擎
   */
  async initialize() {
    try {
      logger.info('🚀 初始化告警规则引擎...');
      
      // 从数据库加载活跃规则
      await this.loadRulesFromDatabase();
      
      // 启动定期清理
      this.startCleanupTask();
      
      this.initialized = true;
      logger.info('✅ 告警规则引擎初始化完成', {
        rulesCount: this.rules.size
      });
      
      return true;
    } catch (error) {
      logger.error('告警规则引擎初始化失败', error);
      return false;
    }
  }

  /**
   * 从数据库加载规则
   */
  async loadRulesFromDatabase() {
    try {
      const result = await query(
        `SELECT * FROM alert_rules WHERE is_active = true ORDER BY created_at DESC`
      );
      
      for (const row of result.rows) {
        this.rules.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          metricName: row.metric_name,
          condition: row.condition,
          threshold: parseFloat(row.threshold),
          severity: row.severity,
          channels: row.channels,
          cooldown: row.cooldown || 300, // 默认5分钟
          isActive: row.is_active,
          createdBy: row.created_by,
          createdAt: row.created_at
        });
      }
      
      logger.info(`✅ 加载了 ${result.rows.length} 条告警规则`);
    } catch (error) {
      logger.error('加载告警规则失败', error);
      throw error;
    }
  }

  /**
   * 添加规则
   */
  async addRule(rule) {
    try {
      // 验证规则
      this.validateRule(rule);
      
      // 保存到数据库
      const result = await query(
        `INSERT INTO alert_rules 
         (id, name, description, metric_name, condition, threshold, severity, channels, cooldown, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          rule.id || require('uuid').v4(),
          rule.name,
          rule.description || null,
          rule.metricName,
          rule.condition,
          rule.threshold,
          rule.severity || 'medium',
          JSON.stringify(rule.channels || ['email']),
          rule.cooldown || 300,
          rule.isActive !== false,
          rule.createdBy || null
        ]
      );
      
      const savedRule = result.rows[0];
      
      // 添加到内存
      this.rules.set(savedRule.id, {
        id: savedRule.id,
        name: savedRule.name,
        description: savedRule.description,
        metricName: savedRule.metric_name,
        condition: savedRule.condition,
        threshold: parseFloat(savedRule.threshold),
        severity: savedRule.severity,
        channels: savedRule.channels,
        cooldown: savedRule.cooldown,
        isActive: savedRule.is_active,
        createdBy: savedRule.created_by,
        createdAt: savedRule.created_at
      });
      
      logger.info('✅ 添加告警规则', { ruleId: savedRule.id, name: rule.name });
      
      return savedRule;
    } catch (error) {
      logger.error('添加告警规则失败', error, { rule });
      throw error;
    }
  }

  /**
   * 更新规则
   */
  async updateRule(ruleId, updates) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error(`规则不存在: ${ruleId}`);
      }
      
      // 构建更新语句
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.threshold !== undefined) {
        fields.push(`threshold = $${paramIndex++}`);
        values.push(updates.threshold);
      }
      if (updates.severity !== undefined) {
        fields.push(`severity = $${paramIndex++}`);
        values.push(updates.severity);
      }
      if (updates.channels !== undefined) {
        fields.push(`channels = $${paramIndex++}`);
        values.push(JSON.stringify(updates.channels));
      }
      if (updates.cooldown !== undefined) {
        fields.push(`cooldown = $${paramIndex++}`);
        values.push(updates.cooldown);
      }
      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      
      if (fields.length === 0) {
        return rule;
      }
      
      values.push(ruleId);
      
      const result = await query(
        `UPDATE alert_rules SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      // 更新内存中的规则
      await this.loadRulesFromDatabase();
      
      logger.info('✅ 更新告警规则', { ruleId, updates });
      
      return result.rows[0];
    } catch (error) {
      logger.error('更新告警规则失败', error, { ruleId, updates });
      throw error;
    }
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId) {
    try {
      await query('DELETE FROM alert_rules WHERE id = $1', [ruleId]);
      this.rules.delete(ruleId);
      this.cooldowns.delete(ruleId);
      
      logger.info('✅ 删除告警规则', { ruleId });
      
      return true;
    } catch (error) {
      logger.error('删除告警规则失败', error, { ruleId });
      throw error;
    }
  }

  /**
   * 评估指标是否触发告警
   */
  async evaluate(metric) {
    try {
      const triggeredRules = [];
      
      // 遍历所有规则
      for (const [ruleId, rule] of this.rules) {
        // 检查规则是否激活
        if (!rule.isActive) {
          continue;
        }
        
        // 检查指标名称是否匹配
        if (rule.metricName !== metric.name) {
          continue;
        }
        
        // 检查条件
        if (!this.checkCondition(metric, rule)) {
          continue;
        }
        
        // 检查冷却期
        if (this.isInCooldown(ruleId)) {
          logger.debug('规则在冷却期内，跳过', { ruleId, rule: rule.name });
          continue;
        }
        
        // 触发告警
        triggeredRules.push(rule);
        
        // 设置冷却期
        this.setCooldown(ruleId, rule.cooldown);
        
        // 记录评估历史
        this.recordEvaluation(ruleId, metric, true);
        
        logger.info('🚨 告警规则触发', {
          ruleId,
          ruleName: rule.name,
          metric: metric.name,
          value: metric.value,
          threshold: rule.threshold
        });
      }
      
      return triggeredRules;
    } catch (error) {
      logger.error('评估告警规则失败', error, { metric });
      return [];
    }
  }

  /**
   * 检查条件
   */
  checkCondition(metric, rule) {
    const value = parseFloat(metric.value);
    const threshold = parseFloat(rule.threshold);
    
    switch (rule.condition) {
      case 'gt': // 大于
      case '>':
        return value > threshold;
        
      case 'gte': // 大于等于
      case '>=':
        return value >= threshold;
        
      case 'lt': // 小于
      case '<':
        return value < threshold;
        
      case 'lte': // 小于等于
      case '<=':
        return value <= threshold;
        
      case 'eq': // 等于
      case '==':
        return value === threshold;
        
      case 'ne': // 不等于
      case '!=':
        return value !== threshold;
        
      default:
        logger.warn('未知的条件类型', { condition: rule.condition });
        return false;
    }
  }

  /**
   * 检查是否在冷却期
   */
  isInCooldown(ruleId) {
    const cooldownEnd = this.cooldowns.get(ruleId);
    if (!cooldownEnd) {
      return false;
    }
    
    const now = Date.now();
    if (now < cooldownEnd) {
      return true;
    }
    
    // 冷却期已过，删除记录
    this.cooldowns.delete(ruleId);
    return false;
  }

  /**
   * 设置冷却期
   */
  setCooldown(ruleId, cooldownSeconds) {
    const cooldownEnd = Date.now() + (cooldownSeconds * 1000);
    this.cooldowns.set(ruleId, cooldownEnd);
    
    logger.debug('设置告警冷却期', {
      ruleId,
      cooldownSeconds,
      cooldownEnd: new Date(cooldownEnd).toISOString()
    });
  }

  /**
   * 记录评估历史
   */
  recordEvaluation(ruleId, metric, triggered) {
    const history = this.evaluationHistory.get(ruleId) || [];
    history.push({
      timestamp: Date.now(),
      metric,
      triggered
    });
    
    // 只保留最近100条记录
    if (history.length > 100) {
      history.shift();
    }
    
    this.evaluationHistory.set(ruleId, history);
  }

  /**
   * 验证规则
   */
  validateRule(rule) {
    if (!rule.name) {
      throw new Error('规则名称不能为空');
    }
    
    if (!rule.metricName) {
      throw new Error('指标名称不能为空');
    }
    
    if (!rule.condition) {
      throw new Error('条件不能为空');
    }
    
    if (rule.threshold === undefined || rule.threshold === null) {
      throw new Error('阈值不能为空');
    }
    
    const validConditions = ['gt', '>', 'gte', '>=', 'lt', '<', 'lte', '<=', 'eq', '==', 'ne', '!='];
    if (!validConditions.includes(rule.condition)) {
      throw new Error(`无效的条件: ${rule.condition}`);
    }
    
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (rule.severity && !validSeverities.includes(rule.severity)) {
      throw new Error(`无效的严重程度: ${rule.severity}`);
    }
  }

  /**
   * 获取所有规则
   */
  getRules() {
    return Array.from(this.rules.values());
  }

  /**
   * 获取单个规则
   */
  getRule(ruleId) {
    return this.rules.get(ruleId);
  }

  /**
   * 获取规则评估历史
   */
  getEvaluationHistory(ruleId) {
    return this.evaluationHistory.get(ruleId) || [];
  }

  /**
   * 启动清理任务
   */
  startCleanupTask() {
    // 每小时清理一次过期的冷却期
    setInterval(() => {
      this.cleanupCooldowns();
    }, 3600000); // 1小时
  }

  /**
   * 清理过期的冷却期
   */
  cleanupCooldowns() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [ruleId, cooldownEnd] of this.cooldowns) {
      if (now >= cooldownEnd) {
        this.cooldowns.delete(ruleId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('清理过期冷却期', { count: cleaned });
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.isActive).length,
      rulesInCooldown: this.cooldowns.size,
      evaluationHistorySize: Array.from(this.evaluationHistory.values())
        .reduce((sum, history) => sum + history.length, 0)
    };
  }

  /**
   * 关闭引擎
   */
  async close() {
    this.rules.clear();
    this.cooldowns.clear();
    this.evaluationHistory.clear();
    logger.info('✅ 告警规则引擎已关闭');
  }
}

// 导出单例
let alertRuleEngineInstance = null;

function getAlertRuleEngine() {
  if (!alertRuleEngineInstance) {
    alertRuleEngineInstance = new AlertRuleEngine();
  }
  return alertRuleEngineInstance;
}

module.exports = AlertRuleEngine;
module.exports.getAlertRuleEngine = getAlertRuleEngine;

