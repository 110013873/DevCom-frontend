import http from '@/lib/http';
import type { SiteConfig } from '@/types/config';

/**
 * 公开配置。**无需登录** —— 未登录访客也要能渲染品牌名与分类筛选器。
 *
 * 返回值是一个扁平的 `{ key: value }` 对象，键由后端 `PUBLIC_CONFIG_KEYS`
 * 决定。这里不逐键建模成强类型后再拼，因为新增一个公开配置键不该要求前端
 * 同时改三处；调用方（`SiteConfigContext`）负责逐块做形状校验与兜底。
 */
export const configApi = {
  public(): Promise<SiteConfig> {
    return http.get<SiteConfig>('/v1/config');
  },
};
