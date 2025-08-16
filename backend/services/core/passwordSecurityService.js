/**
 * 密码安全管理服务
 * 实现密码强度验证、定期更换提醒、账户锁定机制
 * 版本: v2.0.0
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getPool } = require('../../config/database.js');
const Logger = require('../../middleware/logger.js');
const emailService = require('../email/emailService');

// ==================== 配置 ====================

const PASSWORD_CONFIG = {
  // 密码策略
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
  maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH) || 128,
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
  requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  
  // 密码历史
  preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE) || 5,
  maxAge: parseInt(process.env.PASSWORD_MAX_AGE) || 90, // 天
  
  // 账户锁定
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900, // 15分钟
  progressiveLockout: process.env.PROGRESSIVE_LOCKOUT === 'true',
  
  // 密码重置
  resetTokenExpiry: parseInt(process.env.RESET_TOKEN_EXPIRY) || 3600, // 1小时
  resetTokenLength: 32,
  
  // 通知设置
  expiryWarningDays: parseInt(process.env.PASSWORD_EXPIRY_WARNING) || 7,
  enableExpiryNotifications: process.env.ENABLE_EXPIRY_NOTIFICATIONS !== 'false',
  
  // 加密设置
  saltRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
};

// 常见弱密码模式
const WEAK_PATTERNS = [
  /^123456/,
  /^password/i,
  /^qwerty/i,
  /^admin/i,
  /^letmein/i,
  /^welcome/i,
  /^monkey/i,
  /^dragon/i,
  /(.)/1{2,}/, // 重复字符
  /^(.+)/1+$/, // 重复模式
  /^(012|123|234|345|456|567|678|789|890)+/,
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i
];

// ==================== 密码安全服务 ====================

class PasswordSecurityService {
  constructor() {
    this.startPasswordExpiryCheck();
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password, userInfo = {}) {
    const errors = [];
    const warnings = [];
    let score = 0;

    // 基本长度检查
    if (password.length < PASSWORD_CONFIG.minLength) {
      errors.push(`密码长度至少需要${PASSWORD_CONFIG.minLength}个字符`);
    } else if (password.length >= PASSWORD_CONFIG.minLength) {
      score += 1;
    }

    if (password.length > PASSWORD_CONFIG.maxLength) {
      errors.push(`密码长度不能超过${PASSWORD_CONFIG.maxLength}个字符`);
    }

    // 字符类型检查
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = //d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (PASSWORD_CONFIG.requireUppercase && !hasUppercase) {
      errors.push('密码必须包含大写字母');
    } else if (hasUppercase) {
      score += 1;
    }

    if (PASSWORD_CONFIG.requireLowercase && !hasLowercase) {
      errors.push('密码必须包含小写字母');
    } else if (hasLowercase) {
      score += 1;
    }

    if (PASSWORD_CONFIG.requireNumbers && !hasNumbers) {
      errors.push('密码必须包含数字');
    } else if (hasNumbers) {
      score += 1;
    }

    if (PASSWORD_CONFIG.requireSpecialChars && !hasSpecialChars) {
      errors.push('密码必须包含特殊字符');
    } else if (hasSpecialChars) {
      score += 1;
    }

    // 检查弱密码模式
    for (const pattern of WEAK_PATTERNS) {
      if (pattern.test(password)) {
        warnings.push('密码包含常见的弱密码模式，建议使用更复杂的密码');
        score = Math.max(0, score - 1);
        break;
      }
    }

    // 检查是否包含用户信息
    if (userInfo.username && password.toLowerCase().includes(userInfo.username.toLowerCase())) {
      warnings.push('密码不应包含用户名');
      score = Math.max(0, score - 1);
    }

    if (userInfo.email) {
      const emailLocal = userInfo.email.split('@')[0];
      if (password.toLowerCase().includes(emailLocal.toLowerCase())) {
        warnings.push('密码不应包含邮箱地址');
        score = Math.max(0, score - 1);
      }
    }

    // 计算熵值
    const entropy = this.calculatePasswordEntropy(password);
    if (entropy < 30) {
      warnings.push('密码复杂度较低，建议增加字符种类和长度');
    } else if (entropy >= 50) {
      score += 1;
    }

    // 最终评分
    const finalScore = Math.min(5, Math.max(0, score));
    const strength = this.getStrengthLevel(finalScore);

    return {
      isValid: errors.length === 0,
      score: finalScore,
      strength,
      entropy: Math.round(entropy),
      errors,
      warnings,
      requirements: {
        length: password.length >= PASSWORD_CONFIG.minLength,
        uppercase: hasUppercase,
        lowercase: hasLowercase,
        numbers: hasNumbers,
        specialChars: hasSpecialChars
      }
    };
  }

  /**
   * 计算密码熵值
   */
  calculatePasswordEntropy(password) {
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (//d/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 32;
    if (/[^a-zA-Z0-9!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 32;

    return password.length * Math.log2(charsetSize);
  }

  /**
   * 获取强度等级
   */
  getStrengthLevel(score) {
    const levels = ['很弱', '弱', '一般', '强', '很强'];
    return levels[Math.min(score, levels.length - 1)];
  }

  /**
   * 哈希密码
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, PASSWORD_CONFIG.saltRounds);
    } catch (error) {
      Logger.error('Failed to hash password', error);
      throw new Error('密码加密失败');
    }
  }

  /**
   * 验证密码
   */
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      Logger.error('Failed to verify password', error);
      return false;
    }
  }

  /**
   * 更改密码
   */
  async changePassword(userId, currentPassword, newPassword) {
    const pool = getPool();
    
    try {
      // 获取用户当前密码
      const userResult = await pool.query(
        'SELECT password_hash, email, username FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        
        return { success: false, message: '用户不存在'
      };
      }

      const user = userResult.rows[0];

      // 验证当前密码
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        
        return { success: false, message: '当前密码错误'
      };
      }

      // 验证新密码强度
      const strengthCheck = this.validatePasswordStrength(newPassword, {
        username: user.username,
        email: user.email
      });

      if (!strengthCheck.isValid) {
        
        return {
          success: false,
          message: '新密码不符合安全要求',
          errors: strengthCheck.errors
      };
      }

      // 检查密码历史
      const isReused = await this.checkPasswordHistory(userId, newPassword);
      if (isReused) {
        
        return {
          success: false,
          message: `新密码不能与最近${PASSWORD_CONFIG.preventReuse
      }次使用的密码相同`
        };
      }

      // 哈希新密码
      const newPasswordHash = await this.hashPassword(newPassword);

      // 更新密码
      await pool.query(`
        UPDATE users 
        SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [newPasswordHash, userId]);

      // 保存密码历史
      await this.savePasswordHistory(userId, user.password_hash);

      // 重置登录尝试
      await this.resetLoginAttempts(userId);

      Logger.info('Password changed successfully', { userId });

      return {
        success: true,
        message: '密码修改成功',
        strength: strengthCheck.strength
      };
    } catch (error) {
      Logger.error('Failed to change password', error, { userId });
      throw error;
    }
  }

  /**
   * 检查密码历史
   */
  async checkPasswordHistory(userId, newPassword) {
    const pool = getPool();
    
    try {
      const result = await pool.query(`
        SELECT password_hash FROM password_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, PASSWORD_CONFIG.preventReuse]);

      for (const row of result.rows) {
        const isMatch = await this.verifyPassword(newPassword, row.password_hash);
        if (isMatch) {
          
        return true;
      }
      }

      return false;
    } catch (error) {
      Logger.error('Failed to check password history', error, { userId });
      return false;
    }
  }

  /**
   * 保存密码历史
   */
  async savePasswordHistory(userId, passwordHash) {
    const pool = getPool();
    
    try {
      // 添加新的密码历史记录
      await pool.query(`
        INSERT INTO password_history (user_id, password_hash, created_at)
        VALUES ($1, $2, NOW())
      `, [userId, passwordHash]);

      // 清理超出限制的历史记录
      await pool.query(`
        DELETE FROM password_history 
        WHERE user_id = $1 AND id NOT IN (
          SELECT id FROM password_history 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT $2
        )
      `, [userId, PASSWORD_CONFIG.preventReuse]);
    } catch (error) {
      Logger.error('Failed to save password history', error, { userId });
    }
  }

  /**
   * 记录登录失败
   */
  async recordLoginFailure(userId, ipAddress, userAgent) {
    const pool = getPool();
    
    try {
      // 增加失败次数
      await pool.query(`
        UPDATE users 
        SET login_attempts = COALESCE(login_attempts, 0) + 1,
            last_login_attempt = NOW()
        WHERE id = $1
      `, [userId]);

      // 记录失败日志
      await pool.query(`
        INSERT INTO login_attempts (user_id, ip_address, user_agent, success, created_at)
        VALUES ($1, $2, $3, false, NOW())
      `, [userId, ipAddress, userAgent]);

      // 检查是否需要锁定账户
      const userResult = await pool.query(
        'SELECT login_attempts, locked_until FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length > 0) {
        const { login_attempts, locked_until } = userResult.rows[0];
        
        if (login_attempts >= PASSWORD_CONFIG.maxLoginAttempts) {
          await this.lockAccount(userId, login_attempts);
        }
      }

      Logger.warn('Login failure recorded', { userId, ipAddress, userAgent });
    } catch (error) {
      Logger.error('Failed to record login failure', error, { userId });
    }
  }

  /**
   * 锁定账户
   */
  async lockAccount(userId, attemptCount) {
    const pool = getPool();
    
    try {
      let lockDuration = PASSWORD_CONFIG.lockoutDuration;
      
      // 渐进式锁定
      if (PASSWORD_CONFIG.progressiveLockout) {
        const multiplier = Math.min(attemptCount - PASSWORD_CONFIG.maxLoginAttempts + 1, 10);
        lockDuration *= multiplier;
      }

      const lockedUntil = new Date(Date.now() + lockDuration * 1000);

      await pool.query(`
        UPDATE users 
        SET locked_until = $1, updated_at = NOW()
        WHERE id = $2
      `, [lockedUntil, userId]);

      Logger.warn('Account locked', { 
        userId, 
        attemptCount, 
        lockDuration, 
        lockedUntil 
      });

      // 发送锁定通知邮件
      await this.sendAccountLockNotification(userId, lockedUntil);
    } catch (error) {
      Logger.error('Failed to lock account', error, { userId });
    }
  }

  /**
   * 重置登录尝试
   */
  async resetLoginAttempts(userId) {
    const pool = getPool();
    
    try {
      await pool.query(`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, updated_at = NOW()
        WHERE id = $1
      `, [userId]);
    } catch (error) {
      Logger.error('Failed to reset login attempts', error, { userId });
    }
  }

  /**
   * 检查账户是否被锁定
   */
  async isAccountLocked(userId) {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        'SELECT locked_until FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        
        return false;
      }

      const { locked_until } = result.rows[0];
      
      if (!locked_until) {
        
        return false;
      }

      const now = new Date();
      const lockExpiry = new Date(locked_until);

      if (now >= lockExpiry) {
        
        // 锁定已过期，自动解锁
        await this.resetLoginAttempts(userId);
        return false;
      }

      return {
        locked: true,
        until: lockExpiry,
        remainingTime: Math.ceil((lockExpiry - now) / 1000)
      };
    } catch (error) {
      Logger.error('Failed to check account lock status', error, { userId });
      return false;
    }
  }

  /**
   * 生成密码重置令牌
   */
  async generatePasswordResetToken(email) {
    const pool = getPool();
    
    try {
      // 检查用户是否存在
      const userResult = await pool.query(
        'SELECT id, username FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (userResult.rows.length === 0) {
        
        // 为了安全，即使用户不存在也返回成功
        return { success: true, message: '如果邮箱存在，重置链接已发送'
      };
      }

      const user = userResult.rows[0];
      const token = crypto.randomBytes(PASSWORD_CONFIG.resetTokenLength).toString('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_CONFIG.resetTokenExpiry * 1000);

      // 保存重置令牌
      await pool.query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = NOW(), used_at = NULL
      `, [user.id, token, expiresAt]);

      // 发送重置邮件
      await this.sendPasswordResetEmail(email, user.username, token);

      Logger.info('Password reset token generated', { userId: user.id, email });

      return {
        success: true,
        message: '密码重置链接已发送到您的邮箱'
      };
    } catch (error) {
      Logger.error('Failed to generate password reset token', error, { email });
      throw error;
    }
  }

  /**
   * 验证密码重置令牌
   */
  async validatePasswordResetToken(token) {
    const pool = getPool();
    
    try {
      const result = await pool.query(`
        SELECT prt.user_id, prt.expires_at, u.email, u.username
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()
      `, [token]);

      if (result.rows.length === 0) {
        
        return { valid: false, message: '重置令牌无效或已过期'
      };
      }

      const tokenData = result.rows[0];
      
      return {
        valid: true,
        userId: tokenData.user_id,
        email: tokenData.email,
        username: tokenData.username
      };
    } catch (error) {
      Logger.error('Failed to validate password reset token', error, { token });
      return { valid: false, message: '令牌验证失败' };
    }
  }

  /**
   * 使用重置令牌重置密码
   */
  async resetPasswordWithToken(token, newPassword) {
    const pool = getPool();
    
    try {
      // 验证令牌
      const tokenValidation = await this.validatePasswordResetToken(token);
      if (!tokenValidation.valid) {
        
        return { success: false, message: tokenValidation.message
      };
      }

      const { userId, email, username } = tokenValidation;

      // 验证新密码强度
      const strengthCheck = this.validatePasswordStrength(newPassword, { username, email });
      if (!strengthCheck.isValid) {
        
        return {
          success: false,
          message: '新密码不符合安全要求',
          errors: strengthCheck.errors
      };
      }

      // 检查密码历史
      const isReused = await this.checkPasswordHistory(userId, newPassword);
      if (isReused) {
        
        return {
          success: false,
          message: `新密码不能与最近${PASSWORD_CONFIG.preventReuse
      }次使用的密码相同`
        };
      }

      // 获取当前密码用于历史记录
      const currentPasswordResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      // 哈希新密码
      const newPasswordHash = await this.hashPassword(newPassword);

      // 开始事务
      await pool.query('BEGIN');

      try {
        // 更新密码
        await pool.query(`
          UPDATE users 
          SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [newPasswordHash, userId]);

        // 保存密码历史
        if (currentPasswordResult.rows.length > 0) {
          await this.savePasswordHistory(userId, currentPasswordResult.rows[0].password_hash);
        }

        // 标记令牌为已使用
        await pool.query(`
          UPDATE password_reset_tokens 
          SET used_at = NOW() 
          WHERE token = $1
        `, [token]);

        // 重置登录尝试和解锁账户
        await this.resetLoginAttempts(userId);

        await pool.query('COMMIT');

        Logger.info('Password reset successfully', { userId, email });

        return {
          success: true,
          message: '密码重置成功',
          strength: strengthCheck.strength
        };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      Logger.error('Failed to reset password with token', error, { token });
      throw error;
    }
  }

  /**
   * 检查密码过期
   */
  async checkPasswordExpiry() {
    const pool = getPool();
    
    try {
      // 查找即将过期的密码
      const warningResult = await pool.query(`
        SELECT id, email, username, password_changed_at
        FROM users 
        WHERE is_active = true 
        AND password_changed_at < NOW() - INTERVAL '${PASSWORD_CONFIG.maxAge - PASSWORD_CONFIG.expiryWarningDays} days'
        AND password_changed_at >= NOW() - INTERVAL '${PASSWORD_CONFIG.maxAge} days'
        AND (last_password_warning IS NULL OR last_password_warning < NOW() - INTERVAL '1 day')
      `);

      // 发送过期警告
      for (const user of warningResult.rows) {
        const daysUntilExpiry = PASSWORD_CONFIG.maxAge - Math.floor(
          (Date.now() - new Date(user.password_changed_at)) / (1000 * 60 * 60 * 24)
        );
        
        await this.sendPasswordExpiryWarning(user.email, user.username, daysUntilExpiry);
        
        // 更新警告时间
        await pool.query(
          'UPDATE users SET last_password_warning = NOW() WHERE id = $1',
          [user.id]
        );
      }

      // 查找已过期的密码
      const expiredResult = await pool.query(`
        SELECT id, email, username
        FROM users 
        WHERE is_active = true 
        AND password_changed_at < NOW() - INTERVAL '${PASSWORD_CONFIG.maxAge} days'
        AND password_expired = false
      `);

      // 标记密码为过期
      for (const user of expiredResult.rows) {
        await pool.query(
          'UPDATE users SET password_expired = true WHERE id = $1',
          [user.id]
        );
        
        await this.sendPasswordExpiredNotification(user.email, user.username);
      }

      Logger.info('Password expiry check completed', {
        warningsSent: warningResult.rows.length,
        passwordsExpired: expiredResult.rows.length
      });
    } catch (error) {
      Logger.error('Failed to check password expiry', error);
    }
  }

  /**
   * 发送密码过期警告邮件
   */
  async sendPasswordExpiryWarning(email, username, daysUntilExpiry) {
    try {
      await emailService.sendEmail({
        to: email,
        subject: '密码即将过期提醒',
        template: 'password-expiry-warning',
        data: {
          username,
          daysUntilExpiry,
          changePasswordUrl: `${process.env.FRONTEND_URL}/change-password`
        }
      });
    } catch (error) {
      Logger.error('Failed to send password expiry warning', error, { email });
    }
  }

  /**
   * 发送密码已过期通知
   */
  async sendPasswordExpiredNotification(email, username) {
    try {
      await emailService.sendEmail({
        to: email,
        subject: '密码已过期',
        template: 'password-expired',
        data: {
          username,
          resetPasswordUrl: `${process.env.FRONTEND_URL}/reset-password`
        }
      });
    } catch (error) {
      Logger.error('Failed to send password expired notification', error, { email });
    }
  }

  /**
   * 发送账户锁定通知
   */
  async sendAccountLockNotification(userId, lockedUntil) {
    const pool = getPool();
    
    try {
      const userResult = await pool.query(
        'SELECT email, username FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length > 0) {
        const { email, username } = userResult.rows[0];
        
        await emailService.sendEmail({
          to: email,
          subject: '账户已被锁定',
          template: 'account-locked',
          data: {
            username,
            lockedUntil: lockedUntil.toLocaleString(),
            supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
          }
        });
      }
    } catch (error) {
      Logger.error('Failed to send account lock notification', error, { userId });
    }
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email, username, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      await emailService.sendEmail({
        to: email,
        subject: '密码重置请求',
        template: 'password-reset',
        data: {
          username,
          resetUrl,
          expiryHours: PASSWORD_CONFIG.resetTokenExpiry / 3600
        }
      });
    } catch (error) {
      Logger.error('Failed to send password reset email', error, { email });
    }
  }

  /**
   * 启动密码过期检查定时器
   */
  startPasswordExpiryCheck() {
    if (!PASSWORD_CONFIG.enableExpiryNotifications) return;

    // 每天检查一次
    this.expiryCheckTimer = setInterval(() => {
      this.checkPasswordExpiry();
    }, 24 * 60 * 60 * 1000);

    // 启动时立即检查一次
    this.checkPasswordExpiry();
  }

  /**
   * 停止密码过期检查定时器
   */
  stopPasswordExpiryCheck() {
    if (this.expiryCheckTimer) {
      clearInterval(this.expiryCheckTimer);
      this.expiryCheckTimer = null;
    }
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.stopPasswordExpiryCheck();
  }
}

// ==================== 数据库表创建 ====================

const createPasswordSecurityTables = async () => {
  const pool = getPool();
  
  try {
    // 密码历史表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);
    `);

    // 密码重置令牌表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
    `);

    // 登录尝试表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
    `);

    // 为users表添加密码安全相关字段
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_login_attempt TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS password_expired BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_password_warning TIMESTAMP WITH TIME ZONE;
    `);
    
    Logger.info('Password security tables created/verified');
  } catch (error) {
    Logger.error('Failed to create password security tables', error);
    throw error;
  }
};

// ==================== 导出 ====================

const passwordSecurityService = new PasswordSecurityService();

module.exports = {
  PasswordSecurityService,
  passwordSecurityService,
  createPasswordSecurityTables,
  PASSWORD_CONFIG
};
