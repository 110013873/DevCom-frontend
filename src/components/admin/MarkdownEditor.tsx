import { useRef, useState } from 'react';
import { Button, Input, Modal, Radio, Space, Upload, type UploadProps } from 'antd';
import { FileOutlined, LoadingOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Markdown } from '@/components/markdown';
import { uploadFile, type UploadPurpose } from '@/api/upload';

/**
 * 课时正文编辑（内容统一为 Markdown 文档）：左侧 Markdown 源码 textarea +
 * 右侧实时预览 + 插入图片/视频/文档。
 *
 * 复用 `@/components/markdown/Markdown` 做预览，保证后台所见与前台
 * `LessonPlayer` 的渲染**完全同源**（同一套 react-markdown + 插件组合），
 * 不存在「编辑预览跟实际展示不一致」的漂移。
 *
 * 三类媒体的内嵌语法（contracts/lesson-media-markdown.md）：
 * - 图片：`![alt](url)`（本地上传用原始文件名作 alt；网络图片留空）
 * - 视频：`![video](url)`
 * - 文档：`[文件名](url)`
 * 本地上传复用 `uploadFile(file, purpose)`；网络来源直接以 URL 插入，不转存。
 *
 * 刻意不引入第三方 Markdown 编辑器（如 @uiw/react-md-editor）：零新依赖，
 * 编辑即源码，保存的 `content` 直接进 `Lesson.content`。
 */
interface MarkdownEditorProps {
  value?: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

type InsertKind = 'image' | 'video' | 'document';
type InsertSource = 'upload' | 'url';

/** 各类媒体在弹窗里的展示配置：标题、用途、上传 accept、插入语法构造 */
const KIND_CONFIG: Record<
  InsertKind,
  {
    label: string;
    purpose: UploadPurpose;
    accept?: string;
    hint: string;
    /** 本地/外链统一按 kind 构造插入文本 */
    build: (name: string, url: string) => string;
  }
> = {
  image: {
    label: '图片',
    purpose: 'image',
    accept: 'image/*',
    hint: '支持 .jpg / .png / .gif / .webp / .svg / .avif，单文件 ≤ 500MB',
    build: (name, url) => `![${name}](${url})`,
  },
  video: {
    label: '视频',
    purpose: 'video',
    accept: '.mp4,.webm,.mov,video/*',
    hint: '支持 .mp4 / .webm / .mov，单文件 ≤ 500MB',
    build: (name, url) => `![video](${url})`,
  },
  document: {
    label: '文档',
    purpose: 'document',
    hint: '支持 .pdf / .doc / .docx / .xls / .xlsx / .ppt / .pptx / .txt / .md，单文件 ≤ 500MB',
    build: (name, url) => `[${name || '文档'}](${url})`,
  },
};

export default function MarkdownEditor({ value = '', onChange, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<InsertKind>('image');
  const [source, setSource] = useState<InsertSource>('upload');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  /**
   * 在 textarea 当前光标/选区处插入文本。
   * 先记录 selectionStart/End，插入后恢复焦点并把光标移到插入内容之后。
   */
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    // 下一次渲染后恢复光标到插入内容末尾
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = start + text.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const openInsert = (nextKind: InsertKind) => {
    setKind(nextKind);
    setSource('upload');
    setUrl('');
    setUrlError(null);
    setUploadError(null);
    setModalOpen(true);
  };

  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    setUploadError(null);
    setProgress(0);
    try {
      const config = KIND_CONFIG[kind];
      const uploaded = await uploadFile(file as File, config.purpose, setProgress);
      insertAtCursor(config.build(uploaded.originalName, uploaded.url));
      onSuccess?.(uploaded);
      setModalOpen(false);
    } catch (err) {
      // AntD 会吞掉 customRequest 的 rejection，错误留在组件内展示
      const text = err instanceof Error ? err.message : '上传失败';
      setUploadError(text);
      onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  const insertNetworkUrl = () => {
    const trimmed = url.trim();
    setUrlError(null);
    if (!trimmed) {
      setUrlError('请输入地址');
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setUrlError('请输入以 http(s):// 开头的合法地址');
      return;
    }
    insertAtCursor(KIND_CONFIG[kind].build('', trimmed));
    setUrl('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* 媒体插入工具栏：独立一行，跨源码/预览两列之上。
          放在 grid 容器外，按钮不受单列宽度约束，窄屏换行也不会与预览列重叠。 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="link" size="small" icon={<PictureOutlined />} onClick={() => openInsert('image')}>
          插入图片
        </Button>
        <Button type="link" size="small" icon={<VideoCameraOutlined />} onClick={() => openInsert('video')}>
          插入视频
        </Button>
        <Button type="link" size="small" icon={<FileOutlined />} onClick={() => openInsert('document')}>
          插入文档
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">Markdown 源码</div>
          <Input.TextArea
            ref={textareaRef}
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder ?? '输入 Markdown 正文…（支持标题、列表、代码块、公式、表格）'}
            autoSize={{ minRows: 8, maxRows: 22 }}
            className="font-mono"
          />
        </div>
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">实时预览</div>
          <div className="min-h-48 rounded-lg border border-border bg-background p-4">
            {value.trim() ? (
              <Markdown content={value} />
            ) : (
              <span className="text-sm text-muted-foreground">暂无内容，开始输入后此处显示预览</span>
            )}
          </div>
        </div>
      </div>

      {/* 插入媒体弹窗：图片/视频/文档，各含本地上传 / 网络地址 二选一 */}
      <Modal
        open={modalOpen}
        title={`插入${KIND_CONFIG[kind]?.label ?? ''}`}
        okText={source === 'upload' ? '完成' : '插入'}
        cancelText="取消"
        okButtonProps={{ disabled: source === 'upload' ? true : !url.trim() }}
        onOk={() => {
          if (source === 'url') {
            insertNetworkUrl();
          } else {
            setModalOpen(false);
          }
        }}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        {kind && (
          <div className="space-y-3">
            <Radio.Group
              value={source}
              onChange={event => {
                setSource(event.target.value as InsertSource);
                setUrlError(null);
                setUploadError(null);
              }}
              options={[
                { value: 'upload', label: '本地上传' },
                { value: 'url', label: '网络地址' },
              ]}
              optionType="button"
            />

            {source === 'upload' ? (
              <Space direction="vertical" className="w-full">
                <Upload
                  accept={KIND_CONFIG[kind].accept}
                  showUploadList={false}
                  disabled={uploading}
                  customRequest={customRequest}
                >
                  <Button icon={uploading ? <LoadingOutlined /> : <PictureOutlined />} loading={uploading} disabled={uploading}>
                    {uploading ? `上传中… ${progress}%` : '选择文件上传'}
                  </Button>
                </Upload>
                {uploadError && <div className="text-xs text-destructive">{uploadError}</div>}
                <div className="text-xs text-muted-foreground">{KIND_CONFIG[kind].hint}</div>
              </Space>
            ) : (
              <div className="space-y-2">
                <Input
                  value={url}
                  onChange={event => {
                    setUrl(event.target.value);
                    setUrlError(null);
                  }}
                  placeholder="https://... 直链"
                  allowClear
                  onPressEnter={() => insertNetworkUrl()}
                />
                {urlError && <div className="text-xs text-destructive">{urlError}</div>}
                <div className="text-xs text-muted-foreground">直接引用网络地址，平台不转存</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
