import type {
  UatFeedbackCreateData,
  UatFeedbackRecord,
} from '../repositories/uatFeedbackRepository';
import uatFeedbackRepository from '../repositories/uatFeedbackRepository';

const uatFeedbackService = {
  async createFeedback(data: UatFeedbackCreateData): Promise<UatFeedbackRecord> {
    return uatFeedbackRepository.create(data);
  },

  async getBySessionId(sessionId: string): Promise<UatFeedbackRecord | null> {
    return uatFeedbackRepository.findBySessionId(sessionId);
  },

  async findById(id: string): Promise<UatFeedbackRecord | null> {
    return uatFeedbackRepository.findById(id);
  },

  async deleteById(id: string): Promise<boolean> {
    return uatFeedbackRepository.deleteById(id);
  },

  async list(params: {
    userId: string;
    workspaceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: UatFeedbackRecord[]; total: number }> {
    return uatFeedbackRepository.list(params);
  },
};

export default uatFeedbackService;
