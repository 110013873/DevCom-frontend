import { useState } from 'react';
import { Button, Upload, type UploadProps } from 'antd';
import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { uploadFile } from '@/api/upload';

/**
 * 单图上传，值就是一个 URL 字符串 —— 与后端的 `coverImage` / `avatar` 字段同形。
 *
 * 刻意不用 AntD `<Upload>` 自带的文件列表管理：那几个字段是给多文件上传用的，
 * 而这里的业务语义是「一个字段一个地址」，让 Upload 维护列表只会多出一层
 * 需要同步的状态。此处只借用它的选文件与 `customRequest` 能力，展示自己画。
 */
interface ImageUploadFieldProps {
  value?: string | null;
  onChange?: (url: string | undefined) => void;
  /** 落库用途，决定服务端允许的扩展名分组 */
  purpose?: 'image' | 'cover' | 'avatar';
  /** 预览框尺寸，默认 120×120 */
  size?: number;
  disabled?: boolean;
}

export default function ImageUploadField({
  value,
  onChange,
  purpose = 'image',
  size = 120,
  disabled,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file as File, purpose);
      onChange?.(uploaded.url);
      onSuccess?.(uploaded);
    } catch (err) {
      // 上传失败时把消息留在组件内，父级表单拿不到异常（AntD 会吞掉 customRequest 的 rejection）
      const text = err instanceof Error ? err.message : '上传失败';
      setError(text);
      onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {value ? (
          <div
            className="overflow-hidden rounded-lg border border-border bg-muted"
            style={{ width: size, height: size }}
          >
            <img src={value} alt="已上传图片" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted text-2xl text-muted-foreground"
            style={{ width: size, height: size }}
          >
            {uploading ? <LoadingOutlined /> : <PlusOutlined />}
          </div>
        )}

        <div className="space-y-2">
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={customRequest}
            disabled={disabled || uploading}
          >
            <Button loading={uploading} disabled={disabled}>
              {value ? '替换图片' : '选择图片'}
            </Button>
          </Upload>
          {value && (
            <div>
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                disabled={disabled}
                onClick={() => onChange?.(undefined)}
              >
                移除
              </Button>
            </div>
          )}
        </div>
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}
