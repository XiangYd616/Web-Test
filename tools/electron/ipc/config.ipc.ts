import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const configStorePath = path.join(app.getPath('userData'), 'app-config.json');

function readConfigFile(): Record<string, unknown> {
  try {
    if (fs.existsSync(configStorePath)) {
      return JSON.parse(fs.readFileSync(configStorePath, 'utf-8'));
    }
  } catch {
    // 配置文件损坏时返回空对象
  }
  return {};
}

function writeConfigFile(data: Record<string, unknown>): void {
  fs.writeFileSync(configStorePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 配置管理 IPC handlers
 */
export function registerConfigIpc(): void {
  ipcMain.handle('config-get', async (_event, key: string) => {
    const config = readConfigFile();
    return config[key] ?? null;
  });

  ipcMain.handle('config-set', async (_event, key: string, value: unknown) => {
    const config = readConfigFile();
    config[key] = value;
    writeConfigFile(config);
  });

  ipcMain.handle('config-get-all', async () => {
    return readConfigFile();
  });

  ipcMain.handle('config-reset', async () => {
    writeConfigFile({});
  });

  ipcMain.handle('config-export', async (_event, exportPath: string) => {
    const config = readConfigFile();
    fs.writeFileSync(exportPath, JSON.stringify(config, null, 2), 'utf-8');
  });

  ipcMain.handle('config-import', async (_event, importPath: string) => {
    const raw = JSON.parse(fs.readFileSync(importPath, 'utf-8'));
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error('配置文件格式无效：必须为 JSON 对象');
    }
    // 只保留安全类型的顶层键
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const t = typeof value;
      if (value === null || t === 'string' || t === 'number' || t === 'boolean' || t === 'object') {
        sanitized[key] = value;
      }
    }
    // 合并而非覆盖
    const existing = readConfigFile();
    writeConfigFile({ ...existing, ...sanitized });
  });
}
