import { useMemo } from 'react';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ReactNode } from 'react';

/**
 * 把前台 CSS 变量里的设计令牌喂给 Ant Design，
 * 使「前台品牌色」与「后台组件色」只有一处定义（`src/styles/index.css`）。
 *
 * 变量是 HSL 三元组（`226 100% 64%`），Tailwind 用 `hsl(var(--x))` 消费，
 * 而 AntD 需要具体的颜色字符串，所以在运行时读取计算样式再转换一次。
 */

/** 读 `:root` 上的 HSL 三元组，返回 AntD 可用的颜色字符串 */
function readHslToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) {
    return fallback;
  }
  // `226 100% 64%` → `hsl(226 100% 64%)`，现代浏览器均支持该写法
  return `hsl(${raw.replace(/\s+/g, ' ')})`;
}

/** 圆角：前台 `--radius` 为 1.25rem，后台表格用满圆角会显得松散，固定收敛为 8px */
const ADMIN_RADIUS = 8;

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => {
    const primary = readHslToken('--primary', '#3b6ef5');
    const error = readHslToken('--destructive', '#ef4444');

    return {
      locale: zhCN,
      algorithm: antdTheme.defaultAlgorithm,
      theme: {
        token: {
          colorPrimary: primary,
          colorError: error,
          borderRadius: ADMIN_RADIUS,
          fontFamily: '"Alibaba PuHuiTi 2.0", "Noto Sans SC", system-ui, sans-serif',
        },
        components: {
          Layout: {
            // 后台侧栏沿用前台的深色 token，与 portal 后台观感一致
            siderBg: readHslToken('--sidebar-background', '#1a1a1c'),
            headerBg: '#ffffff',
          },
          Table: {
            headerBg: readHslToken('--surface-elevated', '#f4f5f7'),
          },
        },
      },
    };
  }, []);

  return (
    <ConfigProvider {...config}>
      {/* AntD 5 的 message/notification 需要 App 包一层才能消费上面的主题 */}
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

export default AdminThemeProvider;
