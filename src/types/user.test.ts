import { describe, expect, it } from 'vitest';
import { ADMIN_ROLES, ROLE_LABELS, SYS_ADMIN_ROLE, canManageUser, isAdmin, isMember, isSysAdmin } from './user';
import type { PublicUser } from './user';

/** 只关心 roles 的用例，其余字段造个最小合法值即可 */
const withRoles = (...roles: string[]): Pick<PublicUser, 'roles'> => ({ roles });

describe('角色常量', () => {
  it('管理角色是运营管理员与系统管理员', () => {
    expect([...ADMIN_ROLES].sort()).toEqual(['ops_admin', 'sys_admin']);
  });

  it('ROLE_LABELS 覆盖全部七种角色，与后端角色阶梯一致', () => {
    const roleLadder = ['visitor', 'member', 'author', 'moderator', 'mentor', 'ops_admin', 'sys_admin'];
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...roleLadder].sort());
    for (const role of roleLadder) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});

describe('isAdmin', () => {
  it('运营管理员与系统管理员具备后台权限', () => {
    expect(isAdmin(withRoles('ops_admin'))).toBe(true);
    expect(isAdmin(withRoles('sys_admin'))).toBe(true);
  });

  it('版主不具备后台权限（与后端 isOpsAdmin 保持一致）', () => {
    expect(isAdmin(withRoles('moderator'))).toBe(false);
  });

  it('普通会员不具备后台权限', () => {
    expect(isAdmin(withRoles('member', 'author'))).toBe(false);
  });

  it('null / undefined 与空角色列表都返回 false', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin(withRoles())).toBe(false);
  });
});

describe('isSysAdmin', () => {
  it('只有系统管理员为 true', () => {
    expect(isSysAdmin(withRoles(SYS_ADMIN_ROLE))).toBe(true);
    expect(isSysAdmin(withRoles('ops_admin'))).toBe(false);
    expect(isSysAdmin(withRoles('mentor'))).toBe(false);
  });

  it('null / undefined 返回 false', () => {
    expect(isSysAdmin(null)).toBe(false);
    expect(isSysAdmin(undefined)).toBe(false);
  });
});

describe('canManageUser', () => {
  it('系统管理员可以管理任何账号，包括其他管理员', () => {
    expect(canManageUser(withRoles('sys_admin'), withRoles('sys_admin'))).toBe(true);
    expect(canManageUser(withRoles('sys_admin'), withRoles('ops_admin'))).toBe(true);
    expect(canManageUser(withRoles('sys_admin'), withRoles('member'))).toBe(true);
  });

  it('运营管理员不能动持有管理角色的账号（防止互相降级）', () => {
    expect(canManageUser(withRoles('ops_admin'), withRoles('ops_admin'))).toBe(false);
    expect(canManageUser(withRoles('ops_admin'), withRoles('sys_admin'))).toBe(false);
  });

  it('运营管理员可以管理普通成员', () => {
    expect(canManageUser(withRoles('ops_admin'), withRoles('member'))).toBe(true);
    expect(canManageUser(withRoles('ops_admin'), withRoles('mentor', 'author'))).toBe(true);
  });

  it('非管理员对谁都无权操作', () => {
    expect(canManageUser(withRoles('member'), withRoles('member'))).toBe(false);
    expect(canManageUser(withRoles('moderator'), withRoles('visitor'))).toBe(false);
  });

  it('任一入参为空都返回 false', () => {
    expect(canManageUser(null, withRoles('member'))).toBe(false);
    expect(canManageUser(withRoles('sys_admin'), null)).toBe(false);
    expect(canManageUser(undefined, undefined)).toBe(false);
  });
});

describe('isMember', () => {
  it('除访客外的角色都算已注册会员', () => {
    expect(isMember(withRoles('member'))).toBe(true);
    expect(isMember(withRoles('author'))).toBe(true);
    expect(isMember(withRoles('visitor'))).toBe(false);
  });

  it('同时持有 visitor 与其他角色时仍算会员', () => {
    expect(isMember(withRoles('visitor', 'member'))).toBe(true);
  });

  it('空角色列表不是会员', () => {
    expect(isMember(withRoles())).toBe(false);
    expect(isMember(null)).toBe(false);
  });
});
