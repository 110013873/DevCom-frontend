import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthCard, AuthFooterLink, FormAlert } from '@/components/auth/AuthCard';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import SEOHead from '@/components/common/SEOHead';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationCode } from '@/hooks/useVerificationCode';
import { ApiError } from '@/lib/http';
import { zh } from '@/locales/zh';

const PASSWORD_MIN = 8;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;

/** 两种注册通道的字段数量与校验规则不同，用同一 schema 表达以便切换通道时保留已填内容 */
const schema = z
  .object({
    channel: z.enum(['email', 'sms']),
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    code: z.string().trim().length(6, { message: '验证码为 6 位数字' }),
    password: z.string().min(PASSWORD_MIN, { message: `密码长度不能少于 ${PASSWORD_MIN} 位` }),
    confirmPassword: z.string(),
    displayName: z.string().trim().optional(),
    agreed: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.channel === 'email') {
      if (!values.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: '请输入邮箱' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: '邮箱格式不正确' });
      }
    } else if (!values.phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: '请输入手机号' });
    } else if (!PHONE_PATTERN.test(values.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: '手机号格式不正确' });
    }

    if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: '两次输入的密码不一致' });
    }
    if (values.displayName && (values.displayName.length < 2 || values.displayName.length > 20)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['displayName'], message: '昵称长度需在 2-20 字之间' });
    }
    if (!values.agreed) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['agreed'], message: zh.auth.agreeRequired });
    }
  });

type RegisterForm = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      channel: 'email',
      email: '',
      phone: '',
      code: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      agreed: false,
    },
  });

  const channel = form.watch('channel');

  const { send, sending, countdown, disabled } = useVerificationCode({
    getIdentifier: () => (channel === 'email' ? form.getValues('email') ?? '' : form.getValues('phone') ?? ''),
    channel,
    purpose: 'register',
    onError: message => {
      setNotice(null);
      setError(message);
    },
    onSent: message => {
      setError(null);
      setNotice(message);
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    setError(null);
    setNotice(null);
    try {
      // 只提交当前通道对应的 identifier —— 后端拒绝同时传邮箱与手机号
      await register({
        email: values.channel === 'email' ? values.email?.trim() : undefined,
        phone: values.channel === 'sms' ? values.phone?.trim() : undefined,
        code: values.code.trim(),
        password: values.password,
        displayName: values.displayName?.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败，请稍后重试');
    }
  };

  const sendLabel = useMemo(() => {
    if (sending) {
      return '发送中...';
    }
    if (countdown > 0) {
      return zh.auth.resendIn(countdown);
    }
    return zh.auth.sendCode;
  }, [countdown, sending]);

  return (
    <>
      <SEOHead title={zh.auth.registerTitle} description="注册 TileLang for RISC-V 社区账号，获取技术资讯、开发资源与课程。" />
      <AuthSplitLayout
        panelTitle={zh.authPanel.register.title}
        panelSubtitle={zh.authPanel.register.subtitle}
        panelBullets={zh.authPanel.register.bullets}
      >
        <AuthCard
          title={zh.auth.registerTitle}
          subtitle={`${zh.site.name} · ${zh.site.slogan}`}
          className="p-5 md:p-6"
          footer={
            <span className="text-muted-foreground">
              {zh.auth.hasAccount} <AuthFooterLink to="/login">{zh.auth.goLogin}</AuthFooterLink>
            </span>
          }
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          // 切通道时清掉上一次的送达提示与倒计时相关错误
                          setError(null);
                          setNotice(null);
                        }}
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="email">{zh.auth.byChannelEmail}</TabsTrigger>
                          <TabsTrigger value="sms">{zh.auth.byChannelPhone}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                  </FormItem>
                )}
              />

              {channel === 'email' ? (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{zh.auth.email}</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{zh.auth.phone}</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" autoComplete="tel" placeholder="11 位手机号" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                        {sendLabel}
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
                    <FormLabel>{zh.auth.password}</FormLabel>
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

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {zh.auth.displayName}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">（选填）</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="2-20 字，未填将自动生成" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Controller
                control={form.control}
                name="agreed"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="agreed"
                        checked={field.value}
                        onCheckedChange={value => field.onChange(value === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="agreed" className="text-sm leading-relaxed text-muted-foreground">
                        {zh.auth.agreePrefix}{' '}
                        <Link to="/user-agreement" target="_blank" className="text-primary hover:underline">
                          {zh.auth.userAgreement}
                        </Link>{' '}
                        {zh.auth.and}{' '}
                        <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline">
                          {zh.auth.privacyPolicy}
                        </Link>
                      </label>
                    </div>
                    {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '注册中...' : zh.auth.register}
              </Button>
            </form>
          </Form>
        </AuthCard>
      </AuthSplitLayout>
    </>
  );
}
