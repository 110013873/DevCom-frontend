import { useEffect, useState } from 'react';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { uploadFile } from '@/api/upload';
import '@wangeditor/editor/dist/css/style.css';

/**
 * 富文本编辑器（WangEditor）。
 *
 * 与官网后台的版本同源，只把上传这一处换成了本项目的 `uploadFile`：
 * 官网走的是 `uploadDocumentFile(file, ClipType.Image, ClipCategory.system)`，
 * 本项目的后端只有一个通用上传端点 `/v1/upload`，用途通过 `purpose` 查询参数表达。
 *
 * 正文以 HTML 存储（后端 `contentHtml` 字段）。编辑区里的图片/视频是**外链地址**，
 * 不是 base64 —— 上传成功后拿到 OSS 地址再插入，正文体积才不会失控。
 */
interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  /** 编辑区最小高度，默认 420px */
  minHeight?: number;
}

const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    'bold', 'italic', 'underline', 'through', 'color', 'bgColor',
    '|',
    'fontSize', 'fontFamily',
    '|',
    'bulletedList', 'numberedList', 'indent',
    '|',
    'justifyLeft', 'justifyCenter', 'justifyRight',
    '|',
    'insertLink', 'uploadImage', 'uploadVideo',
    '|',
    'blockquote', 'divider',
    '|',
    'undo', 'redo', 'fullScreen',
  ],
};

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 420 }: RichTextEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  // 视频体积大、耗时长，单独给进度遮罩；图片小，静默上传即可
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder ?? '在这里输入正文内容…',
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
          const uploaded = await uploadFile(file, 'image');
          insertFn(uploaded.url, uploaded.originalName, uploaded.url);
        },
      },
      uploadVideo: {
        async customUpload(file: File, insertFn: (url: string, poster: string) => void) {
          setVideoUploading(true);
          setVideoProgress(0);
          try {
            const uploaded = await uploadFile(file, 'video', setVideoProgress);
            insertFn(uploaded.url, '');
          } finally {
            setVideoUploading(false);
          }
        },
      },
    },
    onChange(ed: IDomEditor) {
      onChange(ed.getHtml());
    },
  };

  /**
   * 外部 `value` 变化时回灌编辑器。
   *
   * `value !== editor.getHtml()` 这个判断不能省：编辑器每次输入都会触发
   * `onChange` → 父组件 setState → `value` 变化 → 这个 effect，若不做比对
   * 就会 `setHtml` 一次，光标被顶到开头，用户打字时光标乱跳。
   */
  useEffect(() => {
    if (!editor) {
      return;
    }
    if (value !== editor.getHtml()) {
      editor.setHtml(value || '');
    }
  }, [value, editor]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-white">
      {videoUploading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <div className="text-sm font-medium text-foreground">
            {videoProgress < 100 ? `视频上传中… ${videoProgress}%` : '上传完成，正在处理…'}
          </div>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${videoProgress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">视频较大时上传需要一些时间，请勿关闭页面</div>
        </div>
      )}
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))', flexShrink: 0 }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={value}
        onCreated={setEditor}
        mode="default"
        style={{ flex: 1, overflowY: 'auto', minHeight }}
      />
      <style>{`
        .w-e-toolbar { flex-wrap: wrap !important; }
        .w-e-text-container [data-slate-editor] p { line-height: 1.8; }
      `}</style>
    </div>
  );
}
