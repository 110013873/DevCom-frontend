import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthCard, AuthFooterLink, FormAlert } from '@/components/auth/AuthCard';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import SEOHead from '@/components/common/SEOHead';
import { authApi } from '@/api/auth';
import { useVerificationCode } from '@/hooks/useVerificationCode';
import { ApiError } from '@/lib/http';
import { zh } from '@/locales/zh';

const PASSWORD_MIN = 8;

const schema = z
  .object({
    channel: z.enum(['email', 'sms']),
    // 短信服务接入后恢复提示：请输入注册时使用的邮箱或手机号。
    identifier: z.string().trim().min(1, { message: '请输入注册时使用的邮箱' }),
    code: z.string().trim().length(6, { message: '验证码为 6 位数字' }),
    password: z.string().min(PASSWORD_MIN, { message: `密码长度不能少于 ${PASSWORD_MIN} 位` }),
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  });

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'email', identifier: '', code: '', password: '', confirmPassword: '' },
  });

  const channel = form.watch('channel');

  const { send, sending, countdown, disabled } = useVerificationCode({
    getIdentifier: () => form.getValues('identifier') ?? '',
    channel,
    purpose: 'reset',
    onError: message => {
      setNotice(null);
      setError(message);
    },
    onSent: message => {
      setError(null);
      setNotice(message);
    },
  });

  const onSubmit = async (values: ForgotForm) => {
    setError(null);
    setNotice(null);
    try {
      await authApi.resetPassword({
        identifier: values.identifier.trim(),
        code: values.code.trim(),
        password: values.password,
      });
      // 重置成功后不自动登录：沿用前端的统一登录入口，避免两处生成会话
      navigate('/login', { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重置失败，请稍后重试');
    }
  };

  return (
    <>
      <SEOHead title={zh.auth.forgotTitle} description="通过邮箱验证码重置 TileLang for RISC-V 社区账号密码。" />
      <AuthSplitLayout
        panelTitle={zh.authPanel.forgot.title}
        panelSubtitle={zh.authPanel.forgot.subtitle}
        panelBullets={zh.authPanel.forgot.bullets}
      >
        <AuthCard
          title={zh.auth.forgotTitle}
          subtitle="验证注册邮箱后即可设置新密码"
          footer={
            <span className="text-muted-foreground">
              {zh.auth.hasAccount} <AuthFooterLink to="/login">{zh.auth.goLogin}</AuthFooterLink>
            </span>
          }
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 h-7 px-2 text-muted-foreground"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {zh.auth.goLogin}
          </Button>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormAlert message={error} />
              {notice && !error && (
                <div
                  role="status"
                  className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary"
                >
                  {notice}
                </div>
              )}

              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value);
                          setError(null);
                          setNotice(null);
                        }}
                      >
                        <TabsList className="grid w-full grid-cols-1">
                          <TabsTrigger value="email">{zh.auth.byChannelEmail}</TabsTrigger>
                          {/* 短信服务尚未接入，暂时隐藏手机号入口；接入后取消注释并恢复 grid-cols-2。
                          <TabsTrigger value="sms">{zh.auth.byChannelPhone}</TabsTrigger>
                          */}
                        </TabsList>
                      </Tabs>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{channel === 'email' ? zh.auth.email : zh.auth.phone}</FormLabel>
                    <FormControl>
                      <Input
                        type={channel === 'email' ? 'email' : 'text'}
                        inputMode={channel === 'sms' ? 'numeric' : undefined}
                        placeholder={zh.auth.accountPlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{zh.auth.code}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input inputMode="numeric" maxLength={6} autoComplete="one-time-code" {...field} />
                      </FormControl>
                      <Button type="button" variant="outline" className="shrink-0" disabled={disabled} onClick={send}>
                        {sending ? '发送中...' : countdown > 0 ? zh.auth.resendIn(countdown) : zh.auth.sendCode}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新密码</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" placeholder={`至少 ${PASSWORD_MIN} 位`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{zh.auth.confirmPassword}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '提交中...' : zh.auth.resetSubmit}
              </Button>
            </form>
          </Form>
        </AuthCard>
      </AuthSplitLayout>
    </>
  );
}
