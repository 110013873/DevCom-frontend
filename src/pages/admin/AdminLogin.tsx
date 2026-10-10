import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Typography } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import AdminThemeProvider from '@/components/layout/AdminThemeProvider';
import SEOHead from '@/components/common/SEOHead';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/http';
import { isAdmin as isAdminRole } from '@/types/user';
import { zh } from '@/locales/zh';

const { Title, Text } = Typography;

interface AdminLoginForm {
  account: string;
  password: string;
}

/**
 * 后台登录页。单独一张入口卡片，不复用前台登录页 ——
 * 前台登录成功会写会话并跳回内容页，而后台需要额外校验管理角色，
 * 两者的失败分支（无权限 vs 密码错误）不同，混在一起会让提示含糊。
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirect = (location.state as { redirect?: string } | null)?.redirect || '/admin/dashboard';

  const onFinish = async (values: AdminLoginForm) => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(values);
      // 角色判定以前端已知的角色为准；接口侧另有独立校验，此处只是提前给出可读提示
      if (!isAdminRole(user)) {
        setError('该账号没有后台访问权限');
        return;
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminThemeProvider>
      <SEOHead title="管理后台登录" description="社区管理后台登录入口。" />
      <div className="flex min-h-screen items-center justify-center bg-surface-elevated px-4 py-12">
        <Card className="w-full max-w-[400px]" styles={{ body: { padding: 32 } }}>
          <div className="mb-6">
            <Title level={4} style={{ marginBottom: 4 }}>
              社区管理后台
            </Title>
            <Text type="secondary">{zh.site.name}</Text>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Form<AdminLoginForm> layout="vertical" onFinish={onFinish} requiredMark={false} disabled={submitting}>
            <Form.Item
              name="account"
              label="账号"
              rules={[{ required: true, message: '请输入邮箱或手机号' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="邮箱或手机号" autoComplete="username" size="large" />
            </Form.Item>

            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="border-t border-border/60 pt-4 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeftOutlined className="h-3.5 w-3.5" />
              返回社区前台
            </Link>
          </div>
        </Card>
      </div>
    </AdminThemeProvider>
  );
}
