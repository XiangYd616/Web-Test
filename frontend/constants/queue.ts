export const QUEUE_NAMES = {
  DEFAULT: 'test-execution',
  HEAVY: 'test-execution-heavy',
  SECURITY: 'test-execution-security',
  DEAD: 'test-execution-dead',
} as const;

export const TEST_TYPE_QUEUE_MAP: Record<string, string> = {
  website: QUEUE_NAMES.DEFAULT,
  seo: QUEUE_NAMES.DEFAULT,
  performance: QUEUE_NAMES.HEAVY,
  accessibility: QUEUE_NAMES.DEFAULT,
  security: QUEUE_NAMES.SECURITY,
  api: QUEUE_NAMES.DEFAULT,
  stress: QUEUE_NAMES.HEAVY,
  compatibility: QUEUE_NAMES.DEFAULT,
  ux: QUEUE_NAMES.DEFAULT,
};

export const getQueueNameByTestType = (testType?: string) => {
  if (!testType) {
    return QUEUE_NAMES.DEFAULT;
  }
  return TEST_TYPE_QUEUE_MAP[testType] || QUEUE_NAMES.DEFAULT;
};
