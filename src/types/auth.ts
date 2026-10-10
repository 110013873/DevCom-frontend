import type { PublicUser } from './user';

export interface SendCodePayload {
  identifier: string;
  channel: 'email' | 'sms';
  purpose: 'register' | 'reset' | 'bind' | 'login';
}

export interface RegisterPayload {
  email?: string;
  phone?: string;
  code: string;
  password: string;
  displayName?: string;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
  channel: 'email' | 'sms';
}

export interface ResetPasswordPayload {
  identifier: string;
  code: string;
  password: string;
}

/** register / login 的返回体 */
export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface UpdateProfilePayload {
  displayName?: string;
  avatar?: string;
  bio?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  password: string;
}

export type LegalDocumentType = 'user_agreement' | 'privacy_policy';

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  effectiveDate: string;
  contentHtml: string;
  lang: string;
  updateTime: string;
}

export interface UploadResult {
  id: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export type UploadPurpose =
  | 'image'
  | 'avatar'
  | 'cover'
  | 'video'
  | 'audio'
  | 'document'
  | 'resource';
