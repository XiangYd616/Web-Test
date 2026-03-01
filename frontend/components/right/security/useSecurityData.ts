/**
 * 安全测试数据提取 hook — 供概览/漏洞列表/合规检查三个面板共享
 */
import { useCallback, useMemo } from 'react';

import { useTestResult } from '../../../context/TestContext';
import { severityColor } from '../../../utils/colors';
import { parseResultPayloadText } from '../../../utils/testResult';

// ── 类型 ──

export type SeverityKey = 'critical' | 'high' | 'medium' | 'low' | 'info';
export const severityOrder: SeverityKey[] = ['critical', 'high', 'medium', 'low', 'info'];

export type VulnerabilityItem = {
  severity?: unknown;
  level?: unknown;
  risk?: unknown;
  name?: unknown;
  title?: unknown;
  description?: unknown;
  message?: unknown;
  url?: unknown;
  path?: unknown;
  parameter?: unknown;
  evidence?: unknown;
  remediation?: unknown;
  type?: unknown;
  category?: unknown;
  [key: string]: unknown;
};

export type SecurityRecommendationItem = {
  priority?: unknown;
  issue?: unknown;
  action?: unknown;
  timeframe?: unknown;
  [key: string]: unknown;
};

export type HeaderCheckItem = {
  key: string;
  label: string;
  shortLabel: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  exists: boolean;
  value: string;
  score: number;
  issues: string[];
  recommendations: string[];
};

// ── helpers ──

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeSeverity = (value: unknown): SeverityKey => {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('critical')) return 'critical';
  if (raw.includes('high')) return 'high';
  if (raw.includes('medium')) return 'medium';
  if (raw.includes('low')) return 'low';
  return 'info';
};

export const getSeverityColor = severityColor;

// ── hook ──

export function useSecurityData() {
  const { resultPayloadText } = useTestResult();

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  const normalizedDetails = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) return null;
    const engineResult = (results as Record<string, unknown>).security;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult))
      return null;
    const details = (engineResult as { details?: unknown }).details;
    return details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : null;
  }, [parsedPayload]);

  const summaryFallback = useMemo<Record<string, unknown> | null>(() => {
    if (normalizedDetails) return null;
    const summary = parsedPayload?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    const s = summary as Record<string, unknown>;
    if (!s.securityChecks && !s.securityScore) return null;
    return {
      vulnerabilities: s.securityChecks
        ? (s.securityChecks as Record<string, unknown>).vulnerabilities
        : undefined,
      securityHeaders: s.securityChecks
        ? (s.securityChecks as Record<string, unknown>).headers
        : undefined,
      riskLevel: s.securityRating,
      recommendations: s.securityRecommendations,
    };
  }, [normalizedDetails, parsedPayload]);

  const securityDetails = useMemo(
    () => normalizedDetails || summaryFallback,
    [normalizedDetails, summaryFallback]
  );

  // results 层
  const resultsData = useMemo(() => {
    const raw = parsedPayload?.details?.results;
    if (!isRecord(raw)) return null;
    const eng = raw.security;
    if (!isRecord(eng)) return null;
    const det = (eng as { details?: unknown }).details;
    if (!isRecord(det)) return null;
    const res = (det as { results?: unknown }).results;
    if (!isRecord(res)) return null;
    return res;
  }, [parsedPayload]);

  // checks 层
  const checksData = useMemo(() => {
    if (!resultsData) return null;
    const checks = (resultsData as { checks?: unknown }).checks;
    if (!isRecord(checks)) return null;
    return checks;
  }, [resultsData]);

  // ── 漏洞列表 ──
  const vulns = useMemo(() => {
    const checksVulns = (resultsData as { checks?: { vulnerabilities?: unknown } } | null)?.checks
      ?.vulnerabilities;
    const raw =
      checksVulns ?? (securityDetails as { vulnerabilities?: unknown } | null)?.vulnerabilities;

    if (Array.isArray(raw)) {
      return raw
        .filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .map(item => item as VulnerabilityItem);
    }

    if (isRecord(raw)) {
      const items: VulnerabilityItem[] = [];
      const xss = (raw as { xss?: { vulnerabilities?: unknown[] } }).xss;
      if (xss && Array.isArray(xss.vulnerabilities)) {
        items.push(
          ...xss.vulnerabilities
            .filter(v => v && typeof v === 'object')
            .map(v => v as VulnerabilityItem)
        );
      }
      const sql = (raw as { sqlInjection?: { vulnerabilities?: unknown[] } }).sqlInjection;
      if (sql && Array.isArray(sql.vulnerabilities)) {
        items.push(
          ...sql.vulnerabilities
            .filter(v => v && typeof v === 'object')
            .map(v => v as VulnerabilityItem)
        );
      }
      const other = (raw as { other?: unknown[] }).other;
      if (Array.isArray(other)) {
        items.push(
          ...other.filter(v => v && typeof v === 'object').map(v => v as VulnerabilityItem)
        );
      }
      if (items.length > 0) return items;

      const maybeListKeys = ['items', 'list', 'vulnerabilities', 'results', 'data'];
      for (const key of maybeListKeys) {
        const candidate = raw[key];
        if (Array.isArray(candidate)) {
          return candidate
            .filter(item => item && typeof item === 'object' && !Array.isArray(item))
            .map(item => item as VulnerabilityItem);
        }
      }

      const countKeys = ['critical', 'high', 'medium', 'low', 'info'];
      const hasAnyCount = countKeys.some(k => typeof raw[k] === 'number');
      if (hasAnyCount) {
        countKeys.forEach(k => {
          const count = Number(raw[k] ?? 0);
          if (Number.isFinite(count) && count > 0) {
            for (let i = 0; i < Math.min(count, 50); i += 1) {
              items.push({ severity: k, title: k });
            }
          }
        });
        return items;
      }
    }

    return [] as VulnerabilityItem[];
  }, [securityDetails, resultsData]);

  // ── 修复建议 ──
  const recommendations = useMemo(() => {
    const raw =
      (resultsData as { recommendations?: unknown } | null)?.recommendations ??
      (securityDetails as { recommendations?: unknown } | null)?.recommendations;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const normalizeList = (value: unknown) => {
      if (!Array.isArray(value)) return [] as SecurityRecommendationItem[];
      return value
        .filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .map(item => item as SecurityRecommendationItem);
    };
    return {
      immediate: normalizeList(record.immediate),
      shortTerm: normalizeList(record.shortTerm),
      longTerm: normalizeList(record.longTerm),
      preventive: normalizeList(record.preventive),
    };
  }, [securityDetails, resultsData]);

  const recommendationsTotal = useMemo(() => {
    if (!recommendations) return 0;
    return (
      recommendations.immediate.length +
      recommendations.shortTerm.length +
      recommendations.longTerm.length +
      recommendations.preventive.length
    );
  }, [recommendations]);

  // ── 评分 / 风险 ──
  const overallScore = useMemo(() => {
    if (!resultsData) return null;
    const s = Number((resultsData as { score?: unknown }).score);
    return Number.isFinite(s) ? s : null;
  }, [resultsData]);

  const riskLevel = useMemo(() => {
    const raw =
      (resultsData as { rating?: unknown } | null)?.rating ??
      (securityDetails as { riskLevel?: unknown } | null)?.riskLevel;
    return String(raw ?? '').toLowerCase();
  }, [securityDetails, resultsData]);

  // ── 扫描完整性 ──
  const scanConfidence = useMemo(() => {
    if (!resultsData) return null;
    const conf = (resultsData as { scanConfidence?: string }).scanConfidence;
    const skipped = (resultsData as { skippedScans?: string[] }).skippedScans;
    const warnings = (resultsData as { _scanWarnings?: string[] })._scanWarnings;
    if (!conf) return null;
    return {
      level: conf as 'full' | 'partial' | 'minimal',
      skippedScans: Array.isArray(skipped) ? skipped : [],
      warnings: Array.isArray(warnings) ? warnings : [],
    };
  }, [resultsData]);

  // ── 合规 ──
  const complianceData = useMemo(() => {
    if (!resultsData) return null;
    const c = (resultsData as { compliance?: unknown }).compliance;
    if (!isRecord(c)) return null;
    return c as {
      owasp?: { status?: string; issues?: string[] };
      gdpr?: { status?: string; issues?: string[] };
      pci?: { status?: string; issues?: string[] };
    };
  }, [resultsData]);

  // ── SSL ──
  const sslData = useMemo(() => {
    if (!checksData) return null;
    const ssl = (checksData as { ssl?: unknown }).ssl;
    if (!isRecord(ssl)) return null;
    return ssl as {
      enabled?: boolean;
      version?: string;
      certificate?: { valid?: boolean; issuer?: string; expires?: string | null };
      score?: number;
      issues?: string[];
    };
  }, [checksData]);

  // ── 安全头 ──
  const headerChecks = useMemo((): HeaderCheckItem[] => {
    const checksHeaders = (resultsData as { checks?: { headers?: unknown } } | null)?.checks
      ?.headers;
    const raw =
      checksHeaders ?? (securityDetails as { securityHeaders?: unknown } | null)?.securityHeaders;

    const detailedHeaders = isRecord(raw)
      ? Array.isArray((raw as { headers?: unknown[] }).headers)
        ? ((raw as { headers: unknown[] }).headers as Array<Record<string, unknown>>)
        : []
      : [];

    const simpleHeaders = isRecord(raw)
      ? isRecord((raw as Record<string, unknown>).headers)
        ? ((raw as Record<string, unknown>).headers as Record<string, unknown>)
        : (raw as Record<string, unknown>)
      : {};

    const findHeader = (name: string) => {
      const target = name.toLowerCase();
      const direct = Object.entries(simpleHeaders).find(([k]) => k.toLowerCase() === target);
      if (direct) return direct[1];
      return undefined;
    };

    const findDetailedHeader = (label: string) => {
      return detailedHeaders.find(
        h => String(h.header ?? '').toLowerCase() === label.toLowerCase()
      );
    };

    const entries: Array<{
      key: string;
      label: string;
      shortLabel: string;
      importance: 'critical' | 'high' | 'medium' | 'low';
    }> = [
      { key: 'content-security-policy', label: 'Content-Security-Policy', shortLabel: 'CSP', importance: 'critical' },
      { key: 'strict-transport-security', label: 'Strict-Transport-Security', shortLabel: 'HSTS', importance: 'critical' },
      { key: 'x-frame-options', label: 'X-Frame-Options', shortLabel: 'X-Frame-Options', importance: 'high' },
      { key: 'x-content-type-options', label: 'X-Content-Type-Options', shortLabel: 'X-Content-Type', importance: 'high' },
      { key: 'x-xss-protection', label: 'X-XSS-Protection', shortLabel: 'X-XSS-Protection', importance: 'medium' },
      { key: 'referrer-policy', label: 'Referrer-Policy', shortLabel: 'Referrer-Policy', importance: 'medium' },
      { key: 'permissions-policy', label: 'Permissions-Policy', shortLabel: 'Permissions-Policy', importance: 'medium' },
      { key: 'cross-origin-embedder-policy', label: 'Cross-Origin-Embedder-Policy', shortLabel: 'COEP', importance: 'low' },
      { key: 'cross-origin-opener-policy', label: 'Cross-Origin-Opener-Policy', shortLabel: 'COOP', importance: 'low' },
      { key: 'cross-origin-resource-policy', label: 'Cross-Origin-Resource-Policy', shortLabel: 'CORP', importance: 'low' },
    ];

    return entries.map(item => {
      const detailed = findDetailedHeader(item.label);
      const simpleValue = findHeader(item.key);
      const exists = detailed
        ? Boolean(detailed.present)
        : simpleValue !== undefined && simpleValue !== null && String(simpleValue).trim() !== '';
      const value = detailed ? String(detailed.value ?? '') : exists ? String(simpleValue) : '';
      const score = detailed ? Number(detailed.score ?? 0) : exists ? 100 : 0;
      const issues = detailed && Array.isArray(detailed.issues) ? detailed.issues.map(String) : [];
      const recs =
        detailed && Array.isArray(detailed.recommendations)
          ? detailed.recommendations.map(String)
          : [];
      return { ...item, exists, value, score, issues, recommendations: recs };
    });
  }, [securityDetails, resultsData]);

  // ── Cookie ──
  const cookieData = useMemo(() => {
    if (!checksData) return null;
    const cookies = (checksData as { cookies?: unknown }).cookies;
    if (!isRecord(cookies)) return null;
    return cookies as {
      score?: number;
      totalCookies?: number;
      issues?: Array<{
        cookie?: string;
        attribute?: string;
        severity?: string;
        description?: string;
        remediation?: string;
      }>;
      details?: {
        secureCookies?: number;
        httpOnlyCookies?: number;
        sameSiteCookies?: number;
        sessionCookies?: number;
        persistentCookies?: number;
      };
    };
  }, [checksData]);

  // ── CORS ──
  const corsData = useMemo(() => {
    if (!checksData) return null;
    const cors = (checksData as { cors?: unknown }).cors;
    if (!isRecord(cors)) return null;
    return cors as {
      score?: number;
      issues?: Array<{
        type?: string;
        severity?: string;
        description?: string;
        evidence?: string;
        remediation?: string;
      }>;
      details?: {
        allowOrigin?: string | null;
        allowCredentials?: boolean;
        reflectsOrigin?: boolean;
        wildcardOrigin?: boolean;
        preflightEnabled?: boolean;
      };
    };
  }, [checksData]);

  // ── CSRF ──
  const csrfData = useMemo(() => {
    if (!checksData) return null;
    const csrf = (checksData as { csrf?: unknown }).csrf;
    if (!isRecord(csrf)) return null;
    return csrf as {
      score?: number;
      vulnerabilities?: Array<{
        type?: string;
        severity?: string;
        description?: string;
        evidence?: string;
        remediation?: string;
      }>;
      details?: {
        formsAnalyzed?: number;
        formsWithToken?: number;
        formsWithoutToken?: number;
        sameSiteCookieSet?: boolean;
        customHeaderRequired?: boolean;
      };
    };
  }, [checksData]);

  // ── 内容安全 ──
  const contentSecurityData = useMemo(() => {
    if (!checksData) return null;
    const cs = (checksData as { contentSecurity?: unknown }).contentSecurity;
    if (!isRecord(cs)) return null;
    return cs as {
      sri?: {
        score?: number;
        totalExternalResources?: number;
        resourcesWithSri?: number;
        resourcesWithoutSri?: number;
        issues?: Array<{ element?: string; src?: string; severity?: string; description?: string }>;
      };
      mixedContent?: {
        score?: number;
        isHttps?: boolean;
        totalMixedContent?: number;
        activeMixedContent?: number;
        passiveMixedContent?: number;
        issues?: Array<{
          element?: string;
          src?: string;
          type?: string;
          severity?: string;
          description?: string;
        }>;
      };
      httpMethods?: {
        score?: number;
        allowedMethods?: string[];
        dangerousMethods?: string[];
        issues?: Array<{
          method?: string;
          statusCode?: number;
          severity?: string;
          description?: string;
        }>;
      };
    };
  }, [checksData]);

  // ── 端口扫描 ──
  const portScanData = useMemo(() => {
    if (!checksData) return null;
    const ps = (checksData as { portScan?: unknown }).portScan;
    if (!isRecord(ps)) return null;
    return ps as {
      host?: string;
      totalScanned?: number;
      openPorts?: number;
      score?: number;
      riskLevel?: string;
      ports?: Array<{
        port: number;
        state: string;
        service?: string;
        risk?: string;
        riskDescription?: string;
        latency?: number;
      }>;
      recommendations?: string[];
    };
  }, [checksData]);

  // ── 威胁情报 ──
  const threatIntel = useMemo(() => {
    if (!resultsData) return null;
    const da = (resultsData as { detailedAnalysis?: unknown }).detailedAnalysis;
    if (!isRecord(da)) return null;
    const ti = (da as { threatIntelligence?: unknown }).threatIntelligence;
    if (!isRecord(ti)) return null;
    return ti as {
      threatLevel?: string;
      attackVectors?: Array<{ type?: string; risk?: string; description?: string }>;
      mitigationStrategies?: string[];
      industryTrends?: string[];
    };
  }, [resultsData]);

  // ── 截图 ──
  const screenshotData = useMemo(() => {
    if (!resultsData) return null;
    const ss = (resultsData as { screenshot?: unknown }).screenshot;
    if (!isRecord(ss)) return null;
    return ss as {
      data?: string;
      format?: string;
      width?: number;
      height?: number;
      pageTitle?: string;
      finalUrl?: string;
    };
  }, [resultsData]);

  // ── 统计 ──
  const severityCounts = useMemo(() => {
    const initial: Record<SeverityKey, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    vulns.forEach(v => {
      const sev = normalizeSeverity(v.severity ?? v.level ?? v.risk);
      initial[sev] += 1;
    });
    return initial;
  }, [vulns]);

  const totalVulns = severityOrder.reduce((sum, k) => sum + severityCounts[k], 0);

  const headerStats = useMemo(() => {
    const present = headerChecks.filter(h => h.exists).length;
    const missing = headerChecks.filter(h => !h.exists).length;
    const avgScore =
      headerChecks.length > 0
        ? Math.round(headerChecks.reduce((s, h) => s + h.score, 0) / headerChecks.length)
        : 0;
    return { present, missing, total: headerChecks.length, avgScore };
  }, [headerChecks]);

  // ── 复制工具 ──
  const copyText = useCallback(async (text: string, successMsg: string) => {
    const { toast } = await import('sonner');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMsg);
    } catch {
      toast.error('复制失败');
    }
  }, []);

  return {
    // 原始数据
    resultsData,
    securityDetails,
    checksData,
    // 漏洞
    vulns,
    severityCounts,
    totalVulns,
    // 合规
    headerChecks,
    headerStats,
    sslData,
    cookieData,
    corsData,
    contentSecurityData,
    complianceData,
    // 漏洞相关
    csrfData,
    portScanData,
    threatIntel,
    screenshotData,
    // 通用
    overallScore,
    riskLevel,
    scanConfidence,
    recommendations,
    recommendationsTotal,
    // 工具
    copyText,
  };
}
