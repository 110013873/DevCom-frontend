import http from '@/lib/http';
import type { SearchResult } from '@/types/content';

/**
 * 全站搜索。
 *
 * 后端在关键词少于 2 个字符时直接返回 400（中文单字检索噪声太大），
 * 因此调用方要先做长度判断，不要等到请求失败才提示。
 */
export const searchApi = {
  /**
   * 搜索。返回按 news / resource / course 分组的命中，每组各自分页计数。
   * `scope` 可选，用于把范围限定到单一分组。
   */
  search(keyword: string, scope?: string): Promise<SearchResult> {
    return http.get<SearchResult>('/v1/search', {
      params: scope ? { keyword, scope } : { keyword },
    });
  },
};
