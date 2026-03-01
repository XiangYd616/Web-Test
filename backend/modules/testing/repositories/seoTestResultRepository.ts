import { query } from '../../config/database';

/** 安全 JSON 序列化：遇到循环引用时自动跳过 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val !== null && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
}

type SeoTestResultData = {
  testResultId: number;
  metaTags: Record<string, unknown>;
  headings: Record<string, unknown>;
  images: Record<string, unknown>;
  links: Record<string, unknown>;
  structuredData: Record<string, unknown>;
  mobileFriendly: boolean;
  pageSpeedScore: number;
  checksData?: Record<string, unknown>;
};

const seoTestResultRepository = {
  async upsert(data: SeoTestResultData): Promise<void> {
    await query(
      `INSERT INTO seo_test_results (
         test_result_id,
         meta_tags,
         headings,
         images,
         links,
         structured_data,
         mobile_friendly,
         page_speed_score,
         checks_data
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (test_result_id)
       DO UPDATE SET
         meta_tags = EXCLUDED.meta_tags,
         headings = EXCLUDED.headings,
         images = EXCLUDED.images,
         links = EXCLUDED.links,
         structured_data = EXCLUDED.structured_data,
         mobile_friendly = EXCLUDED.mobile_friendly,
         page_speed_score = EXCLUDED.page_speed_score,
         checks_data = EXCLUDED.checks_data`,
      [
        data.testResultId,
        safeStringify(data.metaTags),
        safeStringify(data.headings),
        safeStringify(data.images),
        safeStringify(data.links),
        safeStringify(data.structuredData),
        data.mobileFriendly,
        data.pageSpeedScore,
        safeStringify(data.checksData || {}),
      ]
    );
  },

  async getByTestResultId(testResultId: number): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT meta_tags, headings, images, links, structured_data, mobile_friendly, page_speed_score, checks_data
       FROM seo_test_results
       WHERE test_result_id = $1
       LIMIT 1`,
      [testResultId]
    );

    const row = (result.rows?.[0] || null) as {
      meta_tags?: unknown;
      headings?: unknown;
      images?: unknown;
      links?: unknown;
      structured_data?: unknown;
      mobile_friendly?: unknown;
      page_speed_score?: unknown;
      checks_data?: unknown;
    } | null;

    if (!row) {
      return null;
    }

    const parseJson = (val: unknown): Record<string, unknown> => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return val as Record<string, unknown>;
      }
      if (typeof val === 'string') {
        try {
          return JSON.parse(val) as Record<string, unknown>;
        } catch {
          return {};
        }
      }
      return {};
    };

    const metaTags = parseJson(row.meta_tags);
    const headings = parseJson(row.headings);
    const images = parseJson(row.images);
    const links = parseJson(row.links);
    const structuredData = parseJson(row.structured_data);
    const checksData = parseJson(row.checks_data);
    const mobileFriendly = Boolean(row.mobile_friendly);
    const pageSpeedScore = Number(row.page_speed_score ?? 0);

    return {
      metaTags,
      headings,
      images,
      links,
      structuredData,
      mobileFriendly,
      pageSpeedScore,
      checksData,
      checks: checksData,
    };
  },
};

export default seoTestResultRepository;
