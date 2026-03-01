/**
 * 导入导出互通服务
 * 支持与其他测试工具的数据交换：
 * - Postman Collection v2.1 导入/导出
 * - Swagger/OpenAPI 3.0 导入
 * - HAR (HTTP Archive) 导入
 * - 本项目 JSON 格式导入/导出
 */

import type { CollectionDetail } from './collectionApi';
import type { EnvironmentDetail, EnvironmentVariable } from './environmentApi';

// ─── Postman Collection v2.1 类型 ───

type PostmanHeader = { key: string; value: string; disabled?: boolean };
type PostmanQuery = { key: string; value: string; disabled?: boolean };
type PostmanBody = {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  options?: { raw?: { language?: string } };
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean; description?: string }>;
  formdata?: Array<{
    key: string;
    value: string;
    type?: string;
    disabled?: boolean;
    description?: string;
  }>;
  graphql?: { query?: string; variables?: string };
};
type PostmanUrl = {
  raw?: string;
  protocol?: string;
  host?: string[] | string;
  path?: string[] | string;
  query?: PostmanQuery[];
  variable?: Array<{ key: string; value?: string; description?: string }>;
};
type PostmanAuth = {
  type: string;
  basic?: Array<{ key: string; value: string }>;
  bearer?: Array<{ key: string; value: string }>;
  apikey?: Array<{ key: string; value: string }>;
  oauth2?: Array<{ key: string; value: string }>;
};
type PostmanRequest = {
  method?: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url?: PostmanUrl | string;
  auth?: PostmanAuth;
  description?: string;
};
type PostmanItem = {
  name: string;
  request?: PostmanRequest;
  response?: unknown[];
  item?: PostmanItem[];
  description?: string;
};
type PostmanCollection = {
  info: {
    name: string;
    description?: string;
    schema?: string;
    _postman_id?: string;
  };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: string; type?: string }>;
  auth?: PostmanAuth;
};

// ─── Postman Environment 类型 ───

type PostmanEnvironment = {
  name: string;
  values: Array<{
    key: string;
    value: string;
    type?: string;
    enabled?: boolean;
  }>;
  _postman_variable_scope?: string;
};

// ─── Swagger/OpenAPI 类型（简化） ───

type SwaggerParameter = {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body';
  required?: boolean;
  schema?: { type?: string; default?: unknown };
  description?: string;
};
type SwaggerRequestBody = {
  content?: Record<string, { schema?: Record<string, unknown>; example?: unknown }>;
  required?: boolean;
};
type SwaggerOperation = {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  tags?: string[];
};
type SwaggerPathItem = {
  get?: SwaggerOperation;
  post?: SwaggerOperation;
  put?: SwaggerOperation;
  delete?: SwaggerOperation;
  patch?: SwaggerOperation;
  options?: SwaggerOperation;
  head?: SwaggerOperation;
};
type SwaggerDoc = {
  openapi?: string;
  swagger?: string;
  info: { title: string; description?: string; version?: string };
  servers?: Array<{ url: string; description?: string }>;
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, SwaggerPathItem>;
};

// ─── HAR 类型（简化） ───

type HarEntry = {
  request: {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
    queryString: Array<{ name: string; value: string }>;
    postData?: { mimeType?: string; text?: string };
  };
  response?: {
    status: number;
    statusText?: string;
    headers?: Array<{ name: string; value: string }>;
    content?: { text?: string; mimeType?: string };
  };
};
type HarLog = {
  log: {
    version?: string;
    entries: HarEntry[];
  };
};

// ═══════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════

/** 从 Postman 结构化 URL 对象组装完整 URL 字符串 */
const resolvePostmanUrl = (url: PostmanUrl | string | undefined): string => {
  if (!url) return '';
  if (typeof url === 'string') return url;
  if (url.raw) return url.raw;
  const protocol = url.protocol ? `${url.protocol}://` : 'https://';
  const host = Array.isArray(url.host) ? url.host.join('.') : url.host || '';
  const pathStr = Array.isArray(url.path) ? url.path.join('/') : url.path || '';
  const queryStr =
    url.query
      ?.filter(q => !q.disabled)
      .map(q => `${q.key}=${q.value}`)
      .join('&') || '';
  return `${protocol}${host}${pathStr ? '/' + pathStr : ''}${queryStr ? '?' + queryStr : ''}`;
};

/** 提取 Postman URL 的 query 参数为 Record */
const extractPostmanQuery = (url: PostmanUrl | string | undefined): Record<string, string> => {
  if (!url || typeof url === 'string') return {};
  const params: Record<string, string> = {};
  if (url.query) {
    for (const q of url.query) {
      if (!q.disabled) params[q.key] = q.value;
    }
  }
  return params;
};

/** 将 Postman body 转为项目内部格式 */
const convertPostmanBody = (body: PostmanBody | undefined): { body: unknown; bodyMode: string } => {
  if (!body || !body.mode) return { body: '', bodyMode: 'none' };
  switch (body.mode) {
    case 'raw':
      return { body: body.raw || '', bodyMode: 'raw' };
    case 'urlencoded': {
      const params: Record<string, string> = {};
      for (const item of body.urlencoded || []) {
        if (!item.disabled) params[item.key] = item.value;
      }
      return { body: params, bodyMode: 'urlencoded' };
    }
    case 'formdata': {
      const fields = (body.formdata || [])
        .filter(f => !f.disabled)
        .map(f => ({
          key: f.key,
          value: f.value,
          type: f.type || 'text',
        }));
      return { body: fields, bodyMode: 'formdata' };
    }
    case 'graphql':
      return {
        body: { query: body.graphql?.query || '', variables: body.graphql?.variables || '' },
        bodyMode: 'graphql',
      };
    default:
      return { body: body.raw || '', bodyMode: body.mode };
  }
};

/** Postman auth → 项目内部 auth Record */
const convertPostmanAuth = (auth: PostmanAuth | undefined): Record<string, unknown> | null => {
  if (!auth || auth.type === 'noauth') return null;
  const findVal = (arr: Array<{ key: string; value: string }> | undefined, key: string) =>
    arr?.find(a => a.key === key)?.value || '';
  switch (auth.type) {
    case 'basic':
      return {
        type: 'basic',
        basic: {
          username: findVal(auth.basic, 'username'),
          password: findVal(auth.basic, 'password'),
        },
      };
    case 'bearer':
      return { type: 'bearer', bearer: { token: findVal(auth.bearer, 'token') } };
    case 'apikey':
      return {
        type: 'apikey',
        apikey: {
          key: findVal(auth.apikey, 'key'),
          value: findVal(auth.apikey, 'value'),
          addTo: findVal(auth.apikey, 'in') || 'header',
        },
      };
    case 'oauth2':
      return {
        type: 'oauth2',
        oauth2: {
          clientId: findVal(auth.oauth2, 'clientId'),
          clientSecret: findVal(auth.oauth2, 'clientSecret'),
          scope: findVal(auth.oauth2, 'scope'),
          tokenUrl: findVal(auth.oauth2, 'accessTokenUrl'),
        },
      };
    default:
      return { type: auth.type, _raw: auth };
  }
};

/** 项目内部 auth → Postman auth */
const convertToPostmanAuth = (
  auth: Record<string, unknown> | null | undefined
): PostmanAuth | undefined => {
  if (!auth) return undefined;
  const type = String(auth.type || 'noauth');
  const toArr = (obj: Record<string, unknown> | undefined) =>
    obj ? Object.entries(obj).map(([key, value]) => ({ key, value: String(value ?? '') })) : [];
  switch (type) {
    case 'basic':
      return { type: 'basic', basic: toArr(auth.basic as Record<string, unknown>) };
    case 'bearer':
      return { type: 'bearer', bearer: toArr(auth.bearer as Record<string, unknown>) };
    case 'apikey':
      return { type: 'apikey', apikey: toArr(auth.apikey as Record<string, unknown>) };
    case 'oauth2':
      return { type: 'oauth2', oauth2: toArr(auth.oauth2 as Record<string, unknown>) };
    default:
      return { type: 'noauth' };
  }
};

// ═══════════════════════════════════════════
// 导入功能
// ═══════════════════════════════════════════

/**
 * 从 Postman Collection v2.1 JSON 导入
 */
export const importPostmanCollection = (json: string): CollectionDetail => {
  const data = JSON.parse(json) as PostmanCollection;
  if (!data.info?.name) throw new Error('无效的 Postman Collection 格式');

  const folders: Array<Record<string, unknown>> = [];

  const flattenItems = (
    items: PostmanItem[],
    prefix = '',
    parentFolderId?: string
  ): Array<Record<string, unknown>> => {
    const result: Array<Record<string, unknown>> = [];
    for (const item of items) {
      const fullName = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.item && item.item.length > 0) {
        const folderId = `folder_${folders.length}`;
        folders.push({
          id: folderId,
          name: item.name,
          description: item.description || '',
          parentId: parentFolderId,
        });
        result.push(...flattenItems(item.item, fullName, folderId));
      } else if (item.request) {
        const req = item.request;
        const urlStr = resolvePostmanUrl(req.url);
        const params = extractPostmanQuery(req.url);
        const headers: Record<string, string> = {};
        if (req.header) {
          for (const h of req.header) {
            if (!h.disabled) headers[h.key] = h.value;
          }
        }
        const { body, bodyMode } = convertPostmanBody(req.body);
        const auth = convertPostmanAuth(req.auth);
        result.push({
          name: fullName,
          method: req.method || 'GET',
          url: urlStr,
          headers,
          params,
          body,
          bodyMode,
          auth,
          description: req.description || item.description || '',
          folderId: parentFolderId,
        });
      }
    }
    return result;
  };

  const variables: Record<string, string> = {};
  if (data.variable) {
    for (const v of data.variable) {
      variables[v.key] = v.value;
    }
  }

  return {
    id: '',
    name: data.info.name,
    description: data.info.description || '',
    requests: flattenItems(data.item),
    variables,
    auth: convertPostmanAuth(data.auth),
    folders,
    metadata: { importedFrom: 'postman', schema: data.info.schema },
  };
};

/**
 * 从 Postman Environment JSON 导入
 */
export const importPostmanEnvironment = (json: string): EnvironmentDetail => {
  const data = JSON.parse(json) as PostmanEnvironment;
  if (!data.name) throw new Error('无效的 Postman Environment 格式');

  const variables: EnvironmentVariable[] = (data.values || []).map(v => ({
    key: v.key,
    value: v.value,
    type: v.type === 'secret' ? 'secret' : 'default',
    enabled: v.enabled !== false,
  }));

  return {
    id: '',
    name: data.name,
    description: `从 Postman 导入的环境: ${data.name}`,
    variables,
    config: {},
    metadata: { importedFrom: 'postman' },
  };
};

/**
 * 从 Swagger/OpenAPI 文档导入为 Collection
 * 支持 OpenAPI 3.x 和 Swagger 2.x
 */
export const importSwaggerDoc = (json: string): CollectionDetail => {
  const data = JSON.parse(json) as SwaggerDoc;
  if (!data.paths) throw new Error('无效的 Swagger/OpenAPI 格式');

  let baseUrl = '';
  if (data.servers && data.servers.length > 0) {
    baseUrl = data.servers[0].url.replace(/\/$/, '');
  } else if (data.host) {
    const scheme = data.schemes?.[0] || 'https';
    baseUrl = `${scheme}://${data.host}${data.basePath || ''}`.replace(/\/$/, '');
  }

  const requests: Array<Record<string, unknown>> = [];
  const folders: Array<Record<string, unknown>> = [];
  const tagFolderMap = new Map<string, string>();
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  for (const [pathTemplate, pathItem] of Object.entries(data.paths)) {
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const headers: Record<string, string> = {};
      const queryParams: Record<string, string> = {};
      let resolvedPath = pathTemplate;

      if (operation.parameters) {
        for (const param of operation.parameters) {
          const defaultVal = param.schema?.default != null ? String(param.schema.default) : '';
          switch (param.in) {
            case 'header':
              headers[param.name] = defaultVal;
              break;
            case 'query':
              queryParams[param.name] = defaultVal;
              break;
            case 'path':
              resolvedPath = resolvedPath.replace(
                `{${param.name}}`,
                defaultVal || `:${param.name}`
              );
              break;
            case 'cookie':
              headers['Cookie'] = headers['Cookie']
                ? `${headers['Cookie']}; ${param.name}=${defaultVal}`
                : `${param.name}=${defaultVal}`;
              break;
          }
        }
      }

      let body = '';
      let bodyMode = 'none';
      if (operation.requestBody?.content) {
        const jsonContent = operation.requestBody.content['application/json'];
        const formContent = operation.requestBody.content['application/x-www-form-urlencoded'];
        if (jsonContent?.example) {
          body = JSON.stringify(jsonContent.example, null, 2);
          bodyMode = 'raw';
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        } else if (jsonContent?.schema) {
          body = JSON.stringify(jsonContent.schema, null, 2);
          bodyMode = 'raw';
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        } else if (formContent) {
          bodyMode = 'urlencoded';
          if (!headers['Content-Type'])
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }

      const queryString = Object.entries(queryParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      const fullUrl = `${baseUrl}${resolvedPath}${queryString ? '?' + queryString : ''}`;

      const name =
        operation.summary || operation.operationId || `${method.toUpperCase()} ${pathTemplate}`;
      const tags = operation.tags || [];

      let folderId: string | undefined;
      if (tags.length > 0) {
        const tag = tags[0];
        if (!tagFolderMap.has(tag)) {
          const id = `folder_${folders.length}`;
          folders.push({ id, name: tag, description: '' });
          tagFolderMap.set(tag, id);
        }
        folderId = tagFolderMap.get(tag);
      }

      requests.push({
        name: tags.length > 0 ? `${tags[0]}/${name}` : name,
        method: method.toUpperCase(),
        url: fullUrl,
        headers,
        params: queryParams,
        body,
        bodyMode,
        description: operation.description || '',
        folderId,
      });
    }
  }

  return {
    id: '',
    name: data.info.title || 'Swagger Import',
    description: data.info.description || `从 OpenAPI ${data.openapi || data.swagger || ''} 导入`,
    requests,
    variables: {},
    auth: null,
    folders,
    metadata: {
      importedFrom: 'swagger',
      version: data.openapi || data.swagger,
      baseUrl,
    },
  };
};

/**
 * 从 HAR (HTTP Archive) 文件导入
 * @param options.dedupe  按 method+pathname 去重，仅保留最后一次请求（默认 true）
 * @param options.skipStaticAssets 跳过静态资源请求（css/js/img/font，默认 true）
 */
export const importHarFile = (
  json: string,
  options: { dedupe?: boolean; skipStaticAssets?: boolean } = {}
): CollectionDetail => {
  const { dedupe = true, skipStaticAssets = true } = options;
  const data = JSON.parse(json) as HarLog;
  if (!data.log?.entries) throw new Error('无效的 HAR 格式');

  const STATIC_EXT = /\.(css|js|mjs|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|map)$/i;
  const SKIP_HEADERS = new Set([
    'accept-encoding',
    'connection',
    'host',
    'user-agent',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-fetch-dest',
    'sec-fetch-mode',
    'sec-fetch-site',
    'upgrade-insecure-requests',
    'dnt',
  ]);

  const rawRequests: Array<Record<string, unknown>> = [];

  for (const entry of data.log.entries) {
    const req = entry.request;

    let urlPath: string;
    const params: Record<string, string> = {};
    try {
      const parsed = new URL(req.url);
      urlPath = parsed.pathname;
      if (skipStaticAssets && STATIC_EXT.test(urlPath)) continue;
      parsed.searchParams.forEach((v, k) => {
        params[k] = v;
      });
    } catch {
      urlPath = req.url;
    }

    const headers: Record<string, string> = {};
    for (const h of req.headers) {
      if (!h.name.startsWith(':') && !SKIP_HEADERS.has(h.name.toLowerCase())) {
        headers[h.name] = h.value;
      }
    }

    // query string 参数（补充从 HAR 原生字段）
    if (req.queryString) {
      for (const q of req.queryString) {
        params[q.name] = q.value;
      }
    }

    const bodyMode = req.postData?.text ? 'raw' : 'none';
    const response = entry.response
      ? {
          status: entry.response.status,
          statusText: entry.response.statusText || '',
          headers: Object.fromEntries((entry.response.headers || []).map(h => [h.name, h.value])),
          body: entry.response.content?.text || '',
          mimeType: entry.response.content?.mimeType || '',
        }
      : undefined;

    rawRequests.push({
      name: `${req.method} ${urlPath}`,
      method: req.method,
      url: req.url,
      headers,
      params,
      body: req.postData?.text || '',
      bodyMode,
      description: '',
      metadata: response ? { sampleResponse: response } : {},
    });
  }

  // 去重：按 method+pathname 保留最后一次
  let requests = rawRequests;
  if (dedupe) {
    const seen = new Map<string, number>();
    for (let i = 0; i < rawRequests.length; i++) {
      const key = `${rawRequests[i].method}|${rawRequests[i].name}`;
      seen.set(key, i);
    }
    requests = [...seen.values()].sort((a, b) => a - b).map(i => rawRequests[i]);
  }

  return {
    id: '',
    name: `HAR Import (${requests.length} requests)`,
    description: `从 HAR 文件导入的 ${requests.length} 个请求`,
    requests,
    variables: {},
    auth: null,
    folders: [],
    metadata: {
      importedFrom: 'har',
      version: data.log.version,
      originalEntries: data.log.entries.length,
    },
  };
};

/**
 * 从本项目 JSON 格式导入 Collection
 */
export const importNativeCollection = (json: string): CollectionDetail => {
  const data = JSON.parse(json) as CollectionDetail & { _format?: string };
  if (!data.name) throw new Error('无效的 Collection 格式');
  return { ...data, id: '' };
};

/**
 * 从本项目 JSON 格式导入 Environment
 */
export const importNativeEnvironment = (json: string): EnvironmentDetail => {
  const data = JSON.parse(json) as EnvironmentDetail & { _format?: string };
  if (!data.name) throw new Error('无效的 Environment 格式');
  return { ...data, id: '' };
};

/**
 * 检测 JSON 内容的格式类型
 */
export const detectFormat = (
  json: string
): 'postman' | 'postman-env' | 'swagger' | 'har' | 'native' | 'native-env' | 'unknown' => {
  try {
    const data = JSON.parse(json);
    if (data.info?.schema?.includes('postman') || data.info?._postman_id) return 'postman';
    if (data.values && Array.isArray(data.values) && data.name && !data.requests)
      return 'postman-env';
    if (data.openapi || data.swagger || data.paths) return 'swagger';
    if (data.log?.entries) return 'har';
    if (data._format === 'testweb-environment' || (data.name && data.variables && !data.requests))
      return 'native-env';
    if (data.name && (data.requests || data.folders)) return 'native';
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * 自动检测文件格式并导入为 Collection
 */
export const autoDetectAndImportCollection = (
  json: string
): { format: string; collection: CollectionDetail } => {
  const format = detectFormat(json);
  switch (format) {
    case 'postman':
      return { format: 'postman', collection: importPostmanCollection(json) };
    case 'swagger':
      return { format: 'swagger', collection: importSwaggerDoc(json) };
    case 'har':
      return { format: 'har', collection: importHarFile(json) };
    case 'native':
      return { format: 'native', collection: importNativeCollection(json) };
    default:
      throw new Error(
        '无法识别的文件格式。支持：Postman Collection、Swagger/OpenAPI、HAR、本项目 JSON'
      );
  }
};

/**
 * 自动检测文件格式并导入为 Environment
 */
export const autoDetectAndImportEnvironment = (
  json: string
): { format: string; environment: EnvironmentDetail } => {
  const format = detectFormat(json);
  switch (format) {
    case 'postman-env':
      return { format: 'postman', environment: importPostmanEnvironment(json) };
    case 'native-env':
      return { format: 'native', environment: importNativeEnvironment(json) };
    default:
      throw new Error('无法识别的环境文件格式。支持：Postman Environment、本项目 JSON');
  }
};

/**
 * 从 cURL 命令导入为单个请求
 */
export const importCurl = (curlStr: string): Record<string, unknown> => {
  const input = curlStr.trim().replace(/\\\n\s*/g, ' ');
  if (!input.toLowerCase().startsWith('curl')) throw new Error('无效的 cURL 命令');

  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let body = '';
  let bodyMode = 'none';

  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '-X' || t === '--request') {
      method = (tokens[++i] || 'GET').toUpperCase();
    } else if (t === '-H' || t === '--header') {
      const hdr = tokens[++i] || '';
      const colonIdx = hdr.indexOf(':');
      if (colonIdx > 0) {
        headers[hdr.slice(0, colonIdx).trim()] = hdr.slice(colonIdx + 1).trim();
      }
    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
      body = tokens[++i] || '';
      bodyMode = 'raw';
      if (method === 'GET') method = 'POST';
    } else if (t === '--data-urlencode') {
      body += (body ? '&' : '') + (tokens[++i] || '');
      bodyMode = 'urlencoded';
      if (method === 'GET') method = 'POST';
    } else if (t === '-u' || t === '--user') {
      const creds = tokens[++i] || '';
      headers['Authorization'] = 'Basic ' + btoa(creds);
    } else if (!t.startsWith('-') && !url) {
      url = t;
    }
  }

  const params: Record<string, string> = {};
  let name = url;
  try {
    const parsed = new URL(url);
    name = `${method} ${parsed.pathname}`;
    parsed.searchParams.forEach((v, k) => {
      params[k] = v;
    });
  } catch {
    /* keep raw url as name */
  }

  return {
    name,
    method,
    url,
    headers,
    params,
    body,
    bodyMode,
    description: `Imported from cURL`,
  };
};

// ═══════════════════════════════════════════
// 导出功能
// ═══════════════════════════════════════════

/**
 * 导出为 Postman Collection v2.1 格式
 * 支持文件夹嵌套、URL 结构化、多种 body mode、auth 转换
 */
export const exportToPostmanCollection = (collection: CollectionDetail): string => {
  const requests = collection.requests || [];
  const folders = collection.folders || [];

  /** 将单个请求转为 PostmanItem */
  const reqToPostmanItem = (req: Record<string, unknown>): PostmanItem => {
    const method = String(req.method || 'GET');
    const rawUrl = String(req.url || '');
    const headers = req.headers as Record<string, string> | undefined;
    const params = req.params as Record<string, string> | undefined;
    const bodyMode = String(req.bodyMode || 'none');
    const auth = req.auth as Record<string, unknown> | undefined;

    // 构建结构化 URL
    let postmanUrl: PostmanUrl;
    try {
      const parsed = new URL(rawUrl);
      const query: PostmanQuery[] = [];
      parsed.searchParams.forEach((v, k) => query.push({ key: k, value: v }));
      // 补充 params 字段中不在 URL 里的参数
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (!query.some(q => q.key === k)) query.push({ key: k, value: v });
        }
      }
      postmanUrl = {
        raw: rawUrl,
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname.split('.'),
        path: parsed.pathname.replace(/^\//, '').split('/'),
        query: query.length > 0 ? query : undefined,
      };
    } catch {
      postmanUrl = { raw: rawUrl };
    }

    // 构建 body
    let postmanBody: PostmanBody | undefined;
    if (bodyMode !== 'none' && method !== 'GET') {
      switch (bodyMode) {
        case 'urlencoded': {
          const bodyObj = req.body as Record<string, string> | undefined;
          postmanBody = {
            mode: 'urlencoded',
            urlencoded: bodyObj
              ? Object.entries(bodyObj).map(([key, value]) => ({ key, value }))
              : [],
          };
          break;
        }
        case 'formdata': {
          const fields = req.body as
            | Array<{ key: string; value: string; type?: string }>
            | undefined;
          postmanBody = {
            mode: 'formdata',
            formdata: (fields || []).map(f => ({ key: f.key, value: f.value, type: f.type })),
          };
          break;
        }
        case 'graphql': {
          const gql = req.body as { query?: string; variables?: string } | undefined;
          postmanBody = {
            mode: 'graphql',
            graphql: { query: gql?.query || '', variables: gql?.variables || '' },
          };
          break;
        }
        default: {
          const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');
          postmanBody = {
            mode: 'raw',
            raw,
            options: { raw: { language: 'json' } },
          };
          break;
        }
      }
    }

    return {
      name: String(req.name || rawUrl),
      request: {
        method,
        header: headers ? Object.entries(headers).map(([key, value]) => ({ key, value })) : [],
        url: postmanUrl,
        body: postmanBody,
        auth: convertToPostmanAuth(auth || null),
        description: String(req.description || ''),
      },
    };
  };

  // 构建嵌套文件夹结构
  let rootItems: PostmanItem[];
  if (folders.length > 0) {
    const folderMap = new Map<string, PostmanItem>();
    for (const f of folders) {
      folderMap.set(String(f.id), {
        name: String(f.name || ''),
        description: String(f.description || ''),
        item: [],
      });
    }
    // 将请求放入对应文件夹
    const orphanItems: PostmanItem[] = [];
    for (const req of requests) {
      const fId = req.folderId as string | undefined;
      const item = reqToPostmanItem(req);
      const folder = fId ? folderMap.get(fId) : undefined;
      if (folder?.item) {
        folder.item.push(item);
      } else {
        orphanItems.push(item);
      }
    }
    // 嵌套子文件夹到父文件夹
    const topFolders: PostmanItem[] = [];
    for (const f of folders) {
      const parentId = f.parentId as string | undefined;
      const folderItem = folderMap.get(String(f.id));
      if (!folderItem) continue;
      const parent = parentId ? folderMap.get(parentId) : undefined;
      if (parent?.item) {
        parent.item.push(folderItem);
      } else {
        topFolders.push(folderItem);
      }
    }
    rootItems = [...topFolders, ...orphanItems];
  } else {
    rootItems = requests.map(reqToPostmanItem);
  }

  const postmanCollection: PostmanCollection = {
    info: {
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: rootItems,
    variable: collection.variables
      ? Object.entries(collection.variables).map(([key, value]) => ({
          key,
          value: String(value),
          type: 'string',
        }))
      : [],
    auth: convertToPostmanAuth(collection.auth),
  };

  return JSON.stringify(postmanCollection, null, 2);
};

/**
 * 导出为 Postman Environment 格式
 */
export const exportToPostmanEnvironment = (env: EnvironmentDetail): string => {
  const postmanEnv: PostmanEnvironment = {
    name: env.name,
    values: (env.variables || []).map(v => ({
      key: v.key,
      value: v.value,
      type: v.type === 'secret' ? 'secret' : 'default',
      enabled: v.enabled !== false,
    })),
    _postman_variable_scope: 'environment',
  };

  return JSON.stringify(postmanEnv, null, 2);
};

/**
 * 导出单个请求为 cURL 命令
 */
export const exportToCurl = (req: Record<string, unknown>): string => {
  const method = String(req.method || 'GET');
  const url = String(req.url || '');
  const headers = req.headers as Record<string, string> | undefined;
  const bodyMode = String(req.bodyMode || 'none');

  const parts = ['curl'];
  if (method !== 'GET') parts.push(`-X ${method}`);
  parts.push(`'${url}'`);

  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      parts.push(`-H '${k}: ${v}'`);
    }
  }

  if (bodyMode !== 'none' && method !== 'GET') {
    switch (bodyMode) {
      case 'urlencoded': {
        const bodyObj = req.body as Record<string, string> | undefined;
        if (bodyObj) {
          const encoded = Object.entries(bodyObj)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
          parts.push(`--data-urlencode '${encoded}'`);
        }
        break;
      }
      default: {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');
        if (raw) parts.push(`-d '${raw.replace(/'/g, "'\\''")}'`);
        break;
      }
    }
  }

  return parts.join(' \\\n  ');
};

/**
 * 导出为本项目 JSON 格式（Collection）
 */
export const exportToNativeCollection = (collection: CollectionDetail): string => {
  return JSON.stringify(
    {
      _format: 'testweb-collection',
      _version: '1.0',
      ...collection,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
};

/**
 * 导出为本项目 JSON 格式（Environment）
 */
export const exportToNativeEnvironment = (env: EnvironmentDetail): string => {
  return JSON.stringify(
    {
      _format: 'testweb-environment',
      _version: '1.0',
      ...env,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
};

// ═══════════════════════════════════════════
// 文件读取辅助
// ═══════════════════════════════════════════

/**
 * 从文件输入读取 JSON 文本
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

/**
 * 触发文件下载
 */
export const downloadFile = (content: string, filename: string, mimeType = 'application/json') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
