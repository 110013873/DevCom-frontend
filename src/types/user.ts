/** 社区角色。与后端 `component/common/http.ts` 的常量一一对应。 */
export type UserRole =
  | 'visitor'
  | 'member'
  | 'author'
  | 'moderator'
  | 'mentor'
  | 'ops_admin'
  | 'sys_admin';

/** 登录 / 注册 / 当前用户接口返回的用户对象 */
export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  roles: string[];
}

/** 开发者公开主页（后端 `/v1/users/:id` 只暴露这些字段） */
export interface PublicProfile {
  id: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  /**
   * 注册时间。后端确实返回，但早期类型里漏了 —— 标为可选是因为
   * 这个字段不影响页面可用性，缺失时不该让调用方进错误分支。
   */
  createTime?: string;
}

/** 角色的中文名，仅用于展示（后台标签、用户列表）。 */
export const ROLE_LABELS: Record<string, string> = {
  visitor: '访客',
  member: '社区会员',
  author: '内容作者',
  moderator: '版主',
  mentor: '导师',
  ops_admin: '运营管理员',
  sys_admin: '系统管理员',
};

/**
 * 具备后台访问权限的角色。与后端 `isOpsAdmin()` 保持一致 ——
 * moderator 不在此列，版主能力在后续阶段单独开放。
 */
export const ADMIN_ROLES: readonly string[] = ['ops_admin', 'sys_admin'];

/** 唯一能改动管理账号、维护协议与站点配置的角色 */
export const SYS_ADMIN_ROLE = 'sys_admin';

export function isAdmin(user: Pick<PublicUser, 'roles'> | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return user.roles.some(role => ADMIN_ROLES.includes(role));
}

/**
 * 是否为系统管理员。协议维护、站点配置、授予管理角色都以此为门槛。
 */
export function isSysAdmin(user: Pick<PublicUser, 'roles'> | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return user.roles.includes(SYS_ADMIN_ROLE);
}

/**
 * 当前用户能否管理目标账号。
 *
 * 目标持有管理角色时，只有系统管理员能动它 —— 否则运营管理员之间可以互相
 * 降级，权限体系就失去约束。与自己相关的操作（禁止自我封禁）由调用方另行拦截。
 */
export function canManageUser(
  actor: Pick<PublicUser, 'roles'> | null | undefined,
  target: Pick<PublicUser, 'roles'> | null | undefined
): boolean {
  if (!actor || !target) {
    return false;
  }
  // 先把"非管理员"挡掉：没有后台权限的角色对谁都无权操作
  if (!isAdmin(actor)) {
    return false;
  }
  if (isSysAdmin(actor)) {
    return true;
  }
  return !target.roles.some(role => ADMIN_ROLES.includes(role));
}

/** 是否为已注册会员（含 author 及以上），用于「非会员不可评论」一类门槛提示 */
export function isMember(user: Pick<PublicUser, 'roles'> | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return user.roles.some(role => role !== 'visitor');
}
