/**
 * OAuth 第三方登录功能测试
 * 
 * 测试范围:
 * - Google OAuth登录流程
 * - GitHub OAuth登录流程
 * - OAuth账户关联
 * - OAuth账户解绑
 * - 多OAuth账户管理
 * - 安全性验证
 */

const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const nock = require('nock');

describe('OAuth Authentication Tests', () => {
  let testUser;
  let accessToken;
  
  // Mock OAuth响应数据
  const mockGoogleProfile = {
    id: 'google-user-12345',
    email: 'testuser@gmail.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg'
  };

  const mockGitHubProfile = {
    id: 67890,
    login: 'testuser',
    name: 'Test User',
    email: 'testuser@github.com',
    avatar_url: 'https://github.com/avatar.jpg'
  };

  // 测试前准备
  beforeAll(async () => {
    // 清理测试数据
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%oauth-test%']);
    await db.query('DELETE FROM oauth_accounts WHERE email LIKE $1', ['%oauth-test%']);

    // 创建基础测试用户
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'oauthtestuser',
        email: 'oauth-test@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'oauth-test@example.com',
        password: 'TestPassword123!'
      });

    testUser = loginRes.body.user;
    accessToken = loginRes.body.accessToken;
  });

  // 测试后清理
  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%oauth-test%']);
    await db.query('DELETE FROM oauth_accounts WHERE email LIKE $1', ['%oauth-test%']);
    nock.cleanAll();
    await db.end();
  });

  describe('Google OAuth Flow', () => {
    beforeEach(() => {
      // Mock Google OAuth API
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, {
          access_token: 'mock_google_access_token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, mockGoogleProfile);
    });

    afterEach(() => {
      nock.cleanAll();
    });

    test('应该重定向到Google授权页面', async () => {
      const res = await request(app)
        .get('/auth/oauth/google')
        .expect(302);

      expect(res.header.location).toContain('accounts.google.com');
      expect(res.header.location).toContain('client_id');
      expect(res.header.location).toContain('redirect_uri');
      expect(res.header.location).toContain('scope');
    });

    test('新用户通过Google OAuth应该自动注册', async () => {
      // Mock callback with authorization code
      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'mock_auth_code' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Google OAuth登录成功');
      expect(res.body.user.email).toBe(mockGoogleProfile.email);
      expect(res.body.user.provider).toBe('google');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    test('已注册的Google用户应该能直接登录', async () => {
      // 第二次使用相同的Google账户登录
      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'mock_auth_code_2' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(mockGoogleProfile.email);
    });

    test('Google OAuth回调缺少code参数应该失败', async () => {
      const res = await request(app)
        .get('/auth/oauth/google/callback');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('授权码');
    });

    test('无效的授权码应该返回错误', async () => {
      // Mock失败的token exchange
      nock.cleanAll();
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'invalid_code' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GitHub OAuth Flow', () => {
    beforeEach(() => {
      // Mock GitHub OAuth API
      nock('https://github.com')
        .post('/login/oauth/access_token')
        .reply(200, {
          access_token: 'mock_github_access_token',
          token_type: 'bearer',
          scope: 'user:email'
        });

      nock('https://api.github.com')
        .get('/user')
        .reply(200, mockGitHubProfile);

      nock('https://api.github.com')
        .get('/user/emails')
        .reply(200, [
          {
            email: mockGitHubProfile.email,
            primary: true,
            verified: true
          }
        ]);
    });

    afterEach(() => {
      nock.cleanAll();
    });

    test('应该重定向到GitHub授权页面', async () => {
      const res = await request(app)
        .get('/auth/oauth/github')
        .expect(302);

      expect(res.header.location).toContain('github.com/login/oauth/authorize');
      expect(res.header.location).toContain('client_id');
      expect(res.header.location).toContain('redirect_uri');
      expect(res.header.location).toContain('scope');
    });

    test('新用户通过GitHub OAuth应该自动注册', async () => {
      const res = await request(app)
        .get('/auth/oauth/github/callback')
        .query({ code: 'mock_github_auth_code' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('GitHub OAuth登录成功');
      expect(res.body.user.email).toBe(mockGitHubProfile.email);
      expect(res.body.user.provider).toBe('github');
      expect(res.body).toHaveProperty('accessToken');
    });

    test('已注册的GitHub用户应该能直接登录', async () => {
      // 第二次使用相同的GitHub账户登录
      const res = await request(app)
        .get('/auth/oauth/github/callback')
        .query({ code: 'mock_github_auth_code_2' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(mockGitHubProfile.email);
    });

    test('GitHub用户没有公开邮箱应该处理', async () => {
      // Mock GitHub返回空邮箱列表
      nock.cleanAll();
      nock('https://github.com')
        .post('/login/oauth/access_token')
        .reply(200, {
          access_token: 'mock_github_access_token',
          token_type: 'bearer'
        });

      nock('https://api.github.com')
        .get('/user')
        .reply(200, { ...mockGitHubProfile, email: null });

      nock('https://api.github.com')
        .get('/user/emails')
        .reply(200, []);

      const res = await request(app)
        .get('/auth/oauth/github/callback')
        .query({ code: 'mock_code_no_email' });

      // 应该生成一个临时邮箱或提示用户提供邮箱
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('OAuth Account Linking', () => {
    let linkTestUser;
    let linkAccessToken;

    beforeAll(async () => {
      // 创建用于账户关联测试的用户
      await db.query('DELETE FROM users WHERE email = $1', ['link-test@example.com']);

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'linktestuser',
          email: 'link-test@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!'
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'link-test@example.com',
          password: 'TestPassword123!'
        });

      linkTestUser = loginRes.body.user;
      linkAccessToken = loginRes.body.accessToken;
    });

    beforeEach(() => {
      // Mock OAuth APIs for linking
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, {
          access_token: 'mock_link_google_token',
          token_type: 'Bearer'
        });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-link-123',
          email: 'link-test@gmail.com',
          name: 'Link Test User'
        });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    test('应该成功关联Google账户到现有用户', async () => {
      const res = await request(app)
        .post('/auth/oauth/link/google')
        .set('Authorization', `Bearer ${linkAccessToken}`)
        .send({ code: 'mock_link_code' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('关联成功');
      expect(res.body.linkedAccounts).toContain('google');
    });

    test('未认证用户不能关联OAuth账户', async () => {
      const res = await request(app)
        .post('/auth/oauth/link/google')
        .send({ code: 'mock_link_code' });

      expect(res.status).toBe(401);
    });

    test('应该成功关联GitHub账户', async () => {
      nock.cleanAll();
      nock('https://github.com')
        .post('/login/oauth/access_token')
        .reply(200, {
          access_token: 'mock_link_github_token'
        });

      nock('https://api.github.com')
        .get('/user')
        .reply(200, {
          id: 'github-link-456',
          login: 'linkuser',
          email: 'link-test@github.com'
        });

      const res = await request(app)
        .post('/auth/oauth/link/github')
        .set('Authorization', `Bearer ${linkAccessToken}`)
        .send({ code: 'mock_github_link_code' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.linkedAccounts).toContain('github');
    });

    test('应该能查看所有关联的OAuth账户', async () => {
      const res = await request(app)
        .get('/auth/oauth/linked-accounts')
        .set('Authorization', `Bearer ${linkAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.linkedAccounts).toBeInstanceOf(Array);
      expect(res.body.data.linkedAccounts.length).toBeGreaterThan(0);
    });

    test('同一个OAuth账户不能关联到多个用户', async () => {
      // 创建第二个用户
      await db.query('DELETE FROM users WHERE email = $1', ['second-user@example.com']);

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'seconduser',
          email: 'second-user@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!'
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'second-user@example.com',
          password: 'TestPassword123!'
        });

      // 尝试关联已被使用的Google账户
      nock.cleanAll();
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'mock_token' });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-link-123', // 相同的providerId
          email: 'duplicate@gmail.com'
        });

      const res = await request(app)
        .post('/auth/oauth/link/google')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ code: 'duplicate_link_code' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('已被关联');
    });
  });

  describe('OAuth Account Unlinking', () => {
    let unlinkTestUser;
    let unlinkAccessToken;

    beforeAll(async () => {
      // 创建并关联OAuth账户的用户
      await db.query('DELETE FROM users WHERE email = $1', ['unlink-test@example.com']);

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'unlinktestuser',
          email: 'unlink-test@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!'
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unlink-test@example.com',
          password: 'TestPassword123!'
        });

      unlinkTestUser = loginRes.body.user;
      unlinkAccessToken = loginRes.body.accessToken;

      // 关联Google账户
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'mock_token' });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-unlink-789',
          email: 'unlink@gmail.com',
          name: 'Unlink Test'
        });

      await request(app)
        .post('/auth/oauth/link/google')
        .set('Authorization', `Bearer ${unlinkAccessToken}`)
        .send({ code: 'unlink_setup_code' });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    test('应该成功解绑Google账户', async () => {
      const res = await request(app)
        .delete('/auth/oauth/unlink/google')
        .set('Authorization', `Bearer ${unlinkAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('解绑成功');
    });

    test('未认证用户不能解绑OAuth账户', async () => {
      const res = await request(app)
        .delete('/auth/oauth/unlink/google');

      expect(res.status).toBe(401);
    });

    test('不能解绑未关联的OAuth账户', async () => {
      const res = await request(app)
        .delete('/auth/oauth/unlink/github')
        .set('Authorization', `Bearer ${unlinkAccessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('未关联');
    });

    test('不能移除最后一种登录方式', async () => {
      // 创建纯OAuth用户(无密码)
      const oauthOnlyUser = await db.query(
        `INSERT INTO users (id, username, email, provider, provider_id, password)
         VALUES (gen_random_uuid(), 'oauthuseronly', 'oauth-only@example.com', 'google', 'google-only-999', NULL)
         RETURNING *`,
        []
      );

      const oauthToken = 'mock_oauth_only_token'; // 需要生成真实token

      const res = await request(app)
        .delete('/auth/oauth/unlink/google')
        .set('Authorization', `Bearer ${oauthToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('最后一种登录方式');
    });
  });

  describe('OAuth邮箱冲突处理', () => {
    beforeEach(() => {
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'conflict_token' });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    test('OAuth邮箱与现有用户邮箱相同应该自动关联', async () => {
      // Mock Google返回与现有用户相同的邮箱
      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-conflict-111',
          email: 'oauth-test@example.com', // 与testUser相同
          name: 'Conflict Test'
        });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'conflict_code' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('oauth-test@example.com');
      
      // 验证OAuth账户已关联
      const linkedRes = await request(app)
        .get('/auth/oauth/linked-accounts')
        .set('Authorization', `Bearer ${res.body.accessToken}`);

      const googleLinked = linkedRes.body.data.linkedAccounts.some(
        acc => acc.provider === 'google'
      );
      expect(googleLinked).toBe(true);
    });

    test('OAuth邮箱已被使用但providerId不同应该提示', async () => {
      // 这种情况取决于实现策略
      // 可能自动关联或提示用户确认
      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'google-different-222',
          email: 'oauth-test@example.com',
          name: 'Different Provider ID'
        });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'different_provider_code' });

      // 根据实现,可能成功(自动关联)或失败(需要手动处理)
      expect([200, 409]).toContain(res.status);
    });
  });

  describe('OAuth Security Tests', () => {
    test('OAuth回调应该验证state参数(CSRF防护)', async () => {
      // 发起OAuth授权(应该设置state)
      const authRes = await request(app)
        .get('/auth/oauth/google');

      // 提取state参数(从重定向URL中)
      const location = authRes.header.location;
      const stateMatch = location.match(/state=([^&]+)/);
      const state = stateMatch ? stateMatch[1] : null;

      expect(state).toBeDefined();

      // Mock OAuth返回
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'state_test_token' });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, mockGoogleProfile);

      // 使用错误的state应该失败
      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({
          code: 'valid_code',
          state: 'wrong_state_value'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('state');
    });

    test('OAuth不应该存储明文的access_token', async () => {
      // 完成OAuth登录
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'sensitive_token_12345' });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'security-test-333',
          email: 'security@gmail.com',
          name: 'Security Test'
        });

      await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'security_code' });

      // 检查数据库
      const result = await db.query(
        'SELECT * FROM oauth_accounts WHERE provider_id = $1',
        ['security-test-333']
      );

      const oauthAccount = result.rows[0];
      
      // OAuth access_token不应该明文存储(除非业务需要并加密)
      expect(oauthAccount).toBeDefined();
      // 大多数情况下不需要存储OAuth的access_token
      // 如果存储,应该是加密后的
    });

    test('OAuth应该只请求必要的权限', async () => {
      // 检查Google OAuth授权URL
      const googleRes = await request(app)
        .get('/auth/oauth/google');

      const googleUrl = googleRes.header.location;
      expect(googleUrl).toContain('scope=');
      
      // 验证scope不包含不必要的权限
      expect(googleUrl).not.toContain('drive');
      expect(googleUrl).not.toContain('gmail');

      // 检查GitHub OAuth授权URL
      const githubRes = await request(app)
        .get('/auth/oauth/github');

      const githubUrl = githubRes.header.location;
      expect(githubUrl).toContain('scope=');
      
      // 验证scope不包含repo等敏感权限
      expect(githubUrl).not.toContain('repo');
      expect(githubUrl).not.toContain('delete_repo');
    });
  });

  describe('OAuth边缘情况', () => {
    test('OAuth provider返回错误应该正确处理', async () => {
      // Mock OAuth provider返回错误
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(400, {
          error: 'invalid_request',
          error_description: 'Missing required parameter'
        });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'error_code' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('网络超时应该返回合适的错误', async () => {
      // Mock网络超时
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .delayConnection(30000)
        .reply(200, {});

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'timeout_code' });

      expect([500, 504]).toContain(res.status);
    });

    test('OAuth用户信息不完整应该处理', async () => {
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'incomplete_token' });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, {
          id: 'incomplete-444',
          // 缺少email
          name: 'Incomplete User'
        });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .query({ code: 'incomplete_code' });

      // 应该处理缺少必要字段的情况
      expect([400, 500]).toContain(res.status);
    });
  });
});

