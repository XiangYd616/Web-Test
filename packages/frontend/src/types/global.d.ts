// Auto-generated global type declarations
// Expanded with flexible types

declare global {
  interface Window {
    electron?: any;
    api?: any;
    electronAPI?: any;
    ipcRenderer?: any;
    [key: string]: any;
  }

  // Common missing types
  var module: any;
  var require: any;
  var process: any;
  var __dirname: string;
  var __filename: string;
  var global: any;

  // Node types
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
    interface Process {
      env: ProcessEnv;
      [key: string]: any;
    }
  }

  // Extend Object to support flexible property access
  interface Object {
    [key: string]: any;
  }
}

// Make Record more flexible
declare module '*' {
  const content: any;
  export = content;
}

export {};
