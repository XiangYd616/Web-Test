/**
 * 桌面端 database stub —— 引擎代码中 import { query } from '../../config/database'
 * 在桌面端不需要 PostgreSQL，query 返回空结果即可（SEO 引擎的 ScoreCalculator / ReportGenerator 用它查历史数据）
 */
export const query = async (): Promise<{ rows: never[] }> => ({ rows: [] });
export const connectDB = async (): Promise<void> => {};
export default { query, connectDB };
