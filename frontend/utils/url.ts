/**
 * 模板变量正则：匹配 {{varName}} 格式
 */
const TEMPLATE_VAR_RE = /\{\{\s*\w+\s*\}\}/g;
const TEMPLATE_VAR_TEST_RE = /\{\{\s*\w+\s*\}\}/;

/**
 * 检测字符串是否包含模板变量 {{...}}
 */
export const hasTemplateVars = (text: string): boolean => TEMPLATE_VAR_TEST_RE.test(text);

/**
 * 从文本中提取所有模板变量名（去重）。
 * 例如 "{{baseUrl}}/api/{{version}}" → ['baseUrl', 'version']
 */
export const extractTemplateVarNames = (text: string): string[] => {
  const names = new Set<string>();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    names.add(m[1]);
  }
  return Array.from(names);
};

/**
 * 将模板变量替换为合法占位值，以便通过 URL 解析验证。
 * 例如 "{{baseUrl}}/api/v1" → "https://placeholder.test/api/v1"
 * 例如 "https://api.example.com/{{path}}" → "https://api.example.com/placeholder"
 */
export const resolveTemplateVarsForValidation = (url: string): string => {
  const trimmed = url.trim();
  if (!TEMPLATE_VAR_TEST_RE.test(trimmed)) return trimmed;

  // 如果 URL 以 {{...}} 开头（整个 host 部分是变量），替换为完整的 https 占位 URL
  const resolved = trimmed.replace(TEMPLATE_VAR_RE, 'placeholder');

  // 替换后如果不以 http 开头，说明原 URL 以模板变量开头（如 {{baseUrl}}/path）
  if (!/^https?:\/\//i.test(resolved)) {
    return `https://${resolved}`;
  }
  return resolved;
};

type UrlValidationResult = { valid: true; hasVars: boolean } | { valid: false; error: string };

/**
 * 验证 URL，支持模板变量 {{...}} 语法。
 * 当检测到模板变量时，会先将其替换为占位值再验证 URL 结构。
 */
export const validateUrlWithTemplateVars = (
  url: string,
  messages: {
    invalidProtocol: string;
    invalidDomain: string;
    invalid: string;
  }
): UrlValidationResult => {
  const trimmed = url.trim();
  if (!trimmed) return { valid: true, hasVars: false };

  const containsVars = TEMPLATE_VAR_TEST_RE.test(trimmed);
  const urlToValidate = containsVars ? resolveTemplateVarsForValidation(trimmed) : trimmed;

  try {
    const u = new URL(urlToValidate);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return { valid: false, error: messages.invalidProtocol };
    }
    // 当包含模板变量时，跳过域名严格检查（变量可能代表完整域名）
    if (!containsVars && u.hostname !== 'localhost' && !u.hostname.includes('.')) {
      return { valid: false, error: messages.invalidDomain };
    }
    return { valid: true, hasVars: containsVars };
  } catch {
    return { valid: false, error: messages.invalid };
  }
};
