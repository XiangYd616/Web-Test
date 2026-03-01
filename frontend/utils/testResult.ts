export type ParsedResultPayload = {
  schemaVersion: string;
  summary: Record<string, unknown> | null;
  metrics: Array<Record<string, unknown>>;
  warnings: unknown[];
  errors: unknown[];
  details: Record<string, unknown> | null;
};

export const parseResultPayloadText = (payloadText: string): ParsedResultPayload | null => {
  if (!payloadText.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(payloadText) as Record<string, unknown>;
    return parseResultPayload(parsed);
  } catch {
    return null;
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const parseResultPayload = (payload: unknown): ParsedResultPayload | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const summary = isRecord(payload.summary) ? payload.summary : null;
  const metrics = Array.isArray(payload.metrics)
    ? (payload.metrics as Array<Record<string, unknown>>)
    : [];
  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const details = isRecord(payload.details) ? payload.details : null;

  // 至少需要 summary 或 metrics 或 details 中有一项有效数据
  if (!summary && metrics.length === 0 && !details) {
    return null;
  }

  return {
    schemaVersion: typeof payload.schemaVersion === 'string' ? payload.schemaVersion : 'unknown',
    summary,
    metrics,
    warnings,
    errors,
    details,
  };
};
