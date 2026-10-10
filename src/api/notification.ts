import http from '@/lib/http';
import type { NotificationListResult, NotificationPreferences } from '@/types/content';

/**
 * 站内消息中心。全部需要登录。
 *
 * `unread-count` 单独成接口而非从列表推 —— 顶栏角标要在任意页面轮询，
 * 拉整页消息只为算一个数字不划算。
 */
export const notificationApi = {
  /**
   * 消息列表。返回值里同时带 `unread`（未读总数）与 `total`（**当前筛选下**的
   * 条数），所以「只看未读」时 `total` 会小于 `unread` 之外的口径差异要注意：
   * 角标始终用 `unread`。
   */
  list(params: { unreadOnly?: boolean; pageNumber?: number; pageSize?: number } = {}): Promise<NotificationListResult> {
    const query: Record<string, string> = {};
    if (params.unreadOnly) {
      query.unreadOnly = 'true';
    }
    if (params.pageNumber !== undefined) {
      query.pageNumber = String(params.pageNumber);
    }
    if (params.pageSize !== undefined) {
      query.pageSize = String(params.pageSize);
    }
    return http.get<NotificationListResult>('/v1/notifications', { params: query });
  },

  /** 未读数，顶栏角标使用 */
  unreadCount(): Promise<{ unread: number }> {
    return http.get<{ unread: number }>('/v1/notifications/unread-count');
  },

  /** 单条标记已读。幂等：已读的再标一次仍返回成功。 */
  markRead(id: string): Promise<{ updated: true }> {
    return http.put<{ updated: true }>(`/v1/notifications/${id}/read`);
  },

  /** 全部标记已读，返回实际影响的条数 */
  markAllRead(): Promise<{ updated: true; count: number }> {
    return http.put<{ updated: true; count: number }>('/v1/notifications/read-all');
  },

  /** 通知偏好。未设置过后端返回默认值，不会因为一次 GET 就落库。 */
  preferences(): Promise<NotificationPreferences> {
    return http.get<NotificationPreferences>('/v1/notifications/preferences');
  },

  updatePreferences(payload: Partial<NotificationPreferences>): Promise<{ updated: true } & NotificationPreferences> {
    return http.put<{ updated: true } & NotificationPreferences>('/v1/notifications/preferences', payload);
  },
};
