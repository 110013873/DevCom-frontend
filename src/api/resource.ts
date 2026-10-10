import http from '@/lib/http';
import type { Page } from '@/types/common';
import type {
  DownloadTicket,
  ResourceDetail,
  ResourceFeedback,
  ResourceListItem,
  ResourceQuery,
  ResourceRatingResult,
} from '@/types/content';

/**
 * 资源中心接口。
 *
 * 读接口全部公开；`download` 与 `rating` 需要登录 —— 前者要在服务端留下
 * 下载记录，后者要按用户去重，两者都无法靠前端约束。
 */
export const resourceApi = {
  list(query: ResourceQuery = {}): Promise<Page<ResourceListItem>> {
    return http.get<Page<ResourceListItem>>('/v1/resources', { params: query });
  },

  detail(id: string): Promise<ResourceDetail> {
    return http.get<ResourceDetail>(`/v1/resources/${id}`);
  },

  /**
   * 换取下载地址。
   *
   * 不传 `versionId` 时后端取默认版本；传 `fileId` 时精确到单个文件。
   * 该调用会**写入下载记录并累加下载量**，所以不应放进 `useQuery` 里
   * 自动触发 —— 由用户点击「下载」按钮时显式调用。
   */
  download(id: string, params: { versionId?: string; fileId?: string } = {}): Promise<DownloadTicket> {
    return http.get<DownloadTicket>(`/v1/resources/${id}/download`, { params });
  },

  /** 评分：1–5，同一用户重复提交为覆盖，返回值可直接回写详情缓存 */
  rate(id: string, score: number): Promise<ResourceRatingResult> {
    return http.post<ResourceRatingResult>(`/v1/resources/${id}/rating`, { score });
  },

  /** 资源反馈列表（与新闻评论同表，前端只展示正文与点赞数） */
  feedback(id: string, params: { pageNumber?: number; pageSize?: number } = {}): Promise<Page<ResourceFeedback>> {
    return http.get<Page<ResourceFeedback>>(`/v1/resources/${id}/feedback`, { params });
  },

  /** 提交反馈。后端限流 60 秒 10 条，超限返回 429。 */
  submitFeedback(id: string, content: string): Promise<ResourceFeedback> {
    return http.post<ResourceFeedback>(`/v1/resources/${id}/feedback`, { content });
  },
};
