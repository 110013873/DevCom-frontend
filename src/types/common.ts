/**
 * 与后端约定一致的通用类型。
 * 后端所有接口都走 HTTP 状态码 + `{ code, message, data }` 信封，
 * 分页接口返回 `{ total, items }`。
 */

/** 分页结果，字段名与后端 `Page<T>` 完全一致 */
export interface Page<T> {
  total: number;
  items: T[];
}

/** 分页查询参数，对应后端 `PaginationQuery` */
export interface PaginationQuery {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * 后端抛出的业务错误。axios 拦截器会把响应体转成这个类，
 * 页面里统一 `instanceof ApiError` 判断，避免各处解析 `any`。
 */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  data?: unknown;
}
