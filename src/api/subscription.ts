import http from '@/lib/http';
import type { SubscribeResult, SubscriptionPreferencesResult } from '@/types/content';

/**
 * 邮件订阅。**公开接口，不需要登录。**
 *
 * 凭据是发到邮箱里的令牌，不是 JWT —— 订阅者通常是还没注册的访客，
 * 要求先注册才能订阅会把订阅入口废掉。令牌只出现在邮件链接里，后端
 * 任何响应都不回显它，所以这里也拿不到，只能原样从 URL 透传。
 */
export const subscriptionApi = {
  /** 发起订阅。已确认过的邮箱会重发一封确认信，不会报错。 */
  subscribe(email: string): Promise<SubscribeResult> {
    return http.post<SubscribeResult>('/v1/subscriptions', { email });
  },

  /** 确认订阅 —— 邮件链接落点 */
  confirm(token: string): Promise<{ confirmed: true; email: string }> {
    return http.post<{ confirmed: true; email: string }>('/v1/subscriptions/confirm', { token });
  },

  /** 退订 —— 邮件链接落点。退订即时抑制，不再收到任何投递。 */
  unsubscribe(token: string): Promise<{ unsubscribed: true; email: string }> {
    return http.post<{ unsubscribed: true; email: string }>('/v1/subscriptions/unsubscribe', { token });
  },

  /** 用令牌查看当前订阅状态与偏好 */
  preferences(token: string): Promise<SubscriptionPreferencesResult> {
    return http.get<SubscriptionPreferencesResult>('/v1/subscriptions/preferences', { params: { token } });
  },

  /** 用令牌调整订阅偏好（分类勾选等） */
  updatePreferences(token: string, preferences: Record<string, unknown>): Promise<{ updated: true; preferences: Record<string, unknown> }> {
    return http.put<{ updated: true; preferences: Record<string, unknown> }>('/v1/subscriptions/preferences', { token, preferences });
  },
};
