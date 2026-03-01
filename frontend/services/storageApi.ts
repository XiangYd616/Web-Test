import { apiClient } from './apiClient';

const BASE = '/storage';

export type StorageStatus = {
  health: Record<string, unknown>;
  statistics: Record<string, unknown>;
  timestamp: string;
  [key: string]: unknown;
};

export type StorageFile = {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  userId: string;
  ownerType?: string | null;
  ownerId?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};

export type StorageQuota = {
  totalFiles: number;
  totalSize: number;
};

export type StorageArchive = {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  size?: number;
  compressedSize?: number;
  compressionRatio?: number;
  filesCount?: number;
  archivedFilesCount?: number;
  archivePath?: string;
  createdBy?: string;
};

const unwrap = <T>(resp: { data: { data?: T; [k: string]: unknown } }): T =>
  (resp.data.data ?? resp.data) as T;

export const storageApi = {
  async getStatus() {
    const resp = await apiClient.get(`${BASE}/status`);
    return unwrap<StorageStatus>(resp);
  },

  async getFiles(params?: { page?: number; limit?: number; type?: string }) {
    const resp = await apiClient.get(`${BASE}/files`, { params });
    return unwrap<{ files: StorageFile[]; pagination: Record<string, unknown> }>(resp);
  },

  async deleteFile(fileId: string) {
    const resp = await apiClient.delete(`${BASE}/files/${fileId}`);
    return unwrap<void>(resp);
  },

  async getQuotas() {
    const resp = await apiClient.get(`${BASE}/quotas`);
    return unwrap<StorageQuota>(resp);
  },

  async cleanup(olderThan: number, dryRun?: boolean) {
    const resp = await apiClient.post(`${BASE}/cleanup`, { olderThan, dryRun });
    return unwrap<Record<string, unknown>>(resp);
  },

  async getArchives(params?: { page?: number; limit?: number; status?: string }) {
    const resp = await apiClient.get(`${BASE}/archives`, { params });
    return unwrap<{ archives: StorageArchive[]; pagination: Record<string, unknown> }>(resp);
  },

  async deleteArchive(archiveId: string) {
    const resp = await apiClient.delete(`${BASE}/archives/${archiveId}`);
    return unwrap<{ archiveId: string }>(resp);
  },
};
