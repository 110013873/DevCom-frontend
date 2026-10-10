import http from '@/lib/http';
import type { Page } from '@/types/common';
import type { Tag, TagQuery, TagType } from '@/types/content';

/**
 * 标签接口。
 *
 * 后端把标签按用途分成两套路由（`/v1/news-tags` 与 `/v1/resource-tags`），
 * 而不是 `/v1/tags?type=` —— 这里用一个工厂收口，调用方按类型取用，
 * 既不必拼路径，也避免两套接口各自演化出不同的封装。
 */
function createTagApi(type: TagType) {
  const base = `/v1/${type}-tags`;

  return {
    /** 分页列表，默认按使用次数倒序 */
    list(query: TagQuery = {}): Promise<Page<Tag>> {
      return http.get<Page<Tag>>(base, { params: query });
    },

    /** 热门标签。返回裸数组，不分页；后端把 `limit` 限制在 1–100。 */
    hot(limit = 20): Promise<Tag[]> {
      return http.get<Tag[]>(`${base}/hot`, { params: { limit } });
    },
  };
}

export const newsTagApi = createTagApi('news');
export const resourceTagApi = createTagApi('resource');
