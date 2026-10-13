import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthCard, AuthFooterLink, FormAlert } from '@/components/auth/AuthCard';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import SEOHead from '@/components/common/SEOHead';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/http';
import { zh } from '@/locales/zh';

const schema = z.object({
  account: z.string().trim().min(1, { message: '请输入邮箱或手机号' }),
  password: z.string().min(1, { message: '请输入密码' }),
});

type LoginForm = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // 守卫在重定向时把原路径放在 state.redirect，登录成功后回跳
  const redirect = (location.state as { redirect?: string } | null)?.redirect || '/';

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { account: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      await login(values);
      navigate(redirect, { replace: true });
    } catch (err) {
      // 后端对「账号不存在」与「密码错误」返回同一文案，这里直接透出
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后重试');
    }
  };

  return (
    <>
      <SEOHead title={zh.auth.loginTitle} description="登录 TileLang for RISC-V 社区，管理个人资料、下载开发资源。" />
      <AuthSplitLayout
        panelTitle={zh.authPanel.login.title}
        panelSubtitle={zh.authPanel.login.subtitle}
        panelBullets={zh.authPanel.login.bullets}
      >
        <AuthCard
          title={zh.auth.loginTitle}
          subtitle={`${zh.site.name} · ${zh.site.slogan}`}
          footer={
            <span className="text-muted-foreground">
              {zh.auth.noAccount} <AuthFooterLink to="/register">{zh.auth.goRegister}</AuthFooterLink>
            </span>
          }
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormAlert message={error} />

              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{zh.auth.account}</FormLabel>
                    <FormControl>
                      <Input placeholder={zh.auth.accountPlaceholder} autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{zh.auth.password}</FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        {zh.auth.forgot}
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '登录中...' : zh.auth.login}
              </Button>
            </form>
          </Form>
        </AuthCard>
      </AuthSplitLayout>
    </>
  );
}
