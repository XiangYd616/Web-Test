// Electron类型声明文件
declare module 'electron' {
  export interface App {
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    quit(): void;
    getPath(name: string): string;
    setPath(name: string, path: string): void;
    getName(): string;
    getVersion(): string;
    isPackaged: boolean;
  }

  export interface BrowserWindow {
    new (options?: any): BrowserWindow;
    loadFile(filePath: string): Promise<void>;
    loadURL(url: string): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    webContents: WebContents;
    show(): void;
    hide(): void;
    close(): void;
    maximize(): void;
    minimize(): void;
    restore(): void;
    setFullScreen(flag: boolean): void;
    isFullScreen(): boolean;
  }

  export interface WebContents {
    openDevTools(): void;
    closeDevTools(): void;
    send(channel: string, ...args: any[]): void;
    on(event: string, listener: (...args: any[]) => void): this;
    setWindowOpenHandler(handler: (details: { url: string }) => any): void;
  }

  export interface IpcMain {
    handle(channel: string, listener: (event: any, ...args: any[]) => any): void;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    removeAllListeners(channel?: string): this;
  }

  export interface Menu {
    static buildFromTemplate(template: any[]): Menu;
    static setApplicationMenu(menu: Menu | null): void;
  }

  export interface Shell {
    openExternal(url: string): Promise<void>;
    showItemInFolder(fullPath: string): void;
  }

  export const app: App;
  export const BrowserWindow: typeof BrowserWindow;
  export const ipcMain: IpcMain;
  export const Menu: typeof Menu;
  export const shell: Shell;
}
