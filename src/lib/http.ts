import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

/** localStorage 中的登录令牌键名，与后端 `TOKEN_STORAGE_KEY` 保持一致 */
export const TOKEN_STORAGE_KEY = 'devcom_token';

/**
 * API 基地址。留空时走相对路径 `/v1`：
 * 开发环境由 vite devServer 代理到后端 10100，生产由 nginx 反代。
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 后端业务错误。统一转成该类型后，页面与拦截器都不需要再解析响应体结构。
 * `code` 为后端 `ResponseCode` 字符串枚举值（如 `10100`）。
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly data: unknown;

  constructor(code: string, message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/** 未登录 / 令牌过期：拦截器据此清理本地状态 */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === 'token_expired' || error.code === 'token_empty');
}

/** 令牌失效时广播，供 AuthContext 监听并登出（避免 axios 直接依赖 React 状态） */
export const AUTH_EXPIRED_EVENT = 'devcom:auth-expired';

interface BackendErrorBody {
  code?: string;
  message?: string;
  data?: unknown;
}

/** 把 axios 异常规整为 ApiError，文案优先用后端返回的中文 message */
function toApiError(error: AxiosError<BackendErrorBody>): ApiError {
  if (error.response) {
    const body = error.response.data;
    const code = body?.code ?? String(error.response.status);
    const message = body?.message?.trim() || `请求失败（${error.response.status}）`;
    return new ApiError(code, message, error.response.status, body?.data);
  }
  if (error.request) {
    return new ApiError('network_error', '网络连接失败，请检查网络后重试', 0);
  }
  return new ApiError('request_setup_error', error.message || '请求发送失败', 0);
}

export function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL || undefined,
    timeout: 30_000,
  });

  client.interceptors.request.use(config => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    // 后端直接返回业务数据（分页接口返回 { total, items }），不做二次包装
    response => response.data,
    (error: AxiosError<BackendErrorBody>) => {
      const apiError = toApiError(error);
      if (apiError.status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * 全局单例。所有 api/* 模块共用，避免重复注册拦截器。
 *
 * 响应拦截器已把 `response.data` 解开，所以运行时拿到的是业务数据本身，
 * 但 axios 的类型签名仍是 `AxiosResponse<T>`。这里用一层薄封装把类型对齐，
 * 使 `http.get<T>(...)` 直接返回 `Promise<T>`，调用方无需逐个断言。
 */
function unwrap<T>(promise: Promise<unknown>): Promise<T> {
  return promise as Promise<T>;
}

const axiosInstance: AxiosInstance = createHttpClient();

const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(axiosInstance.get(url, config));
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(axiosInstance.post(url, data, config));
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(axiosInstance.put(url, data, config));
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(axiosInstance.patch(url, data, config));
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(axiosInstance.delete(url, config));
  },
};

export default http;
