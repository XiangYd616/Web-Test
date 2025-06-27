import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { ActivityLogModel } from '../models/ActivityLog';
import { logger, securityLogger } from '../utils/logger';

// 扩展 Request 接口
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

// JWT配置
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

// 生成JWT令牌
export const generateToken = (user: any): string => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
  };

  return (jwt as any).sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'testweb-api',
    audience: 'testweb-client',
  });
};

// 验证JWT令牌
export const verifyToken = (token: string): any => {
  try {
    return (jwt as any).verify(token, JWT_SECRET, {
      issuer: 'testweb-api',
      audience: 'testweb-client',
    });
  } catch (error) {
    throw new Error('无效的令牌');
  }
};

// 身份验证中间件
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: '缺少认证令牌'
      });
      return;
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证令牌
    const decoded = verifyToken(token);
    
    // 检查用户是否仍然存在且状态正常
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      res.status(401).json({
        success: false,
        error: '用户不存在'
      });
      return;
    }

    if (user.status !== 'active') {
      // 记录安全事件
      await ActivityLogModel.logSecurityEvent(
        'inactive_user_access_attempt',
        { userId: user.id, username: user.username, status: user.status },
        req.ip,
        req.get('User-Agent'),
        'warning'
      );

      res.status(401).json({
        success: false,
        error: '账户已被禁用'
      });
      return;
    }

    // 检查账户是否被锁定
    const isLocked = await UserModel.isLocked(user.id);
    if (isLocked) {
      // 记录安全事件
      await ActivityLogModel.logSecurityEvent(
        'locked_user_access_attempt',
        { userId: user.id, username: user.username },
        req.ip,
        req.get('User-Agent'),
        'warning'
      );

      res.status(401).json({
        success: false,
        error: '账户已被锁定'
      });
      return;
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    next();
  } catch (error) {
    // 记录安全事件
    await ActivityLogModel.logSecurityEvent(
      'invalid_token_access_attempt',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      req.ip,
      req.get('User-Agent'),
      'warning'
    );

    logger.warn('身份验证失败', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : error,
    });

    res.status(401).json({
      success: false,
      error: '身份验证失败'
    });
  }
};

// 角色验证中间件
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证'
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      // 记录安全事件
      ActivityLogModel.logSecurityEvent(
        'unauthorized_role_access_attempt',
        { 
          userId: req.user.id, 
          userRole: req.user.role, 
          requiredRoles: allowedRoles,
          path: req.path 
        },
        req.ip,
        req.get('User-Agent'),
        'warning'
      );

      res.status(403).json({
        success: false,
        error: '权限不足'
      });
      return;
    }

    next();
  };
};

// 权限验证中间件
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证'
      });
      return;
    }

    // 管理员拥有所有权限
    if (req.user.role === 'admin') {
      next();
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      // 记录安全事件
      ActivityLogModel.logSecurityEvent(
        'unauthorized_permission_access_attempt',
        { 
          userId: req.user.id, 
          userPermissions: req.user.permissions, 
          requiredPermission: permission,
          path: req.path 
        },
        req.ip,
        req.get('User-Agent'),
        'warning'
      );

      res.status(403).json({
        success: false,
        error: '权限不足'
      });
      return;
    }

    next();
  };
};

// 管理员验证中间件
export const requireAdmin = requireRole('admin');

// 可选身份验证中间件（不强制要求认证）
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await UserModel.findById(decoded.id);
    if (user && user.status === 'active') {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      };
    }

    next();
  } catch (error) {
    // 可选认证失败时不返回错误，继续处理请求
    next();
  }
};

// 刷新令牌
export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证'
      });
      return;
    }

    // 重新获取用户信息以确保数据最新
    const user = await UserModel.findById(req.user.id);
    if (!user || user.status !== 'active') {
      res.status(401).json({
        success: false,
        error: '用户状态异常'
      });
      return;
    }

    // 生成新令牌
    const newToken = generateToken(user);

    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          permissions: user.permissions,
        }
      }
    });
  } catch (error) {
    logger.error('刷新令牌失败', error);
    res.status(500).json({
      success: false,
      error: '刷新令牌失败'
    });
  }
};

export { AuthenticatedRequest };
