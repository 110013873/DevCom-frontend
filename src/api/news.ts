import http from '@/lib/http';
import type { Page } from '@/types/common';
import type { NewsDetail, NewsListItem, NewsQuery, NewsRelatedItem } from '@/types/content';

/**
 * 新闻接口。
 *
 * 列表与详情都是**公开**接口：未登录也能读，后端用可选身份解析来补齐
 * `liked` / `favorited` 两个字段，因此这里不需要区分两套调用。
 */
export const newsApi = {
  list(query: NewsQuery = {}): Promise<Page<NewsListItem>> {
    return http.get<Page<NewsListItem>>('/v1/news', { params: query });
  },

  detail(id: string): Promise<NewsDetail> {
    return http.get<NewsDetail>(`/v1/news/${id}`);
  },

  /**
   * 相关阅读。返回的是裁剪过的行，不是列表项 —— 见 `NewsRelatedItem` 的注释。
   */
  related(id: string): Promise<NewsRelatedItem[]> {
    return http.get<NewsRelatedItem[]>(`/v1/news/${id}/related`);
  },

  /**
   * 阅读计数。后端按 `新闻 + IP` 限流（10 分钟一次），重复调用不会重复计数，
   * 因此可以在详情页加载时无条件调用，无需前端自己去重。
   */
  markViewed(id: string): Promise<{ viewed: true }> {
    return http.post<{ viewed: true }>(`/v1/news/${id}/view`);
  },
};
