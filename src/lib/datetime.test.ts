import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './datetime';

describe('formatDateTime', () => {
  it('把 ISO 时间串格式化成 24 小时制的中文时间', () => {
    // 用本地时区构造，避免断言结果随运行机器的时区漂移
    const local = new Date(2026, 2, 8, 14, 5, 30);
    expect(formatDateTime(local)).toBe('2026/3/8 14:05:30');
  });

  it('把 Date 对象与等价的时间串格式化成同一结果', () => {
    const local = new Date(2026, 0, 1, 9, 0, 0);
    expect(formatDateTime(local.toISOString())).toBe(formatDateTime(local));
  });

  it('接受时间戳数字', () => {
    const local = new Date(2026, 5, 1, 8, 30, 0);
    expect(formatDateTime(local.getTime())).toBe(formatDateTime(local));
  });

  it('下午时间不出现"下午"字样（强制 24 小时制）', () => {
    const local = new Date(2026, 2, 8, 15, 0, 0);
    const output = formatDateTime(local);
    expect(output).toContain('15:00');
    expect(output).not.toContain('下午');
  });

  it.each([null, undefined, ''])('空值 %s 显示为 -', value => {
    expect(formatDateTime(value)).toBe('-');
  });

  it('无法解析的时间串显示为 -，而不是 Invalid Date', () => {
    expect(formatDateTime('这不是时间')).toBe('-');
    expect(formatDateTime('2026-13-45T99:99:99Z')).toBe('-');
  });

  it('0 是合法时间戳，不应被当作空值', () => {
    expect(formatDateTime(0)).not.toBe('-');
  });
});

describe('formatDate', () => {
  it('只输出到日，不带时分秒', () => {
    const local = new Date(2026, 2, 8, 14, 5, 30);
    expect(formatDate(local)).toBe('2026/3/8');
  });

  it('一天内的任意时刻得到同一个结果（时分秒被丢掉）', () => {
    expect(formatDate(new Date(2026, 2, 8, 0, 0, 1))).toBe(formatDate(new Date(2026, 2, 8, 23, 59, 59)));
  });

  it.each([null, undefined, ''])('空值 %s 显示为 -', value => {
    expect(formatDate(value)).toBe('-');
  });

  it('无法解析的时间串显示为 -', () => {
    expect(formatDate('这不是时间')).toBe('-');
  });

  it('接受 ISO 时间串，与等价的 Date 对象结果一致', () => {
    const local = new Date(2026, 0, 1, 9, 0, 0);
    expect(formatDate(local.toISOString())).toBe(formatDate(local));
  });
});
