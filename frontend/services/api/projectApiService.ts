/**
 * ��Ŀ����API����
 * ���ں��API�淶ʵ����������Ŀ������
 * �汾: v1.0.0
 */

import type {
  CreateProjectRequest,
  Project,
  ProjectListResponse,
  ProjectResponse,
  ProjectStatsResponse,
  UpdateProjectRequest
} from '../../types/project';
import type { ApiResponse } from '../../types/api';
import { apiService } from './apiService';

class ProjectApiService {
  private baseUrl = '/api/v1';

  // ==================== ��Ŀ���� ====================

  /**
   * ��ȡ�û���Ŀ�б�
   */
  async getProjects(query?: any): Promise<ApiResponse<ProjectListResponse>> {
    const queryParams = new URLSearchParams();

    if (query?.page) queryParams.append('page', query?.page.toString());
    if (query?.limit) queryParams.append('limit', query?.limit.toString());
    if (query?.search) queryParams.append('search', query?.search);
    if (query?.status && query?.status !== 'all') queryParams.append('status', query?.status);
    if (query?.sort) queryParams.append('sort', query?.sort);
    if (query?.order) queryParams.append('order', query?.order);

    const url = `${this.baseUrl}/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiService.get<ProjectListResponse>(url);
  }

  /**
   * ��������Ŀ
   */
  async createProject(projectData: CreateProjectRequest): Promise<ApiResponse<ProjectResponse>> {
    return apiService.post<ProjectResponse>(`${this.baseUrl}/projects`, projectData);
  }

  /**
   * ��ȡ�ض���Ŀ����
   */
  async getProject(projectId: string): Promise<ApiResponse<ProjectResponse>> {
    return apiService.get<ProjectResponse>(`${this.baseUrl}/projects/${projectId}`);
  }

  /**
   * ������Ŀ��Ϣ
   */
  async updateProject(projectId: string, updates: UpdateProjectRequest): Promise<ApiResponse<ProjectResponse>> {
    return apiService.put<ProjectResponse>(`${this.baseUrl}/projects/${projectId}`, updates);
  }

  /**
   * ɾ����Ŀ
   */
  async deleteProject(projectId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiService.delete(`${this.baseUrl}/projects/${projectId}`);
  }

  /**
   * ��ȡ��Ŀͳ����Ϣ
   */
  async getProjectStats(projectId?: string): Promise<ApiResponse<ProjectStatsResponse>> {
    const url = projectId
      ? `${this.baseUrl}/projects/${projectId}/stats`
      : `${this.baseUrl}/projects/stats`;
    return apiService.get<ProjectStatsResponse>(url);
  }

  /**
   * �鵵��Ŀ
   */
  async archiveProject(projectId: string): Promise<ApiResponse<ProjectResponse>> {
    return apiService.put<ProjectResponse>(`${this.baseUrl}/projects/${projectId}`, {
      status: 'archived'
    });
  }

  /**
   * �ָ��ѹ鵵����Ŀ
   */
  async restoreProject(projectId: string): Promise<ApiResponse<ProjectResponse>> {
    return apiService.put<ProjectResponse>(`${this.baseUrl}/projects/${projectId}`, {
      status: 'active'
    });
  }

  /**
   * ������Ŀ
   */
  async duplicateProject(
    projectId: string,
    newName: string,
    includeTests: boolean = true
  ): Promise<ApiResponse<ProjectResponse>> {
    return apiService.post<ProjectResponse>(`${this.baseUrl}/projects/${projectId}/duplicate`, {
      name: newName,
      include_tests: includeTests
    });
  }

  /**
   * ������Ŀ����
   */
  async exportProject(
    projectId: string,
    format: 'json' | 'csv' = 'json',
    includeTests: boolean = true
  ): Promise<ApiResponse<{ export_id: string; download_url: string }>> {
    return apiService.post(`${this.baseUrl}/projects/${projectId}/export`, {
      format,
      include_tests: includeTests
    });
  }

  /**
   * ������Ŀ����
   */
  async importProject(file: File): Promise<ApiResponse<ProjectResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiService.post<ProjectResponse>(`${this.baseUrl}/projects/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // ==================== ��Ŀ���ù��� ====================

  /**
   * ��ȡ��Ŀ����
   */
  async getProjectSettings(projectId: string): Promise<ApiResponse<any>> {
    return apiService.get(`${this.baseUrl}/projects/${projectId}/settings`);
  }

  /**
   * ������Ŀ����
   */
  async updateProjectSettings(
    projectId: string,
    settings: Record<string, any>
  ): Promise<ApiResponse<any>> {
    return apiService.put(`${this.baseUrl}/projects/${projectId}/settings`, settings);
  }

  /**
   * ������Ŀ����ΪĬ��ֵ
   */
  async resetProjectSettings(projectId: string): Promise<ApiResponse<any>> {
    return apiService.post(`${this.baseUrl}/projects/${projectId}/settings/reset`);
  }

  // ==================== ��Ŀ��Ա���� ====================

  /**
   * ��ȡ��Ŀ��Ա�б�
   */
  async getProjectMembers(projectId: string): Promise<ApiResponse<any[]>> {
    return apiService.get(`${this.baseUrl}/projects/${projectId}/members`);
  }

  /**
   * �����Ŀ��Ա
   */
  async addProjectMember(
    projectId: string,
    userId: string,
    role: 'viewer' | 'editor' | 'admin' = 'viewer'
  ): Promise<ApiResponse<any>> {
    return apiService.post(`${this.baseUrl}/projects/${projectId}/members`, {
      user_id: userId,
      role
    });
  }

  /**
   * ���³�Ա��ɫ
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    role: 'viewer' | 'editor' | 'admin'
  ): Promise<ApiResponse<any>> {
    return apiService.put(`${this.baseUrl}/projects/${projectId}/members/${userId}`, {
      role
    });
  }

  /**
   * �Ƴ���Ŀ��Ա
   */
  async removeMember(projectId: string, userId: string): Promise<ApiResponse<{ removed: boolean }>> {
    return apiService.delete(`${this.baseUrl}/projects/${projectId}/members/${userId}`);
  }

  // ==================== ��Ŀ���־ ====================

  /**
   * ��ȡ��Ŀ���־
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

    if (params?.page) queryParams.append('page', params?.page.toString());
    if (params?.limit) queryParams.append('limit', params?.limit.toString());
    if (params?.activity_type) queryParams.append('activity_type', params?.activity_type);
    if (params?.date_from) queryParams.append('date_from', params?.date_from);
    if (params?.date_to) queryParams.append('date_to', params?.date_to);

    const url = `${this.baseUrl}/projects/${projectId}/activity${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiService.get(url);
  }

  // ==================== ��Ŀģ����� ====================

  /**
   * ��ȡ��Ŀģ���б�
   */
  async getProjectTemplates(): Promise<ApiResponse<Project[]>> {
    return apiService.get(`${this.baseUrl}/projects/templates`);
  }

  /**
   * ��ģ�崴����Ŀ
   */
  async createFromTemplate(
    templateId: string,
    projectData: {
      name: string;
      description: string;
      target_url: string;
    }
  ): Promise<ApiResponse<ProjectResponse>> {
    return apiService.post(`${this.baseUrl}/projects/templates/${templateId}/create`, projectData);
  }

  /**
   * ����Ŀ����Ϊģ��
   */
  async saveAsTemplate(
    projectId: string,
    templateData: {
      name: string;
      description: string;
      is_public?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    return apiService.post(`${this.baseUrl}/projects/${projectId}/save-as-template`, templateData);
  }

  // ==================== ��Ŀ�����͹��� ====================

  /**
   * ������Ŀ
   */
  async searchProjects(
    query: string,
    filters?: {
      status?: string;
      created_after?: string;
      created_before?: string;
      has_tests?: boolean;
    }
  ): Promise<ApiResponse<ProjectListResponse>> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);

    if (filters?.status) queryParams.append('status', filters?.status);
    if (filters?.created_after) queryParams.append('created_after', filters?.created_after);
    if (filters?.created_before) queryParams.append('created_before', filters?.created_before);
    if (filters?.has_tests !== undefined) queryParams.append('has_tests', filters?.has_tests.toString());

    const url = `${this.baseUrl}/projects/search?${queryParams.toString()}`;
    return apiService.get(url);
  }

  /**
   * ��ȡ��Ŀ��ǩ�б�
   */
  async getProjectTags(): Promise<ApiResponse<string[]>> {
    return apiService.get(`${this.baseUrl}/projects/tags`);
  }

  /**
   * ����ǩ��ȡ��Ŀ
   */
  async getProjectsByTag(tag: string): Promise<ApiResponse<ProjectListResponse>> {
    return apiService.get(`${this.baseUrl}/projects/by-tag/${encodeURIComponent(tag)}`);
  }

  // ==================== �������� ====================

  /**
   * ����ɾ����Ŀ
   */
  async bulkDeleteProjects(projectIds: string[]): Promise<ApiResponse<{ deleted_count: number }>> {
    return apiService.post(`${this.baseUrl}/projects/bulk-delete`, {
      project_ids: projectIds
    });
  }

  /**
   * �����鵵��Ŀ
   */
  async bulkArchiveProjects(projectIds: string[]): Promise<ApiResponse<{ archived_count: number }>> {
    return apiService.post(`${this.baseUrl}/projects/bulk-archive`, {
      project_ids: projectIds
    });
  }

  /**
   * ����������Ŀ״̬
   */
  async bulkUpdateStatus(
    projectIds: string[],
    status: 'active' | 'inactive' | 'archived'
  ): Promise<ApiResponse<{ updated_count: number }>> {
    return apiService.post(`${this.baseUrl}/projects/bulk-update-status`, {
      project_ids: projectIds,
      status
    });
  }
}

export const _projectApiService = new ProjectApiService();
export default ProjectApiService;
