/**
 * OAuth 路由
 * 处理第三方登录授权
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import OAuthService from '../services/oauth/OAuthService';

const router = express.Router();
const oauthService = new OAuthService();

type OAuthRequest = express.Request & {
  body: { code?: string; state?: string; redirectUri?: string };
  query: { redirectUri?: string };
};

type ApiResponse = express.Response & {
  success: (data?: unknown, message?: string) => express.Response;
  validationError: (errors: Array<{ field: string; message: string }>) => express.Response;
};

const handleUnsupportedProvider = (res: ApiResponse, provider: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return res.validationError([
    { field: 'provider', message: `OAuth 提供商无效: ${provider}. ${message}` },
  ]);
};

// 获取已配置的 OAuth 提供商
router.get(
  '/providers',
  asyncHandler(async (_req: OAuthRequest, res: ApiResponse) => {
    const providers = oauthService.getSupportedProviders();
    return res.success({ providers });
  })
);

// 获取 OAuth 授权地址
router.get(
  '/:provider/url',
  asyncHandler(async (req: OAuthRequest, res: ApiResponse) => {
    try {
      const { provider } = req.params;
      const redirectUri = req.query.redirectUri ? String(req.query.redirectUri) : undefined;
      const url = oauthService.generateAuthUrl(provider, redirectUri);
      return res.success({ url });
    } catch (error) {
      return handleUnsupportedProvider(res, req.params.provider, error);
    }
  })
);

// OAuth 回调
router.post(
  '/:provider/callback',
  asyncHandler(async (req: OAuthRequest, res: ApiResponse) => {
    const { provider } = req.params;
    const { code, state } = req.body;

    if (!code) {
      return res.validationError([{ field: 'code', message: 'code 不能为空' }]);
    }
    if (!state) {
      return res.validationError([{ field: 'state', message: 'state 不能为空' }]);
    }

    const result = await oauthService.handleCallback(provider, code, state);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'OAuth 登录失败',
      });
    }

    return res.success({
      token: result.tokens?.accessToken,
      refreshToken: result.tokens?.refreshToken,
      expiresIn: result.tokens?.expiresIn,
      user: result.user,
    });
  })
);

export default router;
