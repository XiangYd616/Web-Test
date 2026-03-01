import { ipcMain } from 'electron';

/**
 * 网络诊断 IPC handlers
 */
export function registerNetworkIpc(): void {
  ipcMain.handle('network-ping', async (_event, host: string) => {
    // 注意：这是基于 DNS 解析的连通性检测，非 ICMP ping。
    const dns = await import('dns');
    return new Promise(resolve => {
      const start = Date.now();
      dns.lookup(host, err => {
        const duration = Date.now() - start;
        resolve({
          host,
          alive: !err,
          time: duration,
          method: 'dns-lookup',
          error: err?.message || null,
        });
      });
    });
  });

  ipcMain.handle('network-traceroute', async (_event, host: string) => {
    return { host, hops: [], message: '本地工具暂不支持完整 traceroute，请使用系统命令行' };
  });

  ipcMain.handle('network-port-scan', async (_event, host: string, ports: number[]) => {
    const net = await import('net');
    const results = await Promise.all(
      ports.map(
        port =>
          new Promise<{ port: number; open: boolean }>(resolve => {
            const socket = new net.Socket();
            socket.setTimeout(2000);
            socket.on('connect', () => {
              socket.destroy();
              resolve({ port, open: true });
            });
            socket.on('timeout', () => {
              socket.destroy();
              resolve({ port, open: false });
            });
            socket.on('error', () => {
              resolve({ port, open: false });
            });
            socket.connect(port, host);
          })
      )
    );
    return { host, results };
  });

  ipcMain.handle('network-dns-lookup', async (_event, domain: string) => {
    const dns = await import('dns');
    return new Promise(resolve => {
      dns.resolve(domain, (err, addresses) => {
        resolve({
          domain,
          addresses: addresses || [],
          error: err?.message || null,
        });
      });
    });
  });
}
