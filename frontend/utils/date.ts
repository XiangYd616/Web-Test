export const formatRelativeTime = (value?: string, locale = 'zh-CN') => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diff = date.getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const absolute = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
  if (absDiff < 60 * 1000) {
    return `刚刚 · ${absolute}`;
  }
  if (absDiff < 60 * 60 * 1000) {
    const minutes = Math.round(diff / (60 * 1000));
    return `${rtf.format(minutes, 'minute')} · ${absolute}`;
  }
  if (absDiff < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diff / (60 * 60 * 1000));
    return `${rtf.format(hours, 'hour')} · ${absolute}`;
  }
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  return `${rtf.format(days, 'day')} · ${absolute}`;
};
