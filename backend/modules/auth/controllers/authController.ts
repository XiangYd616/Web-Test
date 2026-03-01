/**
 * 认证控制器
 * 职责: 处理注册、登录、登出、令牌刷新、邮箱验证等业务逻辑
 * 从 auth/routes/auth.ts 中提取
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { isValidEmail } from '../../../../shared/utils/string.utils';
import { query, transaction } from '../../config/database';
import JwtService from '../../core/services/jwtService';
import { mfaService } from '../../core/services/mfaService';
import { sendEmail } from '../../email/services/emailService';
import { securityLogger } from '../../middleware/logger';
import type { ApiResponse, AuthenticatedRequest as BaseAuthenticatedRequest } from '../../types';
import { logSecurityEvent, SecurityEventType } from '../../utils/securityLogger';
import { SessionManager } from '../services/sessionManager';

// ==================== 类型定义 ====================

type AuthenticatedRequest = BaseAuthenticatedRequest & {
  user?: BaseAuthenticatedRequest['user'] & {
    twoFactorEnabled?: boolean;
    emailVerified?: boolean;
    createdAt?: Date | string;
    lastLogin?: Date | string;
  };
};

// ==================== 内部工具函数 ====================

const jwtService = new JwtService();
const sessionManager = new SessionManager();

const parseRegionList = (value?: string) =>
  (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const normalizeRegion = (region?: string | null) => (region || '').trim().toLowerCase();

const isRegionAllowed = (region?: string | null) => {
  const allowList = parseRegionList(process.env.ALLOWED_LOGIN_REGIONS);
  const denyList = parseRegionList(process.env.BLOCKED_LOGIN_REGIONS);
  const normalized = normalizeRegion(region);
  if (denyList.length && denyList.includes(normalized)) return false;
  if (allowList.length) return allowList.includes(normalized);
  return true;
};

const getConfigValue = async <T>(key: string, fallback: T): Promise<T> => {
  const result = await query(
    'SELECT config_value FROM system_configs WHERE config_key = $1 LIMIT 1',
    [key]
  );
  const row = result.rows[0] as { config_value?: unknown } | undefined;
  if (!row?.config_value) return fallback;
  try {
    const parsed =
      typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value;
    return (parsed as { value?: T }).value ?? fallback;
  } catch {
    return fallback;
  }
};

const getUser = (req: AuthenticatedRequest): NonNullable<AuthenticatedRequest['user']> => {
  const user = req.user;
  if (!user) throw new Error('用户未认证');
  return user;
};

// ==================== 控制器方法 ====================

const resendVerification = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) return res.error(StandardErrorCode.INVALID_INPUT, '邮箱不能为空', undefined, 400);

    const userResult = await query(
      'SELECT id, username, email_verified FROM users WHERE email = $1',
      [email]
    );
    const user = userResult.rows[0] as
      | { id?: string; username?: string; email_verified?: boolean }
      | undefined;
    if (!user?.id) return res.error(StandardErrorCode.NOT_FOUND, '用户不存在', undefined, 404);
    if (user.email_verified)
      return res.error(StandardErrorCode.INVALID_INPUT, '邮箱已验证，无需重复发送', undefined, 400);

    const emailVerificationRequired = await getConfigValue('email_verification_required', false);
    if (!emailVerificationRequired)
      return res.error(StandardErrorCode.INVALID_INPUT, '当前未开启邮箱验证', undefined, 400);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiryHours = Number(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS || 24);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used_at = NULL`,
      [user.id, verificationToken, expiresAt]
    );

    const verifyUrl = `${process.env.FRONTEND_URL || 'https://app.xiangweb.space'}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: email,
      subject: '请验证您的邮箱',
      template: 'email-verification',
      data: { username: user.username || '用户', verificationUrl: verifyUrl },
    });

    return res.success({ sent: true }, '验证邮件已发送');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '发送验证邮件失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const verifyEmail = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token)
      return res.error(StandardErrorCode.INVALID_INPUT, '验证令牌不能为空', undefined, 400);

    const result = await query(
      `SELECT user_id, expires_at, used_at FROM email_verification_tokens WHERE token = $1`,
      [token]
    );
    const row = result.rows[0] as
      | { user_id?: string; expires_at?: Date; used_at?: Date }
      | undefined;
    if (!row?.user_id)
      return res.error(StandardErrorCode.INVALID_INPUT, '验证令牌无效', undefined, 400);
    if (row.used_at)
      return res.error(StandardErrorCode.INVALID_INPUT, '验证令牌已使用', undefined, 400);
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
      return res.error(StandardErrorCode.INVALID_INPUT, '验证令牌已过期', undefined, 400);

    await query(
      'UPDATE users SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [row.user_id]
    );
    await query(
      'UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );

    return res.success({ verified: true }, '邮箱验证成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '邮箱验证失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const register = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const registrationEnabled = await getConfigValue('enable_user_registration', true);
    if (!registrationEnabled)
      return res.error(StandardErrorCode.OPERATION_NOT_ALLOWED, '当前未开放注册', undefined, 403);

    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        '用户名、邮箱和密码都是必填项',
        undefined,
        400
      );

    if (typeof password === 'string' && password.length < 8)
      return res.error(StandardErrorCode.INVALID_INPUT, '密码至少 8 个字符', undefined, 400);

    const existingUser = await query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0] as { username?: string; email?: string };
      const msg =
        existing.username === username && existing.email === email
          ? '用户名和邮箱均已被注册'
          : existing.username === username
            ? '用户名已被使用，请换一个'
            : '该邮箱已被注册';
      return res.error(StandardErrorCode.CONFLICT, msg, undefined, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const emailVerificationRequired = await getConfigValue('email_verification_required', false);

    // 使用事务确保注册流程原子性：用户创建 + token 插入要么全部成功，要么全部回滚
    const { userId, verificationToken } = await transaction(async client => {
      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, role, email_verified, email_verified_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING id`,
        [
          username,
          email,
          hashedPassword,
          'user',
          emailVerificationRequired ? false : true,
          emailVerificationRequired ? null : new Date(),
        ]
      );

      const uid = (result as { rows: Array<{ id?: string }> }).rows[0]?.id;
      if (!uid) throw new Error('创建用户失败');

      let vToken: string | null = null;
      if (emailVerificationRequired) {
        vToken = crypto.randomBytes(32).toString('hex');
        const expiryHours = Number(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS || 24);
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used_at = NULL`,
          [uid, vToken, expiresAt]
        );
      }

      return { userId: uid, verificationToken: vToken };
    });

    securityLogger('USER_REGISTERED', {
      userId,
      username,
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // 邮箱验证模式：发送验证邮件，不返回登录 token（阻止绕过验证）
    if (emailVerificationRequired && verificationToken) {
      const verifyUrl = `${process.env.FRONTEND_URL || 'https://app.xiangweb.space'}/verify-email?token=${verificationToken}`;
      try {
        await sendEmail({
          to: email,
          subject: '请验证您的邮箱 — Test-Web',
          template: 'email-verification',
          data: { username, verificationUrl: verifyUrl },
        });
      } catch (emailErr) {
        console.error('[Register] 验证邮件发送失败:', emailErr);
      }
      return res.success(
        {
          user: { id: userId, username, email, role: 'user' },
          emailVerificationRequired: true,
          verificationSent: true,
        },
        '注册成功，请查收验证邮件',
        201
      );
    }

    // 无需邮箱验证：直接签发登录 token
    const tokens = await jwtService.generateTokenPair(userId, { username, role: 'user' });
    await sessionManager.createSession(
      userId,
      { userAgent: req.get('User-Agent') || '' },
      String(req.ip ?? ''),
      req.get('User-Agent') || ''
    );

    return res.success(
      {
        user: { id: userId, username, email, role: 'user' },
        tokens,
        emailVerificationRequired: false,
        verificationSent: false,
      },
      '注册成功',
      201
    );
  } catch (error) {
    securityLogger(
      'USER_REGISTER_FAILED',
      { error: error instanceof Error ? error.message : String(error), body: req.body },
      req as unknown as Parameters<typeof securityLogger>[2]
    );
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '注册失败，请稍后重试',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const login = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.error(StandardErrorCode.INVALID_INPUT, '用户名和密码都是必填项', undefined, 400);
    if (String(username).includes('@') && !isValidEmail(String(username)))
      return res.error(StandardErrorCode.INVALID_INPUT, '邮箱格式无效', undefined, 400);

    const users = await query(
      `SELECT id, username, email, password_hash, role, two_factor_enabled, email_verified FROM users WHERE username = $1 OR email = $2`,
      [username, username]
    );
    if (users.rows.length === 0)
      return res.error(StandardErrorCode.UNAUTHORIZED, '用户名或密码错误', undefined, 401);

    const user = users.rows[0] as {
      id: string;
      username: string;
      email: string;
      password_hash: string;
      role: string;
      two_factor_enabled?: boolean;
      status?: string;
      email_verified?: boolean;
    };

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      securityLogger(
        'LOGIN_FAILED',
        { userId: user.id, username: user.username, ip: req.ip, userAgent: req.get('User-Agent') },
        req as unknown as Parameters<typeof securityLogger>[2]
      );
      return res.error(StandardErrorCode.UNAUTHORIZED, '用户名或密码错误', undefined, 401);
    }

    if (user.status === 'locked')
      return res.error(
        StandardErrorCode.OPERATION_NOT_ALLOWED,
        '账户已被锁定，请联系管理员',
        undefined,
        423
      );

    const emailVerificationRequired = await getConfigValue('email_verification_required', false);
    if (emailVerificationRequired && !user.email_verified)
      return res.error(
        StandardErrorCode.OPERATION_NOT_ALLOWED,
        '邮箱未验证，请先完成邮箱验证',
        { emailVerified: false },
        403
      );

    const ipAddress = String(req.ip ?? '');
    const userAgent = req.get('User-Agent') || '';
    let currentLocation = null as { region?: string; country?: string } | null;
    if (process.env.ENABLE_LOCATION_TRACKING === 'true') {
      currentLocation = await sessionManager.getLocationFromIP(ipAddress);
      if (!isRegionAllowed(currentLocation?.region || currentLocation?.country)) {
        securityLogger(
          'LOGIN_BLOCKED_REGION',
          {
            userId: user.id,
            region: currentLocation?.region,
            country: currentLocation?.country,
            ip: ipAddress,
          },
          req as unknown as Parameters<typeof securityLogger>[2]
        );
        await logSecurityEvent({
          type: SecurityEventType.LOGIN_BLOCKED_REGION,
          userId: user.id,
          ipAddress,
          userAgent,
          success: false,
          timestamp: new Date(),
          metadata: { region: currentLocation?.region, country: currentLocation?.country },
        });
        return res.error(
          StandardErrorCode.OPERATION_NOT_ALLOWED,
          '当前地区禁止登录',
          undefined,
          403
        );
      }
    }

    const riskWindowHours = Number(process.env.LOGIN_RISK_WINDOW_HOURS || 6);
    const riskWindow = Number.isNaN(riskWindowHours) || riskWindowHours <= 0 ? 6 : riskWindowHours;
    const recentLocation = await sessionManager.getRecentSessionLocation(user.id, riskWindow);
    const previousRegion = normalizeRegion(
      recentLocation?.location?.region || recentLocation?.location?.country
    );
    const currentRegion = normalizeRegion(currentLocation?.region || currentLocation?.country);
    const suspiciousLogin = Boolean(
      previousRegion && currentRegion && previousRegion !== currentRegion
    );

    if (suspiciousLogin) {
      securityLogger(
        'LOGIN_REGION_ANOMALY',
        { userId: user.id, previousRegion, currentRegion, ip: ipAddress, userAgent },
        req as unknown as Parameters<typeof securityLogger>[2]
      );
      await logSecurityEvent({
        type: SecurityEventType.LOGIN_REGION_ANOMALY,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        timestamp: new Date(),
        metadata: { previousRegion, currentRegion },
      });
    }

    let mfaChallenge: { challengeId?: string; maskedEmail?: string; expiresIn?: number } | null =
      null;
    const riskMfaEnabled = process.env.RISK_MFA_ENABLED === 'true';
    if (suspiciousLogin && riskMfaEnabled && user.email) {
      const challenge = await mfaService.sendEmailChallenge(user.id, user.email);
      mfaChallenge = {
        challengeId: challenge.challengeId,
        maskedEmail: challenge.maskedEmail,
        expiresIn: challenge.expiresIn,
      };
      await logSecurityEvent({
        type: SecurityEventType.LOGIN_RISK_MFA_REQUIRED,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        timestamp: new Date(),
        metadata: { challengeId: challenge.challengeId, previousRegion, currentRegion },
      });
      return res.error(
        StandardErrorCode.OPERATION_NOT_ALLOWED,
        '检测到异地登录，请完成二次验证',
        { mfaRequired: true, ...mfaChallenge },
        403
      );
    }

    const tokens = await jwtService.generateTokenPair(user.id, {
      username: user.username,
      role: user.role,
    });
    await sessionManager.createSession(user.id, { userAgent }, ipAddress, userAgent);
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    securityLogger(
      'LOGIN_SUCCESS',
      {
        userId: user.id,
        username: user.username,
        ip: ipAddress,
        userAgent,
        region: currentRegion || null,
        country: currentLocation?.country || null,
      },
      req as unknown as Parameters<typeof securityLogger>[2]
    );

    return res.success(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          twoFactorEnabled: user.two_factor_enabled,
        },
        tokens,
        risk: {
          suspiciousLogin,
          mfaChallenge,
          previousRegion: previousRegion || null,
          currentRegion: currentRegion || null,
        },
      },
      '登录成功'
    );
  } catch (error) {
    securityLogger(
      'LOGIN_FAILED_INTERNAL',
      { error: error instanceof Error ? error.message : String(error), body: req.body, ip: req.ip },
      req as unknown as Parameters<typeof securityLogger>[2]
    );
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '登录失败，请稍后重试',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const refresh = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.error(StandardErrorCode.UNAUTHORIZED, '刷新令牌缺失', undefined, 401);
    const tokens = await jwtService.refreshAccessToken(token);
    return res.success({ tokens }, '令牌刷新成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.UNAUTHORIZED,
      error instanceof Error ? error.message : '令牌刷新失败',
      undefined,
      401
    );
  }
};

const logout = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const user = getUser(req);
    const userId = user.id;
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await query('DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token = $2', [
        userId,
        refreshToken,
      ]);
    }
    securityLogger(
      'LOGOUT',
      { userId, ip: req.ip, userAgent: req.get('User-Agent') },
      req as unknown as Parameters<typeof securityLogger>[2]
    );
    return res.success(null, '登出成功');
  } catch (error) {
    securityLogger(
      'LOGOUT_FAILED',
      {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        ip: req.ip,
      },
      req as unknown as Parameters<typeof securityLogger>[2]
    );
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '登出失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const me = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const user = getUser(req);
    return res.success({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取用户信息失败', undefined, 500);
  }
};

/**
 * 本地模式入口 — 无账户、无密码、打开即用
 * GET /auth/local-token
 *
 * - SQLite 模式：返回一个虚拟 token + 游客身份，前端据此跳过登录页
 * - PG 模式（云端）：返回 403，必须走注册/登录
 */
const localToken = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    if (process.env.DB_MODE === 'pg') {
      return res.error(
        StandardErrorCode.OPERATION_NOT_ALLOWED,
        '云端模式不支持自动登录，请使用账号密码登录',
        undefined,
        403
      );
    }

    // 本地模式：生成一个简单的 JWT，身份标识为 'local'
    // 不创建数据库用户，authMiddleware 在 SQLite 模式下无 token 也会放行
    const tokens = await jwtService.generateTokenPair('local', {
      username: 'local',
      role: 'admin',
    });

    return res.success(
      {
        user: { id: 'local', username: 'local', email: 'local@testweb.local', role: 'admin' },
        tokens,
        localMode: true,
      },
      '本地模式'
    );
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '本地登录失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

export default {
  resendVerification,
  verifyEmail,
  register,
  login,
  refresh,
  logout,
  me,
  localToken,
};
