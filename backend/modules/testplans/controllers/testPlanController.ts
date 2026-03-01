/**
 * 测试计划控制器
 */

import type { ApiResponse, AuthenticatedRequest } from '../../types';
import { testPlanService } from '../services/TestPlanService';

export const listPlans = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const { workspaceId, status, page, limit } = req.query;
  const result = await testPlanService.list({
    workspaceId: workspaceId as string,
    status: status as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.success(result);
};

export const getPlan = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const plan = await testPlanService.getById(req.params.planId);
  if (!plan) {
    res.error('NOT_FOUND', '测试计划不存在');
    return;
  }
  res.success(plan);
};

export const createPlan = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const userId = req.user?.id || 'local-user';
  const plan = await testPlanService.create(req.body, userId);
  res.created(plan, '测试计划已创建');
};

export const updatePlan = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const plan = await testPlanService.update(req.params.planId, req.body);
  if (!plan) {
    res.notFound('测试计划不存在');
    return;
  }
  res.success(plan);
};

export const deletePlan = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const deleted = await testPlanService.delete(req.params.planId);
  if (!deleted) {
    res.notFound('测试计划不存在');
    return;
  }
  res.success({ deleted: true });
};

export const executePlan = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const userId = req.user?.id || 'local-user';
  try {
    const execution = await testPlanService.execute(req.params.planId, req.body || {}, userId);
    res.success(execution, '测试计划已开始执行');
  } catch (err) {
    res.error('EXECUTION_ERROR', (err as Error).message);
  }
};

export const getExecution = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const execution = await testPlanService.getExecution(req.params.executionId);
  if (!execution) {
    res.notFound('执行记录不存在');
    return;
  }
  res.success(execution);
};

export const listExecutions = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const { planId, limit } = req.query;
  const executions = await testPlanService.listExecutions({
    planId: planId as string,
    limit: limit ? Number(limit) : undefined,
  });
  res.success(executions);
};

export const cancelExecution = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const cancelled = await testPlanService.cancelExecution(req.params.executionId);
  if (!cancelled) {
    res.error('CANCEL_FAILED', '执行记录不存在或已完成');
    return;
  }
  res.success({ cancelled: true }, '执行已取消');
};

export const getReport = async (req: AuthenticatedRequest, res: ApiResponse) => {
  const report = await testPlanService.getReport(req.params.executionId);
  if (!report) {
    res.notFound('报告不存在或执行未完成');
    return;
  }
  res.success(report);
};
