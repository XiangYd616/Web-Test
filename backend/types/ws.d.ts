declare module 'ws' {
  type Listener = (...args: unknown[]) => void;

  export type Data = unknown;

  export class Server {
    constructor(options?: Record<string, unknown>);
    on(event: string, listener: Listener): this;
    close(): void;
  }

  export default class WebSocket {
    static OPEN: number;
    readyState: number;
    on(event: string, listener: Listener): this;
    send(data: unknown): void;
    close(code?: number, reason?: string): void;
  }
}
