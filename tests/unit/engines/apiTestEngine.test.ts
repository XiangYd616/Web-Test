import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import http from 'http';

jest.mock('http');

let ApiTestEngine: any;

const mockHttpRequest = () => {
  const response = new EventEmitter() as EventEmitter & {
    statusCode?: number;
    statusMessage?: string;
    headers: Record<string, string>;
  };
  response.statusCode = 200;
  response.statusMessage = 'OK';
  response.headers = {
    'content-type': 'application/json',
    'content-length': '20',
  };

  const req = new EventEmitter() as EventEmitter & {
    write: (data: string) => void;
    end: () => void;
    destroy: () => void;
  };

  req.write = jest.fn();
  req.destroy = jest.fn();
  req.end = () => {
    process.nextTick(() => {
      response.emit('data', JSON.stringify({ ok: true }));
      response.emit('end');
    });
  };

  return { req, response };
};

describe('ApiTestEngine', () => {
  beforeAll(async () => {
    const module = await import('../../../backend/engines/api/apiTestEngine');
    ApiTestEngine = (module as any).default || module;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应执行API测试并返回结果', async () => {
    const engine = new ApiTestEngine();
    const httpRequest = http.request as unknown as jest.MockedFunction<(...args: any[]) => any>;

    httpRequest.mockImplementation((...args: any[]) => {
      const callback = args.find(arg => typeof arg === 'function') as
        | ((res: EventEmitter) => void)
        | undefined;
      const { req, response } = mockHttpRequest();
      if (callback) {
        callback(response);
      }
      return req;
    });

    const result = await engine.executeTest({ url: 'http://example.com' });

    expect(result.success).toBe(true);
    expect(result.results.summary).toBeTruthy();
    expect(result.results.summary.success).toBe(true);
  });

  it('缺少URL时应抛出错误', async () => {
    const engine = new ApiTestEngine();
    await expect(engine.executeTest({})).rejects.toThrow('必须提供URL或端点列表');
  });
});
