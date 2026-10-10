import { describe, expect, it } from 'vitest';
import { pickConfig } from './config';
import type { FeatureFlagsConfig, SiteFooterConfig } from '@/types/admin';

const BRAND_FALLBACK = { name: '', shortName: '', slogan: '', logoUrl: '' };

const FOOTER_FALLBACK: SiteFooterConfig = {
  contactEmail: '',
  icp: '',
  publicSecurity: '',
  links: [],
};

describe('pickConfig', () => {
  it('保留 fallback 中的字段并从 value 取值', () => {
    const result = pickConfig({ name: '开发者社区', slogan: '共建生态' }, BRAND_FALLBACK);
    expect(result.name).toBe('开发者社区');
    expect(result.slogan).toBe('共建生态');
    // 未提供的字段回落为默认值
    expect(result.shortName).toBe('');
    expect(result.logoUrl).toBe('');
  });

  it.each([null, undefined, '字符串', 42, true])('非对象入参 %s 直接返回默认值', value => {
    expect(pickConfig(value, BRAND_FALLBACK)).toEqual(BRAND_FALLBACK);
  });

  it('丢弃 fallback 之外的额外字段，不把脏数据带回表单', () => {
    const result = pickConfig({ name: '社区', injected: '不该出现', __proto__: { x: 1 } }, BRAND_FALLBACK);
    expect(result).not.toHaveProperty('injected');
    expect(Object.keys(result).sort()).toEqual(['logoUrl', 'name', 'shortName', 'slogan']);
  });

  it('类型不一致的字段回落到默认值', () => {
    // name 应为 string，若库里被写成数字则不采用
    const result = pickConfig({ name: 123, shortName: '简称' }, BRAND_FALLBACK);
    expect(result.name).toBe('');
    expect(result.shortName).toBe('简称');
  });

  it('合法的假值不被当作缺失', () => {
    const fallback: FeatureFlagsConfig = {
      allowRegister: true,
      allowComment: true,
      allowResourceDownloadWithoutLogin: true,
    };
    const result = pickConfig({ allowRegister: false, allowComment: false }, fallback);
    expect(result.allowRegister).toBe(false);
    expect(result.allowComment).toBe(false);
    // 未提供的键仍取默认值
    expect(result.allowResourceDownloadWithoutLogin).toBe(true);
  });

  it('null 字段视为缺失而非覆盖为空', () => {
    const result = pickConfig({ name: null, slogan: 'x' }, BRAND_FALLBACK);
    expect(result.name).toBe('');
    expect(result.slogan).toBe('x');
  });

  it('保留数组字段（页脚链接列表）', () => {
    const links = [{ label: '关于我们', url: '/about' }];
    const result = pickConfig({ ...FOOTER_FALLBACK, links }, FOOTER_FALLBACK);
    expect(result.links).toEqual(links);
  });

  it('数组字段收到非数组时回落，避免把字符串当列表渲染', () => {
    const result = pickConfig({ links: '不是数组' }, FOOTER_FALLBACK);
    expect(result.links).toEqual([]);
  });

  it('不修改传入的 fallback 对象', () => {
    const fallback = { ...BRAND_FALLBACK };
    const snapshot = { ...fallback };
    pickConfig({ name: '新名字' }, fallback);
    expect(fallback).toEqual(snapshot);
  });
});
