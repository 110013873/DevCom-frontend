import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import type { IDomEditor, IEditorConfig } from '@wangeditor/editor';

/**
 * 回归测试：编辑页「正文消失」。
 *
 * 真实故障（2026-10-14 定位）：编辑页把详情灌进编辑器时，WangEditor 挂载后
 * **自己**会触发一次 `onChange` 并吐出空内容 `<p><br></p>`。这条空内容经
 * `onChange` 回调把父组件 state 里刚灌进去的正文覆盖掉，此后 `value` 与
 * `editor.getHtml()` 都是空、防抖比对判定"一致"，正文就再也不会被重灌 ——
 * 表现为「保存后重新打开编辑页，正文不见了」，而数据库里正文一直都在。
 *
 * 真机复现过：不加处理时 6 轮进入编辑页有 3 轮丢正文（时序竞态）。
 *
 * 这里不挂真实 WangEditor —— 它依赖 contenteditable / Selection / Range，
 * jsdom 撑不起来。改为用一个**忠实模拟那次空 onChange** 的假编辑器，专门
 * 锁住「编辑器主动上报的内容不得覆盖外部 value」这条约定。
 */

/** 记录假编辑器拿到的 config，测试里要手动触发它的回调 */
let capturedConfig: Partial<IEditorConfig> = {};
let fakeEditor: IDomEditor;

vi.mock('@wangeditor/editor-for-react', () => ({
  Toolbar: () => null,
  /**
   * 忠实模拟真实包装组件：它在 effect 里创建编辑器，然后通知 onCreated
   * 并立刻甩出一次空的 onChange。放在 effect 里而不是渲染期 —— 真实组件
   * 就是这样，在渲染期调用会触发 React 的 setState-in-render 警告。
   */
  Editor: ({ onCreated, defaultConfig }: { onCreated?: (e: IDomEditor) => void; defaultConfig: Partial<IEditorConfig> }) => {
    capturedConfig = defaultConfig;
    useEffect(() => {
      if (!onCreated) {
        return;
      }
      onCreated(fakeEditor);
      defaultConfig.onChange?.(fakeEditor);
      // 只跑一次：模拟真实包装组件「挂载时创建编辑器」的行为。
      // 依赖数组留空是有意的，加上依赖会让这段在每次渲染后重跑。
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  },
}));

vi.mock('@/api/upload', () => ({ uploadFile: vi.fn() }));

const mockEditorModule = await import('./RichTextEditor');
const RichTextEditor = mockEditorModule.default;

beforeEach(() => {
  capturedConfig = {};
  fakeEditor = {
    getHtml: () => '<p><br></p>',
    setHtml: vi.fn(),
    destroy: vi.fn(),
  } as unknown as IDomEditor;
});

describe('RichTextEditor 正文回填竞态', () => {
  it('编辑器挂载后主动上报的空内容不得覆盖外部 value', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>数据库里的正文</p>" onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('用户聚焦后开始输入，内容才上报给父组件', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>数据库里的正文</p>" onChange={onChange} />);

    // 用户点进编辑区 —— 这是"该开始听编辑器了"的信号
    act(() => {
      capturedConfig.onFocus?.(fakeEditor);
    });

    fakeEditor.getHtml = () => '<p>用户敲的字</p>';
    act(() => {
      capturedConfig.onChange?.(fakeEditor);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p>用户敲的字</p>');
  });

  it('用户把正文清空后失焦，空内容也要上报（否则清空会被吞掉）', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>数据库里的正文</p>" onChange={onChange} />);

    act(() => {
      capturedConfig.onFocus?.(fakeEditor);
    });
    fakeEditor.getHtml = () => '<p><br></p>';
    act(() => {
      capturedConfig.onBlur?.(fakeEditor);
    });

    expect(onChange).toHaveBeenCalledWith('<p><br></p>');
  });

  it('详情到达后回填：value 变化且用户尚未输入时写入编辑器', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RichTextEditor value="" onChange={onChange} />);

    rerender(<RichTextEditor value="<p>迟到的正文</p>" onChange={onChange} />);

    expect(fakeEditor.setHtml).toHaveBeenCalledWith('<p>迟到的正文</p>');
  });
});
