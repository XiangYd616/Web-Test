const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

const extensionToMime: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  json: 'application/json',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  xml: 'application/xml',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const getUploadMaxSize = () => {
  const value = Number(process.env.UPLOAD_MAX_SIZE || 0);
  if (!value || Number.isNaN(value)) {
    return DEFAULT_MAX_SIZE;
  }
  return value;
};

export const getAllowedMimeTypes = () => {
  const raw = process.env.UPLOAD_ALLOWED_TYPES || '';
  const items = raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const mimeTypes = items
    .map(item => {
      if (item.includes('/')) {
        return item.toLowerCase();
      }
      const key = item.replace(/^\./, '').toLowerCase();
      return extensionToMime[key];
    })
    .filter((value): value is string => Boolean(value));

  return new Set(mimeTypes.length ? mimeTypes : Object.values(extensionToMime));
};

export const getUploadDestination = () => {
  return process.env.UPLOAD_DESTINATION || 'uploads';
};
