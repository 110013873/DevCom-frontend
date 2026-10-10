import http from '@/lib/http';
import type {
  AuthResult,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LegalDocument,
  LegalDocumentType,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  SendCodePayload,
  UpdateProfilePayload,
  UploadPurpose,
  UploadResult,
} from '@/types/auth';
import type { PublicProfile, PublicUser } from '@/types/user';
import type { Page } from '@/types/common';
import type { MyDownloadItem } from '@/types/content';

/** 认证：注册 / 登录 / 验证码 / 找回密码 */
export const authApi = {
  sendCode(payload: SendCodePayload): Promise<{ sent: true }> {
    return http.post<{ sent: true }>('/v1/auth/send-code', payload);
  },

  register(payload: RegisterPayload): Promise<AuthResult> {
    return http.post<AuthResult>('/v1/auth/register', payload);
  },

  login(payload: LoginPayload): Promise<AuthResult> {
    return http.post<AuthResult>('/v1/auth/login', payload);
  },

  forgotPassword(payload: ForgotPasswordPayload): Promise<{ sent: true }> {
    return http.post<{ sent: true }>('/v1/auth/forgot-password', payload);
  },

  resetPassword(payload: ResetPasswordPayload): Promise<{ reset: true }> {
    return http.post<{ reset: true }>('/v1/auth/reset-password', payload);
  },
};

/** 当前用户与公开主页 */
export const userApi = {
  me(): Promise<PublicUser> {
    return http.get<PublicUser>('/v1/users/me');
  },

  updateMe(payload: UpdateProfilePayload): Promise<Pick<PublicUser, 'id' | 'displayName' | 'avatar' | 'bio'>> {
    return http.put<Pick<PublicUser, 'id' | 'displayName' | 'avatar' | 'bio'>>('/v1/users/me', payload);
  },

  changePassword(payload: ChangePasswordPayload): Promise<{ updated: true }> {
    return http.put<{ updated: true }>('/v1/users/me/password', payload);
  },

  publicProfile(id: string): Promise<PublicProfile> {
    return http.get<PublicProfile>(`/v1/users/${id}`);
  },

  /** 我的下载记录（分页，按时间倒序） */
  downloads(params: { pageNumber?: number; pageSize?: number } = {}): Promise<Page<MyDownloadItem>> {
    return http.get<Page<MyDownloadItem>>('/v1/users/me/downloads', { params });
  },
};

/** 协议与隐私政策 */
export const legalApi = {
  get(type: LegalDocumentType, version?: string): Promise<LegalDocument> {
    return http.get<LegalDocument>(`/v1/legal/${type}`, {
      params: version ? { version } : undefined,
    });
  },
};

/** 通用附件上传（multipart，字段名固定为 files） */
export const uploadApi = {
  upload(files: File[], purpose: UploadPurpose): Promise<UploadResult[]> {
    const form = new FormData();
    files.forEach(file => form.append('files', file));
    form.append('purpose', purpose);
    return http.post<UploadResult[]>('/v1/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
