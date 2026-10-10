import type { Page, PaginationQuery } from '@/types/common';
import type {
  CommentStatus,
  CourseLevel,
  LessonType,
  ResourceCategory,
  Tag,
  TagType,
} from '@/types/content';

/**
 * 后台内容域类型。
 *
 * 与 `types/content.ts` 的分工：那边描述**前台**消费的视图（列表只出摘要、
 * 详情才给正文），这里描述**后台**读写的内容。两者刻意不复用 —— 后端的
 * 后台接口返回的是完整实体（含 `lang`、`createdById`、`deleteTime` 这类
 * 前台永远拿不到的管理字段），前台类型少一个字段就会让编辑表单悄悄丢数据。
 *
 * 一个必须记住的后端差异：列表接口是**手工挑字段**的 `.map`，详情/新建/更新
 * 接口是**整实体展开**。因此同一个域的 list 与 detail 是两个不同的类型，
 * 不能合并。
 */

/* ------------------------------------------------------------------ 新闻 */

export type NewsStatus = 'draft' | 'published' | 'archived';

export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

/** 后台新闻列表项（后端 `.map` 挑字段，不含正文） */
export interface AdminNewsListItem {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  author: string | null;
  status: NewsStatus;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  viewCount: number;
  publishedAt: string | null;
  createTime: string;
  updateTime: string;
  slug: string | null;
  tags: Tag[];
}

/**
 * 后台新闻详情（整实体展开 + `tagIds`）。
 *
 * 只声明编辑器真正会用到的字段。后端还会多返回 `lang`/`createdById`/
 * `deleteTime` 等，但表单不渲染它们，写回时也不提交 —— `UpsertNewsRequest`
 * 里没有这些字段，后端在 update 分支里自行保留原值。
 */
export interface AdminNewsDetail {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string;
  coverImage: string | null;
  content: Record<string, unknown> | null;
  contentHtml: string;
  category: string;
  author: string | null;
  publishedAt: string | null;
  status: NewsStatus;
  slug: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  tagIds: string[];
  createTime: string;
  updateTime: string;
}

export interface AdminNewsQuery extends PaginationQuery {
  status?: NewsStatus;
  category?: string;
}

/** 新建/更新新闻。`tagIds` 是全量替换语义。 */
export interface UpsertNewsPayload {
  title: string;
  subtitle?: string;
  summary?: string;
  coverImage?: string;
  content?: Record<string, unknown>;
  contentHtml: string;
  category?: string;
  author?: string;
  publishedAt?: string;
  status?: NewsStatus;
  slug?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tagIds?: string[];
}

export type AdminNewsPage = Page<AdminNewsListItem>;

/* ------------------------------------------------------------------ 标签 */

/**
 * 标签写入体。
 *
 * `type` 在服务端是**必填**（DTO 上标了 `@IsIn`），但路由处理函数会忽略它、
 * 按 URL 段决定真实类型。也就是说：这个字段纯粹为了过校验，取值必须与
 * 调用的端点一致（打 `/news-tags` 就传 `'news'`），否则请求会 400。
 */
export interface UpsertTagPayload {
  name: string;
  type: TagType;
}

export interface AdminTagQuery extends PaginationQuery {
  type?: TagType;
}

export type AdminTagPage = Page<Tag>;

/* ------------------------------------------------------------------ 资源 */

export type ResourceStatus = 'draft' | 'published' | 'archived';

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

/** 后台资源列表项（`ratingAvg` 已被后端 `numericToNumber` 归一为数字） */
export interface AdminResourceListItem {
  id: string;
  name: string;
  summary: string;
  coverImage: string | null;
  category: ResourceCategory;
  author: string | null;
  status: ResourceStatus;
  isPublic: boolean;
  isRecommended: boolean;
  isFree: boolean;
  downloadCount: number;
  ratingAvg: number;
  ratingCount: number;
  publishedAt: string | null;
  createTime: string;
  updateTime: string;
  tags: Tag[];
}

/**
 * 后台资源详情。
 *
 * ⚠️ `ratingAvg` 在这里是**字符串**：详情接口走的是整实体展开，没有经过
 * `numericToNumber`，而 Postgres 的 `numeric` 经 pg 驱动读出来就是字符串
 * （形如 `"4.50"`）。列表接口反而是 number。这个不对称是后端既有的，
 * 前端在展示前统一用 `Number(...)` 收敛。
 */
export interface AdminResourceDetail {
  id: string;
  name: string;
  summary: string;
  coverImage: string | null;
  category: ResourceCategory;
  author: string | null;
  isRecommended: boolean;
  isFree: boolean;
  isPublic: boolean;
  downloadCount: number;
  ratingAvg: string | number;
  ratingCount: number;
  overview: string;
  keyFeatures: string | null;
  supportedArch: string | null;
  quickStart: string | null;
  systemRequirements: string | null;
  slug: string | null;
  status: ResourceStatus;
  publishedAt: string | null;
  tagIds: string[];
  createTime: string;
  updateTime: string;
}

export interface AdminResourceQuery extends PaginationQuery {
  category?: ResourceCategory;
  status?: ResourceStatus;
}

export interface UpsertResourcePayload {
  name: string;
  summary?: string;
  coverImage?: string;
  category?: ResourceCategory;
  author?: string;
  isRecommended?: boolean;
  isFree?: boolean;
  isPublic?: boolean;
  overview?: string;
  keyFeatures?: string;
  supportedArch?: string;
  quickStart?: string;
  systemRequirements?: string;
  slug?: string;
  status?: ResourceStatus;
  publishedAt?: string;
  tagIds?: string[];
}

export type AdminResourcePage = Page<AdminResourceListItem>;

/* ------------------------------------------------------- 资源版本与文件 */

/** 单个可下载文件。`size` 是 bigint 列，pg 驱动读回来是**字符串**。 */
export interface AdminResourceFile {
  id: string;
  versionId: string;
  fileName: string;
  osArch: string | null;
  size: string;
  checksum: string | null;
  storageKey: string;
  url: string;
  updateTime: string;
}

export interface AdminResourceVersion {
  id: string;
  resourceId: string;
  version: string;
  name: string;
  description: string | null;
  changelog: string | null;
  isDefault: boolean;
  giteeUrl: string | null;
  githubUrl: string | null;
  status: ResourceStatus;
  createTime: string;
  updateTime: string;
  files: AdminResourceFile[];
}

export interface UpsertResourceVersionPayload {
  version: string;
  name: string;
  description?: string;
  changelog?: string;
  isDefault?: boolean;
  giteeUrl?: string;
  githubUrl?: string;
  status?: ResourceStatus;
}

export interface UpsertResourceFilePayload {
  fileName: string;
  osArch?: string;
  size?: number;
  checksum?: string;
  storageKey: string;
  url: string;
}

/* ------------------------------------------------------------------ 课程 */

export interface AdminCourseListItem {
  id: string;
  title: string;
  coverImage: string | null;
  level: CourseLevel;
  direction: string | null;
  instructor: string | null;
  duration: string | null;
  status: ResourceStatus;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export interface AdminCourseDay {
  id: string;
  courseId: string;
  dayNumber: number;
  title: string;
  sortOrder: number;
}

export interface AdminLesson {
  id: string;
  courseId: string;
  dayId: string | null;
  title: string;
  type: LessonType;
  content: string;
  externalUrl: string | null;
  isPaid: boolean;
  duration: number | null;
  sortOrder: number;
}

export interface AdminCourseDetail {
  id: string;
  title: string;
  coverImage: string | null;
  level: CourseLevel;
  direction: string | null;
  instructor: string | null;
  duration: string | null;
  prerequisites: string | null;
  description: string;
  status: ResourceStatus;
  sortOrder: number;
  days: AdminCourseDay[];
  lessons: AdminLesson[];
  createTime: string;
  updateTime: string;
}

export interface AdminCourseQuery extends PaginationQuery {
  level?: CourseLevel;
  status?: ResourceStatus;
}

export interface UpsertCoursePayload {
  title: string;
  coverImage?: string;
  level?: CourseLevel;
  direction?: string;
  instructor?: string;
  duration?: string;
  prerequisites?: string;
  description?: string;
  status?: ResourceStatus;
  sortOrder?: number;
}

export interface UpsertCourseDayPayload {
  dayNumber: number;
  title: string;
  sortOrder?: number;
}

export interface UpsertLessonPayload {
  title: string;
  dayId?: string;
  type?: LessonType;
  content?: string;
  externalUrl?: string;
  isPaid?: boolean;
  duration?: number;
  sortOrder?: number;
}

export type AdminCoursePage = Page<AdminCourseListItem>;

/* --------------------------------------------------- 公告与推荐位 */

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  position: string;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createTime: string;
  updateTime: string;
}

export interface UpsertAnnouncementPayload {
  title: string;
  content?: string;
  position?: string;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

export type SlotTargetType = 'news' | 'resource' | 'course';

/** 推荐位。注意这个实体**没有** `createTime`，只有 `updateTime`。 */
export interface AdminRecommendationSlot {
  id: string;
  slotKey: string;
  targetType: SlotTargetType;
  targetId: string;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  updateTime: string;
}

export interface UpsertRecommendationSlotPayload {
  slotKey: string;
  targetType: SlotTargetType;
  targetId: string;
  sortOrder?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

export interface AdminAnnouncementQuery extends PaginationQuery {
  position?: string;
}

export interface AdminSlotQuery extends PaginationQuery {
  slotKey?: string;
}

export type AdminAnnouncementPage = Page<AdminAnnouncement>;
export type AdminSlotPage = Page<AdminRecommendationSlot>;

/* ------------------------------------------------------------------ 评论 */

/** 审核队列条目。新闻评论与资源反馈共用一张表，此处不按 targetType 拆接口。 */
export interface AdminCommentItem {
  id: string;
  targetType: string;
  targetId: string;
  parentId: string | null;
  content: string;
  status: CommentStatus;
  likeCount: number;
  createTime: string;
  userId: string;
  authorName: string | null;
  authorAvatar: string | null;
}

export interface AdminCommentQuery extends PaginationQuery {
  targetType?: string;
  status?: CommentStatus;
}

export type AdminCommentPage = Page<AdminCommentItem>;

/* ------------------------------------------------------------------ 订阅 */

export type SubscriptionStatus = 'pending' | 'active' | 'unsubscribed' | 'suppressed';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending: '待确认',
  active: '已订阅',
  unsubscribed: '已退订',
  suppressed: '已抑制',
};

/** `tokenHash` 是内部凭据摘要，后端**任何响应都不返回** */
export interface AdminSubscriptionItem {
  id: string;
  email: string;
  status: SubscriptionStatus;
  preferences: Record<string, unknown>;
  confirmedAt: string | null;
  createTime: string;
  updateTime: string;
}

export interface AdminSubscriptionStats {
  total: number;
  byStatus: Record<SubscriptionStatus, number>;
}

export interface AdminSubscriptionQuery extends PaginationQuery {
  status?: SubscriptionStatus;
}

export type AdminSubscriptionPage = Page<AdminSubscriptionItem>;
