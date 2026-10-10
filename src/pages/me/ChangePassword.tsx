import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormAlert } from '@/components/auth/AuthCard';
import { userApi } from '@/api/auth';
import { ApiError } from '@/lib/http';

const PASSWORD_MIN = 8;

const schema = z
  .object({
    oldPassword: z.string().min(1, { message: '请输入原密码' }),
    password: z.string().min(PASSWORD_MIN, { message: `新密码长度不能少于 ${PASSWORD_MIN} 位` }),
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  })
  .refine(values => values.password !== values.oldPassword, {
    path: ['password'],
    message: '新密码不能与原密码相同',
  });

type PasswordForm = z.infer<typeof schema>;

/**
 * 修改密码。改密成功后**不登出** —— 后端签发的是无状态 JWT，
 * 旧令牌在过期前依然有效，这里只提示结果并引导返回个人中心。
 */
export default function ChangePassword() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: PasswordForm) => {
    setError(null);
    setNotice(null);
    try {
      await userApi.changePassword({ oldPassword: values.oldPassword, password: values.password });
      form.reset();
      setNotice('密码已修改');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '修改失败，请稍后重试');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-10 md:px-6 md:py-12">
      <div className="rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
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
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>原密码</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
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
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={`至少 ${PASSWORD_MIN} 位`}
                      {...field}
                    />
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
                  <FormLabel>确认新密码</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '提交中...' : '确认修改'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
