import bcrypt from 'bcrypt';
import type { NextFunction, Request } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import JwtService from '../../core/services/jwtService';
import { mfaService } from '../../core/services/mfaService';
import type { ApiResponse, AuthenticatedRequest as AuthRequest } from '../../types';
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from '../../utils/securityLogger';
import { SessionManager } from '../services/sessionManager';

const jwtService = new JwtService();
const sessionManager = new SessionManager();

type UserRecord = {
  id: string;
  username: string;
  email: string;
  role: string;
  password_hash: string;
  status?: string;
};

const getUserByEmail = async (email: string) => {
  const result = await query(
    'SELECT id, username, email, role, password_hash, status FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] as UserRecord | undefined;
};

const getUserById = async (userId: string) => {
  const result = await query(
    'SELECT id, username, email, role, password_hash, status FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] as UserRecord | undefined;
};

const ensurePassword = async (userId: string, password: string) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const record = result.rows[0] as { password_hash?: string } | undefined;
  if (!record?.password_hash) {
    return false;
  }
  return bcrypt.compare(password, record.password_hash);
};

const markMFAEnabled = async (userId: string, enabled: boolean) => {
  await query('UPDATE users SET two_factor_enabled = $1, updated_at = NOW() WHERE id = $2', [
    enabled,
    userId,
  ]);
};

const buildAuthPayload = async (req: Request, user: UserRecord) => {
  const tokens = await jwtService.generateTokenPair(user.id, {
    username: user.username,
    role: user.role,
  });
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip || '';
  await sessionManager.createSession(user.id, { userAgent }, ipAddress, userAgent);
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
};

class MFAController {
  async setup(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.unauthorized('用户未认证');
      }
      const payload = await mfaService.enableTOTP(req.user.id);
      return res.success(payload, 'MFA设置初始化成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  async verifySetup(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.unauthorized('用户未认证');
      }
      const { token } = req.body as { token?: string };
      if (!token) {
        return res.validationError([{ field: 'token', message: 'token 不能为空' }]);
      }
      const result = await mfaService.verifyTOTPSetup(req.user.id, token);
      if (!result.success) {
        return res.error(
          StandardErrorCode.INVALID_INPUT,
          result.message || '验证码无效',
          undefined,
          400
        );
      }
      await markMFAEnabled(req.user.id, true);
      return res.success({ backupCodes: result.backupCodes }, 'MFA设置成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  async status(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.unauthorized('用户未认证');
      }
      const status = await mfaService.getUserMFAStatus(req.user.id);
      const totp = status.totp;
      const backup = status.backup_codes;
      const mfaEnabled = Boolean(totp?.enabled || backup?.enabled);
      return res.success({
        mfaEnabled,
        backupCodesRemaining: backup?.remaining ?? 0,
        setupRequired: !mfaEnabled,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  async disable(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.unauthorized('用户未认证');
      }
      const { password, token } = req.body as { password?: string; token?: string };
      if (!password) {
        return res.validationError([{ field: 'password', message: 'password 不能为空' }]);
      }
      const isPasswordValid = await ensurePassword(req.user.id, password);
      if (!isPasswordValid) {
        return res.error(StandardErrorCode.UNAUTHORIZED, '当前密码错误', undefined, 401);
      }
      if (token) {
        const verify = await mfaService.verifyTOTP(req.user.id, token);
        if (!verify.success) {
          return res.error(
            StandardErrorCode.UNAUTHORIZED,
            verify.message || '验证码无效',
            undefined,
            401
          );
        }
      }
      const result = await mfaService.disableTOTP(req.user.id, password);
      if (!result.success) {
        return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, result.message || '禁用失败');
      }
      await markMFAEnabled(req.user.id, false);
      return res.success({ success: true }, result.message || 'MFA已禁用');
    } catch (error) {
      next(error);
      return;
    }
  }

  async regenerateBackupCodes(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.unauthorized('用户未认证');
      }
      const { password, token } = req.body as { password?: string; token?: string };
      if (!password) {
        return res.validationError([{ field: 'password', message: 'password 不能为空' }]);
      }
      if (!token) {
        return res.validationError([{ field: 'token', message: 'token 不能为空' }]);
      }
      const isPasswordValid = await ensurePassword(req.user.id, password);
      if (!isPasswordValid) {
        return res.error(StandardErrorCode.UNAUTHORIZED, '当前密码错误', undefined, 401);
      }
      const verify = await mfaService.verifyTOTP(req.user.id, token);
      if (!verify.success) {
        return res.error(
          StandardErrorCode.UNAUTHORIZED,
          verify.message || '验证码无效',
          undefined,
          401
        );
      }
      const backupCodes = await mfaService.generateBackupCodes(req.user.id);
      return res.success({ success: true, backupCodes }, '备用码已更新');
    } catch (error) {
      next(error);
      return;
    }
  }

  async verify(req: Request, res: ApiResponse, next: NextFunction) {
    try {
      const { email, token } = req.body as { email?: string; token?: string };
      if (!email) {
        return res.validationError([{ field: 'email', message: 'email 不能为空' }]);
      }
      if (!token) {
        return res.validationError([{ field: 'token', message: 'token 不能为空' }]);
      }
      const user = await getUserByEmail(email);
      if (!user) {
        return res.error(StandardErrorCode.NOT_FOUND, '用户不存在', undefined, 404);
      }
      if (user.status === 'locked') {
        return res.error(StandardErrorCode.OPERATION_NOT_ALLOWED, '账户已被锁定', undefined, 423);
      }
      const result = await mfaService.verifyTOTP(user.id, token);
      if (!result.success) {
        return res.error(
          StandardErrorCode.UNAUTHORIZED,
          result.message || '验证码无效',
          undefined,
          401
        );
      }
      const payload = await buildAuthPayload(req, user);
      return res.success(payload, '验证成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  async verifyChallenge(req: Request, res: ApiResponse, next: NextFunction) {
    try {
      const { challengeId, code, deviceFingerprint } = req.body as {
        challengeId?: string;
        code?: string;
        deviceFingerprint?: string;
      };
      if (!challengeId) {
        return res.validationError([{ field: 'challengeId', message: 'challengeId 不能为空' }]);
      }
      if (!code) {
        return res.validationError([{ field: 'code', message: 'code 不能为空' }]);
      }

      const verifyResult = await mfaService.verifyChallenge(
        challengeId,
        code,
        deviceFingerprint || null
      );
      if (!verifyResult.success || !verifyResult.userId) {
        return res.error(
          StandardErrorCode.UNAUTHORIZED,
          verifyResult.message || '验证码无效',
          undefined,
          401
        );
      }

      const user = await getUserById(verifyResult.userId);
      if (!user) {
        return res.error(StandardErrorCode.NOT_FOUND, '用户不存在', undefined, 404);
      }
      if (user.status === 'locked') {
        return res.error(StandardErrorCode.OPERATION_NOT_ALLOWED, '账户已被锁定', undefined, 423);
      }

      const payload = await buildAuthPayload(req, user);
      await logSecurityEvent({
        type: SecurityEventType.LOGIN_RISK_MFA_SUCCESS,
        userId: user.id,
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent') || undefined,
        success: true,
        timestamp: new Date(),
        severity: SecuritySeverity.LOW,
        metadata: {
          challengeId,
        },
      });

      return res.success(
        {
          ...payload,
          trustToken: verifyResult.trustToken || null,
        },
        '验证成功'
      );
    } catch (error) {
      next(error);
      return;
    }
  }

  async verifyBackup(req: Request, res: ApiResponse, next: NextFunction) {
    try {
      const { email, backupCode } = req.body as { email?: string; backupCode?: string };
      if (!email) {
        return res.validationError([{ field: 'email', message: 'email 不能为空' }]);
      }
      if (!backupCode) {
        return res.validationError([{ field: 'backupCode', message: 'backupCode 不能为空' }]);
      }
      const user = await getUserByEmail(email);
      if (!user) {
        return res.error(StandardErrorCode.NOT_FOUND, '用户不存在', undefined, 404);
      }
      const result = await mfaService.verifyBackupCode(user.id, backupCode);
      if (!result.success) {
        return res.error(
          StandardErrorCode.UNAUTHORIZED,
          result.message || '备用码无效',
          undefined,
          401
        );
      }
      const payload = await buildAuthPayload(req, user);
      return res.success({ ...payload, backupCodesRemaining: result.remainingCodes }, '验证成功');
    } catch (error) {
      next(error);
      return;
    }
  }
}

export default new MFAController();
