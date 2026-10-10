import { describe, expect, it } from 'vitest';
import { summariseJson } from './text';

describe('summariseJson', () => {
  it('把对象压成单行 JSON', () => {
    expect(summariseJson({ reason: '违规', count: 2 })).toBe('{"reason":"违规","count":2}');
  });

  it('超过长度上限时截断并加省略号', () => {
    const value = { text: 'a'.repeat(100) };
    const result = summariseJson(value);
    expect(result).toHaveLength(61);
    expect(result.endsWith('…')).toBe(true);
    expect(result.startsWith('{"text":"aaa')).toBe(true);
  });

  it('恰好等于上限时不截断', () => {
    // 用短上限便于构造边界：'{"a":"bb"}' 共 10 个字符
    expect(summariseJson({ a: 'bb' }, 10)).toBe('{"a":"bb"}');
    expect(summariseJson({ a: 'bb' }, 9)).toBe('{"a":"bb"…');
  });

  it.each([null, undefined, {}, ''])('空值 %s 显示为 -', value => {
    expect(summariseJson(value)).toBe('-');
  });

  it('数组按 JSON 序列化，不因是数组就当作空值', () => {
    expect(summariseJson(['a', 'b'])).toBe('["a","b"]');
  });

  it('空数组按空值处理', () => {
    expect(summariseJson([])).toBe('-');
  });

  it('false 与 0 这类合法假值保留为 JSON', () => {
    expect(summariseJson(false)).toBe('false');
    expect(summariseJson(0)).toBe('0');
  });

  it('函数等无法序列化的值回退为 -', () => {
    expect(summariseJson(() => undefined)).toBe('-');
  });
});
