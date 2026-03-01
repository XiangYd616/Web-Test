import { query } from '../../config/database';

type SecurityTestResultData = {
  testResultId: number;
  vulnerabilities: Record<string, unknown>;
  securityHeaders: Record<string, unknown>;
  sslInfo: Record<string, unknown>;
  contentSecurityPolicy: Record<string, unknown>;
  recommendations: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  extendedChecks: Record<string, unknown>;
};

const securityTestResultRepository = {
  async upsert(data: SecurityTestResultData): Promise<void> {
    await query(
      `INSERT INTO security_test_results (
         test_result_id,
         vulnerabilities,
         security_headers,
         ssl_info,
         content_security_policy,
         recommendations,
         risk_level,
         extended_checks
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (test_result_id)
       DO UPDATE SET
         vulnerabilities = EXCLUDED.vulnerabilities,
         security_headers = EXCLUDED.security_headers,
         ssl_info = EXCLUDED.ssl_info,
         content_security_policy = EXCLUDED.content_security_policy,
         recommendations = EXCLUDED.recommendations,
         risk_level = EXCLUDED.risk_level,
         extended_checks = EXCLUDED.extended_checks`,
      [
        data.testResultId,
        JSON.stringify(data.vulnerabilities),
        JSON.stringify(data.securityHeaders),
        JSON.stringify(data.sslInfo),
        JSON.stringify(data.contentSecurityPolicy),
        JSON.stringify(data.recommendations),
        data.riskLevel,
        JSON.stringify(data.extendedChecks),
      ]
    );
  },

  async getByTestResultId(testResultId: number): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT vulnerabilities, security_headers, ssl_info, content_security_policy, recommendations, risk_level, extended_checks
       FROM security_test_results
       WHERE test_result_id = $1
       LIMIT 1`,
      [testResultId]
    );

    const row = (result.rows?.[0] || null) as {
      vulnerabilities?: unknown;
      security_headers?: unknown;
      ssl_info?: unknown;
      content_security_policy?: unknown;
      recommendations?: unknown;
      risk_level?: unknown;
      extended_checks?: unknown;
    } | null;

    if (!row) {
      return null;
    }

    const vulnerabilities =
      row.vulnerabilities &&
      typeof row.vulnerabilities === 'object' &&
      !Array.isArray(row.vulnerabilities)
        ? (row.vulnerabilities as Record<string, unknown>)
        : {};
    const securityHeaders =
      row.security_headers &&
      typeof row.security_headers === 'object' &&
      !Array.isArray(row.security_headers)
        ? (row.security_headers as Record<string, unknown>)
        : {};
    const sslInfo =
      row.ssl_info && typeof row.ssl_info === 'object' && !Array.isArray(row.ssl_info)
        ? (row.ssl_info as Record<string, unknown>)
        : {};
    const contentSecurityPolicy =
      row.content_security_policy &&
      typeof row.content_security_policy === 'object' &&
      !Array.isArray(row.content_security_policy)
        ? (row.content_security_policy as Record<string, unknown>)
        : {};
    const recommendations =
      row.recommendations &&
      typeof row.recommendations === 'object' &&
      !Array.isArray(row.recommendations)
        ? (row.recommendations as Record<string, unknown>)
        : {};

    const riskLevel =
      typeof row.risk_level === 'string'
        ? row.risk_level
        : row.risk_level
          ? String(row.risk_level)
          : 'low';

    const extendedChecks =
      row.extended_checks &&
      typeof row.extended_checks === 'object' &&
      !Array.isArray(row.extended_checks)
        ? (row.extended_checks as Record<string, unknown>)
        : {};

    return {
      vulnerabilities,
      securityHeaders,
      sslInfo,
      contentSecurityPolicy,
      recommendations,
      riskLevel,
      // 重建 results.checks 结构，供前端通过 details.results.checks.* 路径提取
      results: {
        checks: {
          ssl: sslInfo,
          headers: securityHeaders,
          vulnerabilities,
          ...(extendedChecks as Record<string, unknown>),
        },
        recommendations,
      },
    };
  },
};

export default securityTestResultRepository;
