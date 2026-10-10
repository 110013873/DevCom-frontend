import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormAlert } from '@/components/auth/AuthCard';
import { useAuth } from '@/contexts/AuthContext';
import { uploadApi, userApi } from '@/api/auth';
import { ApiError } from '@/lib/http';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const schema = z.object({
  displayName: z.string().trim().min(2, { message: '昵称至少 2 个字' }).max(20, { message: '昵称最多 20 个字' }),
  bio: z.string().trim().max(500, { message: '简介最多 500 字' }).optional(),
});

type ProfileForm = z.infer<typeof schema>;

/** 个人资料。头像走通用上传接口（purpose=avatar），拿到 URL 后再随资料一起保存。 */
export default function Profile() {
  const { user, patchUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', bio: '' },
  });

  // 登录态恢复完成后回填表单（AuthContext 挂载时 user 可能还是 null）
  useEffect(() => {
    if (user) {
      form.reset({ displayName: user.displayName, bio: user.bio ?? '' });
    }
  }, [form, user]);

  const onSubmit = async (values: ProfileForm) => {
    setError(null);
    setNotice(null);
    try {
      const saved = await userApi.updateMe({ displayName: values.displayName.trim(), bio: values.bio?.trim() ?? '' });
      patchUser(saved);
      setNotice('资料已更新');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 先清空 value，否则连续选同一个文件不会再触发 change
    event.target.value = '';
    if (!file) {
      return;
    }
    setError(null);
    setNotice(null);

    if (!file.type.startsWith('image/')) {
      setError('头像仅支持图片格式');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('头像大小不能超过 2MB');
      return;
    }

    setUploading(true);
    try {
      const [result] = await uploadApi.upload([file], 'avatar');
      const saved = await userApi.updateMe({ avatar: result.url });
      patchUser(saved);
      setNotice('头像已更新');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '头像上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  const initials = user?.displayName?.slice(0, 1) ?? '';

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-10 md:px-6 md:py-12">
      <section className="rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
        <h2 className="text-base font-semibold text-foreground">头像</h2>
        <div className="mt-5 flex items-center gap-5">
          <Avatar className="h-16 w-16">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.displayName} />}
            <AvatarFallback className="bg-primary/10 text-lg text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? '上传中...' : '更换头像'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">支持 JPG / PNG，不超过 2MB</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
        <h2 className="text-base font-semibold text-foreground">基本资料</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-5">
            <FormAlert message={error} />
            {notice && !error && (
              <div
                role="status"
                className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary"
              >
                {notice}
              </div>
            )}

            {/* 账号只读展示：这里不用 FormItem，它依赖 FormFieldContext */}
            <div className="space-y-2">
              <label className="text-sm font-medium">账号</label>
              <Input value={user?.email ?? user?.phone ?? ''} disabled readOnly />
              <p className="text-xs text-muted-foreground">账号暂不支持修改</p>
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>昵称</FormLabel>
                  <FormControl>
                    <Input placeholder="2-20 字" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>个人简介</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="介绍一下你的技术方向与关注领域（最多 500 字）" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '保存中...' : '保存资料'}
            </Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
