import type { TestStatus } from '../context/TestContext';

export const TEST_STATUS_META: Record<
  TestStatus,
  {
    label: string;
    color: string;
  }
> = {
  idle: { label: 'status.idle', color: '#6b7280' },
  pending: { label: 'status.pending', color: '#3b82f6' },
  queued: { label: 'status.queued', color: '#3b82f6' },
  running: { label: 'status.running', color: '#f59e0b' },
  completed: { label: 'status.completed', color: '#22c55e' },
  failed: { label: 'status.failed', color: '#ef4444' },
  cancelled: { label: 'status.cancelled', color: '#6b7280' },
  stopped: { label: 'status.stopped', color: '#6b7280' },
};

export const getTestStatusMeta = (status?: TestStatus) => {
  if (!status) {
    return { label: 'status.unknown', color: 'default' };
  }
  return TEST_STATUS_META[status] ?? { label: status, color: 'default' };
};
