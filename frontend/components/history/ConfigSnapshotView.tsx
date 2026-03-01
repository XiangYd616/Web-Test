const CONFIG_LABELS: Record<string, string> = {
  testType: '测试类型',
  url: 'URL',
  iterations: '迭代次数',
  timeout: '超时(ms)',
  cacheControl: '缓存控制',
  includeResources: '包含资源',
  fetchHtml: '获取 HTML',
  concurrency: '并发数',
  duration: '持续时间(s)',
  maxRetries: '最大重试',
  device: '设备',
  userAgent: 'User Agent',
  networkThrottle: '网络限速',
  method: '请求方法',
  contentType: 'Content-Type',
};

const ConfigSnapshotView = ({ config }: { config: Record<string, unknown> }) => {
  const entries = Object.entries(config).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return <p className='text-sm text-muted-foreground'>无配置数据</p>;

  const renderValue = (val: unknown): string => {
    if (typeof val === 'boolean') return val ? '是' : '否';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const flatEntries: Array<[string, unknown]> = [];
  const nestedEntries: Array<[string, Record<string, unknown>]> = [];

  for (const [k, v] of entries) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      nestedEntries.push([k, v as Record<string, unknown>]);
    } else {
      flatEntries.push([k, v]);
    }
  }

  return (
    <div className='space-y-4'>
      {flatEntries.length > 0 && (
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
          {flatEntries.map(([key, val]) => (
            <div key={key} className='space-y-0.5'>
              <div className='text-xs font-medium text-muted-foreground'>
                {CONFIG_LABELS[key] || key}
              </div>
              <div className='text-sm font-mono truncate' title={renderValue(val)}>
                {renderValue(val)}
              </div>
            </div>
          ))}
        </div>
      )}
      {nestedEntries.map(([key, obj]) => (
        <div key={key}>
          <div className='text-xs font-medium text-muted-foreground mb-1'>
            {CONFIG_LABELS[key] || key}
          </div>
          <pre className='text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-[200px]'>
            {JSON.stringify(obj, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
};

export default ConfigSnapshotView;
