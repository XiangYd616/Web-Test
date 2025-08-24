/**
 * 项目管理API服务
 * 基于后端API规范实现完整的项目管理功能
 * 版本: v1.0.0
 */

import type { ApiResponse } from '../../types/unified/apiResponse';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListQuery,
  ProjectResponse,
  ProjectListResponse,
  ProjectStatsResponse
} from '../../types/project';
import { unifiedApiService } from './apiService';

class ProjectApiService {
  private baseUrl = '/api/v1';

  // ==================== 项目管理 ====================

  /**
   * 获取用户项目列表
   */
  async getProjects(query?: ProjectListQuery): Promise<ProjectListResponse> {
    const queryParams = new URLSearchParams();
    
    if (query?.page) queryParams.append('page', query.page.toString());
    if (query?.limit) queryParams.append('limit', query.limit.toString());
    if (query?.search) queryParams.append('search', query.search);
    if (query?.status && query.status !== 'all') queryParams.append('status', query.status);
    if (query?.sort) queryParams.append('sort', query.sort);
    if (query?.order) queryParams.append('order', query.order);

    const url = `${this.baseUrl}/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return unifiedApiService.get(url);
  }

  /**
   * 创建新项目
   */
  async createProject(projectData: CreateProjectRequest): Promise<ProjectResponse> {
    return unifiedApiService.post(`${this.baseUrl}/projects`, projectData);
  }

  /**
   * 获取特定项目详情
   */
  async getProject(projectId: string): Promise<ProjectResponse> {
    return unifiedApiService.get(`${this.baseUrl}/projects/${projectId}`);
  }

  /**
   * 更新项目信息
   */
  async updateProject(projectId: string, updates: UpdateProjectRequest): Promise<ProjectResponse> {
    return unifiedApiService.put(`${this.baseUrl}/projects/${projectId}`, updates);
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return unifiedApiService.delete(`${this.baseUrl}/projects/${projectId}`);
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(projectId?: string): Promise<ProjectStatsResponse> {
    const url = projectId 
      ? `${this.baseUrl}/projects/${projectId}/stats`
      : `${this.baseUrl}/projects/stats`;
    return unifiedApiService.get(url);
  }

  /**
   * 归档项目
   */
  async archiveProject(projectId: string): Promise<ProjectResponse> {
    return unifiedApiService.put(`${this.baseUrl}/projects/${projectId}`, {
      status: 'archived'
    });
  }

  /**
   * 恢复已归档的项目
   */
  async restoreProject(projectId: string): Promise<ProjectResponse> {
    return unifiedApiService.put(`${this.baseUrl}/projects/${projectId}`, {
      status: 'active'
    });
  }

  /**
   * 复制项目
   */
  async duplicateProject(
    projectId: string, 
    newName: string,
    includeTests: boolean = true
  ): Promise<ProjectResponse> {
    return unifiedApiService.post(`${this.baseUrl}/projects/${projectId}/duplicate`, {
      name: newName,
      include_tests: includeTests
    });
  }

  /**
   * 导出项目数据
   */
  async exportProject(
    projectId: string,
    format: 'json' | 'csv' = 'json',
    includeTests: boolean = true
  ): Promise<ApiResponse<{ export_id: string; download_url: string }>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/${projectId}/export`, {
      format,
      include_tests: includeTests
    });
  }

  /**
   * 导入项目数据
   */
  async importProject(file: File): Promise<ProjectResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return unifiedApiService.post(`${this.baseUrl}/projects/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // ==================== 项目设置管理 ====================

  /**
   * 获取项目设置
   */
  async getProjectSettings(projectId: string): Promise<ApiResponse<any>> {
    return unifiedApiService.get(`${this.baseUrl}/projects/${projectId}/settings`);
  }

  /**
   * 更新项目设置
   */
  async updateProjectSettings(
    projectId: string, 
    settings: Record<string, any>
  ): Promise<ApiResponse<any>> {
    return unifiedApiService.put(`${this.baseUrl}/projects/${projectId}/settings`, settings);
  }

  /**
   * 重置项目设置为默认值
   */
  async resetProjectSettings(projectId: string): Promise<ApiResponse<any>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/${projectId}/settings/reset`);
  }

  // ==================== 项目成员管理 ====================

  /**
   * 获取项目成员列表
   */
  async getProjectMembers(projectId: string): Promise<ApiResponse<any[]>> {
    return unifiedApiService.get(`${this.baseUrl}/projects/${projectId}/members`);
  }

  /**
   * 添加项目成员
   */
  async addProjectMember(
    projectId: string,
    userId: string,
    role: 'viewer' | 'editor' | 'admin' = 'viewer'
  ): Promise<ApiResponse<any>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/${projectId}/members`, {
      user_id: userId,
      role
    });
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    role: 'viewer' | 'editor' | 'admin'
  ): Promise<ApiResponse<any>> {
    return unifiedApiService.put(`${this.baseUrl}/projects/${projectId}/members/${userId}`, {
      role
    });
  }

  /**
   * 移除项目成员
   */
  async removeMember(projectId: string, userId: string): Promise<ApiResponse<{ removed: boolean }>> {
    return unifiedApiService.delete(`${this.baseUrl}/projects/${projectId}/members/${userId}`);
  }

  // ==================== 项目活动日志 ====================

  /**
   * 获取项目活动日志
   */
  async getProjectActivity(
    projectId: string,
    params?: {
      page?: number;
      limit?: number;
      activity_type?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.activity_type) queryParams.append('activity_type', params.activity_type);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${this.baseUrl}/projects/${projectId}/activity${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return unifiedApiService.get(url);
  }

  // ==================== 项目模板管理 ====================

  /**
   * 获取项目模板列表
   */
  async getProjectTemplates(): Promise<ApiResponse<Project[]>> {
    return unifiedApiService.get(`${this.baseUrl}/projects/templates`);
  }

  /**
   * 从模板创建项目
   */
  async createFromTemplate(
    templateId: string,
    projectData: {
      name: string;
      description: string;
      target_url: string;
    }
  ): Promise<ProjectResponse> {
    return unifiedApiService.post(`${this.baseUrl}/projects/templates/${templateId}/create`, projectData);
  }

  /**
   * 将项目保存为模板
   */
  async saveAsTemplate(
    projectId: string,
    templateData: {
      name: string;
      description: string;
      is_public?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/${projectId}/save-as-template`, templateData);
  }

  // ==================== 项目搜索和过滤 ====================

  /**
   * 搜索项目
   */
  async searchProjects(
    query: string,
    filters?: {
      status?: string;
      created_after?: string;
      created_before?: string;
      has_tests?: boolean;
    }
  ): Promise<ProjectListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.created_after) queryParams.append('created_after', filters.created_after);
    if (filters?.created_before) queryParams.append('created_before', filters.created_before);
    if (filters?.has_tests !== undefined) queryParams.append('has_tests', filters.has_tests.toString());

    const url = `${this.baseUrl}/projects/search?${queryParams.toString()}`;
    return unifiedApiService.get(url);
  }

  /**
   * 获取项目标签列表
   */
  async getProjectTags(): Promise<ApiResponse<string[]>> {
    return unifiedApiService.get(`${this.baseUrl}/projects/tags`);
  }

  /**
   * 按标签获取项目
   */
  async getProjectsByTag(tag: string): Promise<ProjectListResponse> {
    return unifiedApiService.get(`${this.baseUrl}/projects/by-tag/${encodeURIComponent(tag)}`);
  }

  // ==================== 批量操作 ====================

  /**
   * 批量删除项目
   */
  async bulkDeleteProjects(projectIds: string[]): Promise<ApiResponse<{ deleted_count: number }>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/bulk-delete`, {
      project_ids: projectIds
    });
  }

  /**
   * 批量归档项目
   */
  async bulkArchiveProjects(projectIds: string[]): Promise<ApiResponse<{ archived_count: number }>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/bulk-archive`, {
      project_ids: projectIds
    });
  }

  /**
   * 批量更新项目状态
   */
  async bulkUpdateStatus(
    projectIds: string[],
    status: 'active' | 'inactive' | 'archived'
  ): Promise<ApiResponse<{ updated_count: number }>> {
    return unifiedApiService.post(`${this.baseUrl}/projects/bulk-update-status`, {
      project_ids: projectIds,
      status
    });
  }
}

export const projectApiService = new ProjectApiService();
export default ProjectApiService;
