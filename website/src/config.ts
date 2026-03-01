/**
 * 主应用的 URL 地址
 * 开发环境指向本地 Vite dev server，生产环境替换为实际部署地址
 */
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.xiangweb.space';

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiangweb.space/api';

export const GITHUB_URL = 'https://github.com/XiangYd616/Web-Test';
export const GITHUB_RELEASES_URL = `${GITHUB_URL}/releases`;
