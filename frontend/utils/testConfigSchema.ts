type FieldType = 'string' | 'number' | 'boolean' | 'select';

type FieldOption = {
  label: string;
  value: string | number | boolean;
};

type FieldSchema = {
  key: string;
  label: string;
  path: string[];
  type: FieldType;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: FieldOption[];
  defaultValue?: string | number | boolean;
};

type SchemaSection = {
  key: string;
  label: string;
  fields: FieldSchema[];
};

type TestTypeSchema = {
  testType: string;
  sections: SchemaSection[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getConfigValueByPath = (config: Record<string, unknown>, path: string[]) => {
  let current: unknown = config;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
};

export const setConfigValueByPath = (
  config: Record<string, unknown>,
  path: string[],
  value: unknown
) => {
  const nextConfig: Record<string, unknown> = { ...config };
  let current: Record<string, unknown> = nextConfig;
  path.forEach((key, index) => {
    if (index === path.length - 1) {
      current[key] = value;
      return;
    }
    const existing = current[key];
    const nextNode = isRecord(existing) ? { ...existing } : {};
    current[key] = nextNode;
    current = nextNode;
  });
  return nextConfig;
};

export const buildFormValues = (schema: TestTypeSchema, config: Record<string, unknown>) => {
  return schema.sections.reduce<Record<string, unknown>>((acc, section) => {
    section.fields.forEach(field => {
      const value = getConfigValueByPath(config, field.path);
      acc[field.key] = value ?? field.defaultValue ?? '';
    });
    return acc;
  }, {});
};

export const PERFORMANCE_SCHEMA: TestTypeSchema = {
  testType: 'performance',
  sections: [
    {
      key: 'performance',
      label: 'editor.performancePanelTitle',
      fields: [
        {
          key: 'iterations',
          label: 'editor.performanceIterations',
          path: ['options', 'iterations'],
          type: 'number',
          min: 1,
          max: 10,
          defaultValue: 3,
        },
        {
          key: 'includeResources',
          label: 'editor.performanceIncludeResources',
          path: ['options', 'includeResources'],
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'fetchHtml',
          label: 'editor.performanceFetchHtml',
          path: ['options', 'fetchHtml'],
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'verbose',
          label: 'editor.performanceVerbose',
          path: ['options', 'verbose'],
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
  ],
};

export const API_SCHEMA: TestTypeSchema = {
  testType: 'api',
  sections: [
    {
      key: 'request',
      label: 'editor.requestPanelTitle',
      fields: [
        {
          key: 'method',
          label: 'editor.method',
          path: ['request', 'method'],
          type: 'select',
          defaultValue: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          key: 'contentType',
          label: 'editor.contentType',
          path: ['request', 'contentType'],
          type: 'string',
          placeholder: 'application/json',
          defaultValue: 'application/json',
        },
        {
          key: 'authToken',
          label: 'editor.authToken',
          path: ['request', 'authToken'],
          type: 'string',
          placeholder: 'Bearer ...',
        },
      ],
    },
  ],
};

export const TEST_TYPE_SCHEMAS: Record<string, TestTypeSchema> = {
  api: API_SCHEMA,
};

export type { FieldSchema, SchemaSection, TestTypeSchema };
