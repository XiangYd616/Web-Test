import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// ── 沙箱化：仅允许 userData / downloads / temp 目录内的操作 ──
const ALLOWED_FILE_ROOTS: string[] = [
  app.getPath('userData'),
  app.getPath('downloads'),
  app.getPath('temp'),
];

function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return ALLOWED_FILE_ROOTS.some(root => resolved.startsWith(path.resolve(root)));
}

function assertPathAllowed(targetPath: string): void {
  if (!isPathAllowed(targetPath)) {
    throw new Error(`文件操作被拒绝：路径 "${targetPath}" 不在允许的目录范围内`);
  }
}

/**
 * 文件操作 IPC handlers（沙箱化）
 */
export function registerFileIpc(): void {
  ipcMain.handle('file-read', async (_event, filePath: string) => {
    assertPathAllowed(filePath);
    return fs.promises.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('file-write', async (_event, filePath: string, data: string | Buffer) => {
    assertPathAllowed(filePath);
    await fs.promises.writeFile(filePath, data, 'utf-8');
  });

  ipcMain.handle('file-exists', async (_event, filePath: string) => {
    assertPathAllowed(filePath);
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('file-mkdir', async (_event, dirPath: string) => {
    assertPathAllowed(dirPath);
    await fs.promises.mkdir(dirPath, { recursive: true });
  });

  ipcMain.handle('file-readdir', async (_event, dirPath: string) => {
    assertPathAllowed(dirPath);
    return fs.promises.readdir(dirPath);
  });
}
