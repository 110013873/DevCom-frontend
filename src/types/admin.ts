import type { Page, PaginationQuery } from '@/types/common';
import type { NewsCategory } from '@/types/config';

/** 账号状态。与后端 `entity/user.ts` 的 `UserStatus` 一致。 */
export type UserStatus = 'active' | 'banned';

/** 管理端用户列表 / 详情返回的档案，对应后端 `UserProfile` + 少量管理字段 */
export interface AdminUserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  status: UserStatus;
  roles: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  createTime: string;
  lastLoginAt: string | null;
  updateTime?: string;
}

/** 用户列表查询：在通用分页之上追加状态与角色筛选 */
export interface AdminUserQuery extends PaginationQuery {
  status?: UserStatus;
  role?: string;
}

/** 操作日志。`status` 表达的是结果严重度，而非账号状态。 */
export type AuditStatus = 'success' | 'warning' | 'danger';

export interface AuditLogItem {
  id: string;
  adminName: string;
  userId: string | null;
  action: string;
  module: string | null;
  targetType: string | null;
  targetId: string | null;
  status: AuditStatus;
  reason: string | null;
  ip: string | null;
  details: Record<string, unknown> | null;
  createTime: string;
}

/** 日志查询：模块 / 动作 / 结果 / 时间区间 */
export interface AdminAuditLogQuery extends PaginationQuery {
  module?: string;
  action?: string;
  status?: AuditStatus;
  startTime?: string;
  endTime?: string;
}

/**
 * 分布图的一项。`key` 是数据库里的原始取值（状态码 / 分类码），展示名由页面用
 * `contentLabels` 里的映射给出 —— 后端不返回展示名，避免同一套词表在两处各维护
 * 一份而漂移。
 */
export interface MetricSlice {
  key: string;
  count: number;
}

/** 趋势图的一天。`date` 为 `YYYY-MM-DD`。 */
export interface MetricTrendPoint {
  date: string;
  users: number;
  news: number;
  resources: number;
  downloads: number;
  comments: number;
  subscriptions: number;
}

/** 运营大屏统计。数字全部来自后端真实查询，无数据即为 0。 */
export interface AdminOverview {
  range: { days: number; since: string };
  totals: {
    user: { total: number; active: number; banned: number; verified: number; new: number; activeInRange: number };
    news: { total: number; published: number; draft: number; archived: number; views: number };
    resource: { total: number; published: number; draft: number; hidden: number; downloads: number; avgRating: number };
    course: { total: number; published: number; lessons: number };
    comment: { total: number; pending: number; published: number; hidden: number };
    subscription: { total: number; active: number; pending: number; unsubscribed: number; suppressed: number };
    download: { total: number; inRange: number; users: number; files: number };
    interaction: { likes: number; favorites: number };
    tag: { news: number; resource: number };
  };
  trends: MetricTrendPoint[];
  distributions: {
    userStatus: MetricSlice[];
    newsCategory: MetricSlice[];
    newsStatus: MetricSlice[];
    resourceCategory: MetricSlice[];
    resourceStatus: MetricSlice[];
    commentStatus: MetricSlice[];
    subscriptionStatus: MetricSlice[];
    courseLevel: MetricSlice[];
    downloadCategory: MetricSlice[];
  };
  rankings: {
    topNews: Array<{ id: string; title: string; category: string; viewCount: number; publishedAt: string | null }>;
    topResources: Array<{
      id: string;
      name: string;
      category: string;
      downloadCount: number;
      ratingAvg: number;
      ratingCount: number;
    }>;
    topTags: Array<{ name: string; count: number }>;
  };
  recentAuditLogs: AuditLogItem[];
}

/**
 * 可维护的配置键白名单，与后端 `component/common/constants.ts` 的 `CONFIG_KEYS` 一一对应。
 *
 * 注意与后端 `PUBLIC_CONFIG_KEYS` 的区别：白名单里的键都能在后台写，
 * 但只有一部分会下发给匿名访客。`feature_flags` 目前是内部开关，不下发。
 */
export type SystemConfigKey = 'site_brand' | 'site_footer' | 'feature_flags' | 'news_categories';

export interface SystemConfigItem {
  key: string;
  value: unknown;
  description: string | null;
  updateTime: string;
}

export interface SiteBrandConfig {
  name: string;
  shortName: string;
  slogan: string;
  logoUrl: string;
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface SiteFooterConfig {
  contactEmail: string;
  icp: string;
  publicSecurity: string;
  links: FooterLink[];
}

export interface FeatureFlagsConfig {
  allowRegister: boolean;
  allowComment: boolean;
  allowResourceDownloadWithoutLogin: boolean;
}

/**
 * 新闻分类词表。
 *
 * 这不是一个「配置对象」，而是一个**数组** —— 后台按整份替换提交，
 * 不做元素级合并（见后端 `configService`）。因此编辑表单用的是
 * `Form.List` 而非普通字段集合。
 */
export type NewsCategoriesConfig = NewsCategory[];

/** 协议/隐私政策的版本记录 */
export interface LegalDocumentVersion {
  id: string;
  type: 'user_agreement' | 'privacy_policy';
  version: string;
  effectiveDate: string;
  lang: string;
  isActive: boolean;
  createTime: string;
  updateTime: string;
}

export interface UpsertLegalDocumentPayload {
  type: 'user_agreement' | 'privacy_policy';
  version: string;
  effectiveDate?: string;
  contentHtml: string;
  isActive?: boolean;
}

/** 单个协议的完整内容，仅在编辑既有版本时按需拉取（列表不返回正文） */
export interface LegalDocumentDetail extends LegalDocumentVersion {
  contentHtml: string;
  content: Record<string, unknown> | null;
}

/** 封禁/解封。封禁时后端强制要求 reason。 */
export interface UpdateUserStatusPayload {
  status: UserStatus;
  reason?: string;
}

/** 全量替换用户的全局角色 */
export interface UpdateUserRolesPayload {
  roles: string[];
}

export type AdminUserPage = Page<AdminUserProfile>;
export type AuditLogPage = Page<AuditLogItem>;
export type LegalDocumentPage = Page<LegalDocumentVersion>;
