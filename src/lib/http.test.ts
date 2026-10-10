import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { AUTH_EXPIRED_EVENT, ApiError, TOKEN_STORAGE_KEY, createHttpClient, isAuthError } from './http';

/** 构造一个成功的 axios 响应（拦截器只消费 data / status） */
function ok<T>(config: never, data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config } as unknown as AxiosResponse<T>;
}

/** 构造带响应体的失败响应：后端错误信封就挂在这里 */
function failWithBody(config: never, status: number, body: unknown): AxiosError {
  const response = { data: body, status, statusText: '', headers: {}, config } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
}

/** 构造网络层失败：有 request 无 response */
function failNetwork(config: never): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK', config, {});
}

/**
 * 用自定义 adapter 替换真实传输层。这样测的是真实的拦截器与错误规整逻辑，
 * 而不是把被测代码本身 mock 掉。
 */
function clientWithAdapter(adapter: AxiosInstance['defaults']['adapter']): AxiosInstance {
  const client = createHttpClient();
  client.defaults.adapter = adapter;
  return client;
}

/**
 * 让请求以给定的 AxiosError 失败。
 *
 * 必须 `throw` 而不是 `return`：adapter 返回错误对象会被 axios 当成成功响应，
 * 拦截器再去读 `response.data` 就只能拿到 undefined，测试会静默地测错东西。
 */
function failingClient(build: (config: never) => AxiosError): AxiosInstance {
  return clientWithAdapter(async config => {
    throw build(config as never);
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('请求拦截器', () => {
  it('本地有令牌时自动带上 Authorization 头', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-abc');
    let seen: string | undefined;
    const client = clientWithAdapter(async config => {
      seen = config.headers?.Authorization as string | undefined;
      return ok(config as never, { ok: true });
    });

    await client.get('/v1/ping');
    expect(seen).toBe('Bearer token-abc');
  });

  it('没有令牌时不带 Authorization 头，也不发送空字符串', async () => {
    let seen: unknown = 'sentinel';
    const client = clientWithAdapter(async config => {
      seen = config.headers?.Authorization;
      return ok(config as never, { ok: true });
    });

    await client.get('/v1/ping');
    expect(seen).toBeUndefined();
  });
});

describe('响应拦截器', () => {
  it('直接返回 response.data，调用方不需要再解一层', async () => {
    const client = clientWithAdapter(async config => ok(config as never, { total: 3, items: [1, 2, 3] }));
    await expect(client.get('/v1/news')).resolves.toEqual({ total: 3, items: [1, 2, 3] });
  });

  it('把后端的 { code, message } 信封转成 ApiError', async () => {
    const client = failingClient(config =>
      failWithBody(config, 400, { code: '10104', message: '验证码已过期', data: { retry: false } })
    );

    const error = await client.get('/v1/auth').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe('10104');
    expect(apiError.message).toBe('验证码已过期');
    expect(apiError.status).toBe(400);
    expect(apiError.data).toEqual({ retry: false });
  });

  it('后端没给 message 时回落到带状态码的中文提示', async () => {
    const client = failingClient(config => failWithBody(config, 500, {}));

    const error = (await client.get('/v1/news').catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe('请求失败（500）');
    // 没有业务 code 时用 HTTP 状态码兜底
    expect(error.code).toBe('500');
  });

  it('空白 message 不会被当成有效文案', async () => {
    const client = failingClient(config => failWithBody(config, 502, { code: 'x', message: '   ' }));

    const error = (await client.get('/v1/news').catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe('请求失败（502）');
  });

  it('网络层失败规整为 network_error，状态码 0', async () => {
    const client = failingClient(failNetwork);

    const error = (await client.get('/v1/news').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('network_error');
    expect(error.status).toBe(0);
  });
});

describe('401 处理', () => {
  it('清除本地令牌并广播失效事件', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stale-token');
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    const client = failingClient(config =>
      failWithBody(config, 401, { code: 'token_expired', message: '登录已过期' })
    );

    await client.get('/v1/user/me').catch(() => undefined);

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it('非 401 错误不清令牌、不广播', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    const client = failingClient(config => failWithBody(config, 403, { code: '10106', message: '无权限' }));

    await client.get('/v1/admin/users').catch(() => undefined);

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('valid-token');
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });
});

describe('isAuthError', () => {
  it('401 或令牌相关 code 视为鉴权失效', () => {
    expect(isAuthError(new ApiError('x', 'msg', 401))).toBe(true);
    expect(isAuthError(new ApiError('token_expired', 'msg', 400))).toBe(true);
    expect(isAuthError(new ApiError('token_empty', 'msg', 400))).toBe(true);
  });

  it('403、500、网络错误都不算鉴权失效（不能误登出）', () => {
    expect(isAuthError(new ApiError('10106', '无权限', 403))).toBe(false);
    expect(isAuthError(new ApiError('500', '服务异常', 500))).toBe(false);
    expect(isAuthError(new ApiError('network_error', '网络失败', 0))).toBe(false);
  });

  it('普通 Error 与任意值都返回 false', () => {
    expect(isAuthError(new Error('boom'))).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError('401')).toBe(false);
  });
});
