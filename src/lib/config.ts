/**
 * 站点配置的取值兜底。
 *
 * `SystemConfig.value` 在数据库里是 jsonb，接口只能把它标成 `unknown`：
 * 运营可能在后台改过结构，或者历史记录缺字段。直接铺进表单会让 antd
 * 在渲染期报错，所以取值时逐个字段校验。
 */

/**
 * 以 `fallback` 为白名单和默认值，从 `value` 里挑出类型一致的字段。
 *
 * 只复制 `fallback` 中出现的键 —— 多余字段一律丢弃，避免脏数据反复写回数据库。
 * 类型不一致时保留默认值：`false` / `0` 这类合法假值仍会被采纳，
 * 只有 `undefined` 与 `null` 视为缺失。
 */
export function pickConfig<T extends object>(value: unknown, fallback: T): T {
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const source = value as Record<string, unknown>;
  const result = { ...fallback } as Record<string, unknown>;
  for (const key of Object.keys(fallback)) {
    const next = source[key];
    if (next === undefined || next === null) {
      continue;
    }
    // 数组与对象的 typeof 都是 'object'，不细分也能挡住"字符串塞进列表"这类错配
    if (typeof next !== typeof (fallback as Record<string, unknown>)[key]) {
      continue;
    }
    result[key] = next;
  }
  return result as T;
}
