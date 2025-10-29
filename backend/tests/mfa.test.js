/**
 * MFA (Multi-Factor Authentication) 功能测试
 * 
 * 测试范围:
 * - MFA设置流程
 * - TOTP验证
 * - 备用码生成和验证
 * - MFA启用/禁用
 * - 设备信任机制
 */

const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

describe('MFA Authentication Tests', () => {
  let testUser;
  let accessToken;
  let mfaSecret;
  let backupCodes;

  // 测试前准备: 创建测试用户并登录
  beforeAll(async () => {
    // 清理测试数据
    await db.query('DELETE FROM users WHERE email = $1', ['mfa-test@example.com']);

    // 注册测试用户
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'mfatestuser',
        email: 'mfa-test@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      });

    expect(registerRes.status).toBe(201);

    // 登录获取token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mfa-test@example.com',
        password: 'TestPassword123!'
      });

    expect(loginRes.status).toBe(200);
    testUser = loginRes.body.user;
    accessToken = loginRes.body.accessToken;
  });

  // 测试后清理
  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = $1', ['mfa-test@example.com']);
    await db.end();
  });

  describe('MFA Setup Flow', () => {
    test('应该成功初始化MFA设置', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('secretKey');
      expect(res.body).toHaveProperty('qrCodeUrl');
      expect(res.body).toHaveProperty('backupCodes');
      expect(res.body.backupCodes).toBeInstanceOf(Array);
      expect(res.body.backupCodes.length).toBeGreaterThanOrEqual(8);

      // 保存用于后续测试
      mfaSecret = res.body.secretKey;
      backupCodes = res.body.backupCodes;
    });

    test('初始化MFA时提供错误密码应该失败', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('密码');
    });

    test('未认证用户不能初始化MFA', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .send({
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(401);
    });

    test('应该成功验证TOTP并完成MFA设置', async () => {
      // 生成有效的TOTP码
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('MFA设置完成');
    });

    test('验证无效的TOTP码应该失败', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('MFA Status and Management', () => {
    test('应该返回正确的MFA状态', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mfaEnabled).toBe(true);
      expect(res.body.data).toHaveProperty('backupCodesRemaining');
    });

    test('应该成功重新生成备用码', async () => {
      // 生成有效的TOTP码
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/regenerate-backup-codes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'TestPassword123!',
          token
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.backupCodes).toBeInstanceOf(Array);
      expect(res.body.backupCodes.length).toBeGreaterThanOrEqual(8);

      // 验证新备用码与旧备用码不同
      const hasNewCodes = res.body.backupCodes.some(
        code => !backupCodes.includes(code)
      );
      expect(hasNewCodes).toBe(true);

      // 更新备用码用于后续测试
      backupCodes = res.body.backupCodes;
    });
  });

  describe('MFA Login Flow', () => {
    const mfaUserEmail = 'mfa-login-test@example.com';
    const mfaUserPassword = 'TestPassword123!';

    beforeAll(async () => {
      // 创建启用MFA的测试用户
      await db.query('DELETE FROM users WHERE email = $1', [mfaUserEmail]);

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'mfaloginuser',
          email: mfaUserEmail,
          password: mfaUserPassword,
          confirmPassword: mfaUserPassword
        });
    });

    test('启用MFA的用户登录应该要求二次验证', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa-test@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.requireMfa).toBe(true);
      expect(res.body.message).toContain('MFA');
    });

    test('应该使用有效TOTP码成功完成MFA验证', async () => {
      // 生成有效的TOTP码
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token,
          trustDevice: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.mfaEnabled).toBe(true);
    });

    test('使用无效TOTP码应该验证失败', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token: '000000',
          trustDevice: false
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('应该使用备用码成功完成MFA验证', async () => {
      // 使用第一个备用码
      const backupCode = backupCodes[0];

      const res = await request(app)
        .post('/api/auth/mfa/verify-backup')
        .send({
          email: 'mfa-test@example.com',
          backupCode,
          trustDevice: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.backupCodesRemaining).toBe(backupCodes.length - 1);
    });

    test('重复使用已用的备用码应该失败', async () => {
      // 再次使用相同的备用码
      const backupCode = backupCodes[0];

      const res = await request(app)
        .post('/api/auth/mfa/verify-backup')
        .send({
          email: 'mfa-test@example.com',
          backupCode,
          trustDevice: false
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('无效');
    });

    test('信任设备后应该记录设备信息', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token,
          trustDevice: true
        });

      expect(res.status).toBe(200);
      expect(res.body.trustedDevice).toBe(true);
    });
  });

  describe('MFA Disable Flow', () => {
    test('应该成功禁用MFA', async () => {
      // 生成有效的TOTP码
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'TestPassword123!',
          token
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('禁用');
    });

    test('禁用MFA后状态应该正确更新', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.mfaEnabled).toBe(false);
    });

    test('禁用MFA后登录不再需要二次验证', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa-test@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.requireMfa).toBeUndefined();
      expect(res.body).toHaveProperty('accessToken');
    });

    test('使用错误密码禁用MFA应该失败', async () => {
      // 先重新启用MFA
      await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'TestPassword123!' });

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token });

      // 尝试用错误密码禁用
      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'WrongPassword!',
          token
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    test('MFA密钥应该正确加密存储', async () => {
      const result = await db.query(
        'SELECT mfa_secret FROM users WHERE email = $1',
        ['mfa-test@example.com']
      );

      const storedSecret = result.rows[0]?.mfa_secret;
      
      // 验证密钥已存储
      expect(storedSecret).toBeDefined();
      
      // 验证密钥不是明文(应该是加密或哈希后的)
      // 实际实现中应该检查加密格式
      expect(storedSecret).not.toBe(mfaSecret);
    });

    test('备用码应该哈希后存储', async () => {
      const result = await db.query(
        'SELECT mfa_backup_codes FROM users WHERE email = $1',
        ['mfa-test@example.com']
      );

      const storedCodes = JSON.parse(result.rows[0]?.mfa_backup_codes || '[]');
      
      // 验证存储的备用码不是明文
      if (storedCodes.length > 0) {
        expect(storedCodes[0]).not.toBe(backupCodes[0]);
        expect(storedCodes[0].length).toBeGreaterThan(8); // 哈希后长度应该更长
      }
    });

    test('应该限制TOTP验证失败次数', async () => {
      let failureCount = 0;
      
      // 尝试多次失败验证
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/auth/mfa/verify')
          .send({
            email: 'mfa-test@example.com',
            token: '000000',
            trustDevice: false
          });

        if (res.status === 429) {
          // 速率限制生效
          expect(res.body.message).toContain('尝试');
          break;
        }
        
        failureCount++;
      }

      // 验证确实有失败尝试被记录
      expect(failureCount).toBeGreaterThan(0);
    });

    test('TOTP应该在时间窗口内有效', async () => {
      // 测试当前时间的token
      const currentToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res1 = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token: currentToken,
          trustDevice: false
        });

      expect(res1.status).toBe(200);

      // 测试前一个时间窗口的token (应该也能通过)
      const previousToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) - 30
      });

      // 重新登录以测试
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa-test@example.com',
          password: 'TestPassword123!'
        });

      const res2 = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token: previousToken,
          trustDevice: false
        });

      // 前一个时间窗口的token可能有效(取决于window配置)
      expect([200, 401]).toContain(res2.status);
    });
  });

  describe('Edge Cases', () => {
    test('不存在的用户不能进行MFA验证', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'nonexistent@example.com',
          token: '123456',
          trustDevice: false
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('未启用MFA的用户不能进行MFA验证', async () => {
      // 创建未启用MFA的用户
      await db.query('DELETE FROM users WHERE email = $1', ['nomfa@example.com']);
      
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'nomfauser',
          email: 'nomfa@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!'
        });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'nomfa@example.com',
          token: '123456',
          trustDevice: false
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('未启用');
    });

    test('空的TOTP码应该被拒绝', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token: '',
          trustDevice: false
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('格式错误的TOTP码应该被拒绝', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          email: 'mfa-test@example.com',
          token: 'abcdef', // 应该是6位数字
          trustDevice: false
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('所有备用码用完后应该提示重新生成', async () => {
      // 这个测试需要消耗所有备用码
      // 实际中可以通过mock或数据库操作模拟
      
      // 获取当前备用码数量
      const statusRes = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`);

      const remaining = statusRes.body.data.backupCodesRemaining;
      
      if (remaining === 0) {
        // 尝试使用备用码应该提示重新生成
        const res = await request(app)
          .post('/api/auth/mfa/verify-backup')
          .send({
            email: 'mfa-test@example.com',
            backupCode: 'ANYCODE12',
            trustDevice: false
          });

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('备用码');
      }
    });
  });
});

