import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import type { ApiResponse, AuthRequest } from '../../types';
import {
  hasWorkspacePermission,
  resolveWorkspaceRole,
  type WorkspacePermission,
} from '../../utils/workspacePermissions';
import uatFeedbackService from '../services/uatFeedbackService';

type FeedbackPayload = {
  sessionId: string;
  testType: string;
  actions?: Record<string, unknown>[];
  ratings?: Record<string, number>;
  issues?: string[];
  comments?: string;
  completed?: boolean;
  startedAt?: string;
  submittedAt?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

const ensureWorkspacePermission = async (
  workspaceId: string,
  userId: string,
  action: WorkspacePermission
) => {
  const role = await resolveWorkspaceRole(workspaceId, userId, query);
  if (!role) {
    throw new Error('没有权限访问该工作空间');
  }
  if (!hasWorkspacePermission(role, action)) {
    throw new Error('当前工作空间角色无此操作权限');
  }
  return role;
};

class UatFeedbackController {
  async createFeedback(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const payload = req.body as FeedbackPayload;
      if (!payload.sessionId || !payload.testType) {
        return res.error(StandardErrorCode.INVALID_INPUT, 'sessionId 与 testType 为必填');
      }

      if (payload.workspaceId) {
        await ensureWorkspacePermission(payload.workspaceId, req.user.id, 'write');
      }

      const record = await uatFeedbackService.createFeedback({
        sessionId: payload.sessionId,
        userId: req.user.id,
        workspaceId: payload.workspaceId,
        testType: payload.testType,
        actions: payload.actions || [],
        ratings: payload.ratings || {},
        issues: payload.issues || [],
        comments: payload.comments,
        completed: Boolean(payload.completed),
        startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
        submittedAt: payload.submittedAt ? new Date(payload.submittedAt) : new Date(),
        metadata: payload.metadata || {},
      });

      return res.created(record, '反馈已保存');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '保存反馈失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  async getFeedback(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const feedback = await uatFeedbackService.getBySessionId(sessionId);
      if (!feedback) {
        return res.error(StandardErrorCode.NOT_FOUND, '反馈不存在');
      }
      return res.success(feedback);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取反馈失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  async listFeedback(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { workspaceId, limit, offset } = req.query as {
        workspaceId?: string;
        limit?: string;
        offset?: string;
      };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, req.user.id, 'read');
      }
      const result = await uatFeedbackService.list({
        userId: req.user.id,
        workspaceId,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      return res.success(result);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取反馈列表失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }
  async deleteFeedback(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const feedback = await uatFeedbackService.findById(id);
      if (!feedback) {
        return res.error(StandardErrorCode.NOT_FOUND, '反馈不存在');
      }
      // 只允许创建者删除
      if (feedback.user_id !== req.user.id) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权删除此反馈', undefined, 403);
      }
      await uatFeedbackService.deleteById(id);
      return res.success(null, '反馈已删除');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '删除反馈失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }
}

export default new UatFeedbackController();
