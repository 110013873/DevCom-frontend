import http from '@/lib/http';
import type {
  AdminAuditLogQuery,
  AdminOverview,
  AdminUserPage,
  AdminUserProfile,
  AdminUserQuery,
  AuditLogPage,
  LegalDocumentPage,
  LegalDocumentDetail,
  SystemConfigItem,
  SystemConfigKey,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
  UpsertLegalDocumentPayload,
} from '@/types/admin';
import type {
  AdminAnnouncement,
  AdminAnnouncementPage,
  AdminAnnouncementQuery,
  AdminCommentItem,
  AdminCommentPage,
  AdminCommentQuery,
  AdminCourseDetail,
  AdminCourseDay,
  AdminCoursePage,
  AdminCourseQuery,
  AdminLesson,
  AdminNewsDetail,
  AdminNewsListItem,
  AdminNewsPage,
  AdminNewsQuery,
  AdminRecommendationSlot,
  AdminResourceDetail,
  AdminResourceFile,
  AdminResourcePage,
  AdminResourceQuery,
  AdminResourceVersion,
  AdminSlotPage,
  AdminSlotQuery,
  AdminSubscriptionPage,
  AdminSubscriptionQuery,
  AdminSubscriptionStats,
  AdminTagPage,
  AdminTagQuery,
  NewsStatus,
  ResourceStatus,
  SlotTargetType,
  SubscriptionStatus,
  UpsertAnnouncementPayload,
  UpsertCourseDayPayload,
  UpsertCoursePayload,
  UpsertLessonPayload,
  UpsertNewsPayload,
  UpsertRecommendationSlotPayload,
  UpsertResourceFilePayload,
  UpsertResourcePayload,
  UpsertResourceVersionPayload,
  UpsertTagPayload,
} from '@/types/adminContent';
import type { Tag, TagType } from '@/types/content';

/**
 * 管理后台接口。全部挂在 `/v1/admin/**` 下，服务端对每条路由独立校验管理角色
 * （`@Authorized(OPS_ADMINS)`），前端的守卫只负责体验，不承担安全职责。
 */

/** 用户管理 */
export const adminUserApi = {
  list(query: AdminUserQuery): Promise<AdminUserPage> {
    return http.get<AdminUserPage>('/v1/admin/users', { params: query });
  },

  detail(id: string): Promise<AdminUserProfile> {
    return http.get<AdminUserProfile>(`/v1/admin/users/${id}`);
  },

  updateStatus(id: string, payload: UpdateUserStatusPayload): Promise<{ updated: true }> {
    return http.put<{ updated: true }>(`/v1/admin/users/${id}/status`, payload);
  },

  updateRoles(id: string, payload: UpdateUserRolesPayload): Promise<{ updated: true; roles: string[] }> {
    return http.put<{ updated: true; roles: string[] }>(`/v1/admin/users/${id}/roles`, payload);
  },

  updateProfile(id: string, payload: Partial<Pick<AdminUserProfile, 'displayName' | 'avatar' | 'bio' | 'phone'>>): Promise<{ updated: true }> {
    return http.put<{ updated: true }>(`/v1/admin/users/${id}`, payload);
  },
};

/** 操作日志 */
export const adminLogApi = {
  list(query: AdminAuditLogQuery): Promise<AuditLogPage> {
    return http.get<AuditLogPage>('/v1/admin/audit-logs', { params: query });
  },
};

/** 运营大屏统计 */
export const adminMetricApi = {
  /** 近 N 天概览。不传 `days` 时由后端取默认窗口。 */
  overview(days?: number): Promise<AdminOverview> {
    return http.get<AdminOverview>('/v1/admin/metrics/overview', { params: days ? { days } : undefined });
  },
};

/** 系统设置：协议版本与站点配置 */
export const adminSystemApi = {
  listLegalDocuments(query?: { type?: string; pageNumber?: number; pageSize?: number }): Promise<LegalDocumentPage> {
    return http.get<LegalDocumentPage>('/v1/admin/legal-documents', { params: query });
  },

  legalDocumentDetail(id: string): Promise<LegalDocumentDetail> {
    return http.get<LegalDocumentDetail>(`/v1/admin/legal-documents/${id}`);
  },

  saveLegalDocument(payload: UpsertLegalDocumentPayload): Promise<{ updated: true }> {
    return http.put<{ updated: true }>('/v1/admin/legal-documents', payload);
  },

  listConfigs(): Promise<SystemConfigItem[]> {
    return http.get<SystemConfigItem[]>('/v1/admin/configs');
  },

  updateConfig(key: SystemConfigKey, value: unknown): Promise<{ updated: true }> {
    return http.put<{ updated: true }>('/v1/admin/configs', { key, value });
  },
};

/**
 * 内容域的运营接口。
 *
 * 一个贯穿全篇的后端约定：**列表接口手工挑字段，详情/新建/更新返回整实体**。
 * 所以 `list()` 与 `detail()` 的返回类型是两个不同的接口，而不是泛型同一份。
 *
 * 另一处容易踩空的差异：更新用的是 `PUT` 全量语义，且后端对「字段没传」
 * 的处理**并不一致** —— 有的字段（如 `summary`、`coverImage`）会被重置为
 * 空值，有的（如 `category`、`status`）会保留原值。因此每个编辑表单都必须
 * 先把详情**整体**灌进表单再提交，不能只提交被改动的那几个字段。
 */

/** 新闻管理 */
export const adminNewsApi = {
  list(query: AdminNewsQuery): Promise<AdminNewsPage> {
    return http.get<AdminNewsPage>('/v1/admin/news', { params: query });
  },

  detail(id: string): Promise<AdminNewsDetail> {
    return http.get<AdminNewsDetail>(`/v1/admin/news/${id}`);
  },

  create(payload: UpsertNewsPayload): Promise<AdminNewsDetail> {
    return http.post<AdminNewsDetail>('/v1/admin/news', payload);
  },

  update(id: string, payload: UpsertNewsPayload): Promise<AdminNewsDetail> {
    return http.put<AdminNewsDetail>(`/v1/admin/news/${id}`, payload);
  },

  updateStatus(id: string, status: NewsStatus): Promise<{ updated: true; status: NewsStatus }> {
    return http.put<{ updated: true; status: NewsStatus }>(`/v1/admin/news/${id}/status`, { status });
  },

  /**
   * 置顶开关。
   *
   * ⚠️ 后端判定是 `body?.isFeatured !== false` —— 只有显式传 `false` 才会取消置顶，
   * 传 `undefined`/`null`/任何真值都会置顶。所以这里必须**始终显式**传布尔值。
   */
  setFeatured(id: string, isFeatured: boolean): Promise<{ updated: true; isFeatured: boolean }> {
    return http.put<{ updated: true; isFeatured: boolean }>(`/v1/admin/news/${id}/feature`, { isFeatured });
  },

  remove(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/news/${id}`);
  },
};

/**
 * 标签管理。写入端点挂在公开的 `tagController` 上（`/v1/news-tags` 等），
 * 而非 `/v1/admin/**` —— 服务端在那几个写路由上单独做了 `@Authorized`。
 *
 * `type` 参数：服务端 DTO 强制要求，但处理函数会忽略它、按 URL 段定类型。
 * 这里由封装体按端点自动填对，调用方不需要关心。
 */
function createTagApi(segment: 'news-tags' | 'resource-tags', type: TagType) {
  return {
    list(query: AdminTagQuery = {}): Promise<AdminTagPage> {
      return http.get<AdminTagPage>(`/v1/${segment}`, { params: query });
    },

    create(name: string): Promise<Tag> {
      return http.post<Tag>(`/v1/${segment}`, { name, type } satisfies UpsertTagPayload);
    },

    update(id: string, name: string): Promise<Tag> {
      return http.put<Tag>(`/v1/${segment}/${id}`, { name, type } satisfies UpsertTagPayload);
    },

    remove(id: string): Promise<{ deleted: true }> {
      return http.delete<{ deleted: true }>(`/v1/${segment}/${id}`);
    },
  };
}

export const adminNewsTagApi = createTagApi('news-tags', 'news');
export const adminResourceTagApi = createTagApi('resource-tags', 'resource');

/** 资源管理 */
export const adminResourceApi = {
  list(query: AdminResourceQuery): Promise<AdminResourcePage> {
    return http.get<AdminResourcePage>('/v1/admin/resources', { params: query });
  },

  detail(id: string): Promise<AdminResourceDetail> {
    return http.get<AdminResourceDetail>(`/v1/admin/resources/${id}`);
  },

  create(payload: UpsertResourcePayload): Promise<AdminResourceDetail> {
    return http.post<AdminResourceDetail>('/v1/admin/resources', payload);
  },

  update(id: string, payload: UpsertResourcePayload): Promise<AdminResourceDetail> {
    return http.put<AdminResourceDetail>(`/v1/admin/resources/${id}`, payload);
  },

  remove(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/resources/${id}`);
  },

  versions(resourceId: string): Promise<{ total: number; items: AdminResourceVersion[] }> {
    return http.get<{ total: number; items: AdminResourceVersion[] }>(
      `/v1/admin/resources/${resourceId}/versions`
    );
  },

  createVersion(resourceId: string, payload: UpsertResourceVersionPayload): Promise<AdminResourceVersion> {
    return http.post<AdminResourceVersion>(`/v1/admin/resources/${resourceId}/versions`, payload);
  },

  updateVersion(
    resourceId: string,
    versionId: string,
    payload: UpsertResourceVersionPayload
  ): Promise<AdminResourceVersion> {
    return http.put<AdminResourceVersion>(
      `/v1/admin/resources/${resourceId}/versions/${versionId}`,
      payload
    );
  },

  removeVersion(resourceId: string, versionId: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/resources/${resourceId}/versions/${versionId}`);
  },

  addFile(
    resourceId: string,
    versionId: string,
    payload: UpsertResourceFilePayload
  ): Promise<AdminResourceFile> {
    return http.post<AdminResourceFile>(
      `/v1/admin/resources/${resourceId}/versions/${versionId}/files`,
      payload
    );
  },

  /** 文件更新走的是不带 resourceId 的路径（后端 `PUT /files/:fileId`） */
  updateFile(fileId: string, payload: UpsertResourceFilePayload): Promise<AdminResourceFile> {
    return http.put<AdminResourceFile>(`/v1/admin/resources/files/${fileId}`, payload);
  },

  removeFile(fileId: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/resources/files/${fileId}`);
  },
};

/** 课程管理（课程 / Day / Lesson 三级） */
export const adminCourseApi = {
  list(query: AdminCourseQuery): Promise<AdminCoursePage> {
    return http.get<AdminCoursePage>('/v1/admin/courses', { params: query });
  },

  detail(id: string): Promise<AdminCourseDetail> {
    return http.get<AdminCourseDetail>(`/v1/admin/courses/${id}`);
  },

  create(payload: UpsertCoursePayload): Promise<{ id: string } & Record<string, unknown>> {
    return http.post<{ id: string } & Record<string, unknown>>('/v1/admin/courses', payload);
  },

  update(id: string, payload: UpsertCoursePayload): Promise<AdminCourseDetail> {
    return http.put<AdminCourseDetail>(`/v1/admin/courses/${id}`, payload);
  },

  remove(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/courses/${id}`);
  },

  createDay(courseId: string, payload: UpsertCourseDayPayload): Promise<AdminCourseDay> {
    return http.post<AdminCourseDay>(`/v1/admin/courses/${courseId}/days`, payload);
  },

  updateDay(courseId: string, dayId: string, payload: UpsertCourseDayPayload): Promise<AdminCourseDay> {
    return http.put<AdminCourseDay>(`/v1/admin/courses/${courseId}/days/${dayId}`, payload);
  },

  /** ⚠️ 物理删除，且 `lesson.dayId` 是 ON DELETE CASCADE —— 会连带删掉该 Day 下所有课时 */
  removeDay(courseId: string, dayId: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/courses/${courseId}/days/${dayId}`);
  },

  createLesson(courseId: string, payload: UpsertLessonPayload): Promise<AdminLesson> {
    return http.post<AdminLesson>(`/v1/admin/courses/${courseId}/lessons`, payload);
  },

  updateLesson(courseId: string, lessonId: string, payload: UpsertLessonPayload): Promise<AdminLesson> {
    return http.put<AdminLesson>(`/v1/admin/courses/${courseId}/lessons/${lessonId}`, payload);
  },

  removeLesson(courseId: string, lessonId: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/courses/${courseId}/lessons/${lessonId}`);
  },
};

/** 公告与首页推荐位 */
export const adminBannerApi = {
  listAnnouncements(query: AdminAnnouncementQuery = {}): Promise<AdminAnnouncementPage> {
    return http.get<AdminAnnouncementPage>('/v1/admin/announcements', { params: query });
  },

  createAnnouncement(payload: UpsertAnnouncementPayload): Promise<AdminAnnouncement> {
    return http.post<AdminAnnouncement>('/v1/admin/announcements', payload);
  },

  updateAnnouncement(id: string, payload: UpsertAnnouncementPayload): Promise<AdminAnnouncement> {
    return http.put<AdminAnnouncement>(`/v1/admin/announcements/${id}`, payload);
  },

  removeAnnouncement(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/announcements/${id}`);
  },

  listSlots(query: AdminSlotQuery = {}): Promise<AdminSlotPage> {
    return http.get<AdminSlotPage>('/v1/admin/recommendation-slots', { params: query });
  },

  createSlot(payload: UpsertRecommendationSlotPayload): Promise<AdminRecommendationSlot> {
    return http.post<AdminRecommendationSlot>('/v1/admin/recommendation-slots', payload);
  },

  updateSlot(id: string, payload: UpsertRecommendationSlotPayload): Promise<AdminRecommendationSlot> {
    return http.put<AdminRecommendationSlot>(`/v1/admin/recommendation-slots/${id}`, payload);
  },

  removeSlot(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/recommendation-slots/${id}`);
  },
};

/** 评论与反馈审核 */
export const adminCommentApi = {
  list(query: AdminCommentQuery): Promise<AdminCommentPage> {
    return http.get<AdminCommentPage>('/v1/admin/comments', { params: query });
  },

  /** 待审数量，供后台导航角标使用 */
  pendingCount(): Promise<{ pending: number }> {
    return http.get<{ pending: number }>('/v1/admin/comments/pending-count');
  },

  moderate(id: string, status: Exclude<AdminCommentItem['status'], never>, reason?: string) {
    return http.put<{ updated: true; status: string }>(`/v1/admin/comments/${id}/moderate`, {
      status,
      reason,
    });
  },

  remove(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/comments/${id}`);
  },
};

/** 订阅列表与退订抑制 */
export const adminSubscriptionApi = {
  list(query: AdminSubscriptionQuery): Promise<AdminSubscriptionPage> {
    return http.get<AdminSubscriptionPage>('/v1/admin/subscriptions/', { params: query });
  },

  stats(): Promise<AdminSubscriptionStats> {
    return http.get<AdminSubscriptionStats>('/v1/admin/subscriptions/stats');
  },

  updateStatus(id: string, status: SubscriptionStatus) {
    return http.put<{ updated: true; status: SubscriptionStatus }>(
      `/v1/admin/subscriptions/${id}/status`,
      { status }
    );
  },

  remove(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/admin/subscriptions/${id}`);
  },
};

/** 推荐位目标类型，供表单下拉使用 */
export const SLOT_TARGET_TYPES: Array<{ value: SlotTargetType; label: string }> = [
  { value: 'news', label: '新闻' },
  { value: 'resource', label: '资源' },
  { value: 'course', label: '课程' },
];

/** 资源状态，供表单下拉使用 */
export const RESOURCE_STATUS_OPTIONS: Array<{ value: ResourceStatus; label: string }> = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

/** 新闻列表项，供推荐位选择器复用（与 `AdminNewsListItem` 同形） */
export type { AdminNewsListItem };
