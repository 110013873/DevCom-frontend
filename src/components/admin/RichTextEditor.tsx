import { useEffect, useRef, useState } from 'react';
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
  // Keep link/image dialogs outside the editor's scrolling and clipping containers.
  modalAppendToBody: true,
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

  /**
   * 编辑器挂载后会**自己**触发一次 `onChange` 并吐出空内容（`<p><br></p>`）。
   *
   * 这条空内容会经 `onChange` 回调把父组件里刚灌进来的正文覆盖掉 —— 编辑页
   * 「详情先到、编辑器后挂载」时，正文就这样消失，而且此后 `value` 与
   * `editor.getHtml()` 都是空，防抖比对判定一致，再也不会重灌。
   *
   * 因此在用户**真正点到编辑区**之前，忽略编辑器主动上报的内容。用 `onFocus`
   * 当开门信号：`setHtml` 是程序调用，不会触发 focus，所以回填过程不会被误判
   * 成用户输入。WangEditor 没有「这次变更来自用户还是程序」的标记位，只能这样区分。
   */
  const userEditingRef = useRef(false);

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder ?? '在这里输入正文内容…',
    onFocus() {
      userEditingRef.current = true;
    },
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
      if (!userEditingRef.current) {
        return;
      }
      onChange(ed.getHtml());
    },
    /**
     * 失焦时补报一次。用户可能「选中全文删掉」后立刻点保存 —— 那一下没有
     * 击键，若只在 onChange 里放行，这次清空会被漏掉。
     */
    onBlur(ed: IDomEditor) {
      if (userEditingRef.current) {
        onChange(ed.getHtml());
      }
    },
  };

  /**
   * 外部 `value` 变化时回灌编辑器。
   *
   * `value !== editor.getHtml()` 这个判断不能省：编辑器每次输入都会触发
   * `onChange` → 父组件 setState → `value` 变化 → 这个 effect，若不做比对
   * 就会 `setHtml` 一次，光标被顶到开头，用户打字时光标乱跳。
   *
   * 但用户**开始输入之后**就不能再回灌了：此时 `value` 是上一轮的快照，回灌
   * 会把光标拉回开头。用户输入期间两边本就同步，这个 effect 空转即可。
   */
  useEffect(() => {
    if (!editor || userEditingRef.current) {
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
        body > .w-e-modal {
          position: fixed;
          top: 50%;
          margin: 0 auto;
          transform: translateY(-50%);
          max-width: calc(100vw - 32px);
          max-height: calc(100dvh - 32px);
          overflow-y: auto;
          z-index: 1100;
        }
        .w-e-toolbar { flex-wrap: wrap !important; }
        .w-e-text-container [data-slate-editor] p { line-height: 1.8; }
      `}</style>
    </div>
  );
}
