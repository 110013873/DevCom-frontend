import http from '@/lib/http';

/**
 * 通用附件上传。
 *
 * 后端是 multer 的 `@UploadedFiles('files')`，因此字段名必须是 `files`，
 * 且**可以一次传多个**（返回数组）。`purpose` 决定服务端允许的扩展名分组
 * 与落库用途，传错会被 400 拒绝。
 *
 * 这里不走 `http` 封装的 JSON 路径 —— multipart 需要让浏览器自己设置
 * `Content-Type` 边界，手写 header 反而会把 boundary 弄丢。
 */

/** 用途，与后端 `PURPOSE_ALLOWED` 的键一一对应 */
export type UploadPurpose = 'image' | 'avatar' | 'cover' | 'video' | 'audio' | 'document' | 'resource';

export interface UploadedAttachment {
  id: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

/**
 * 上传附件。
 *
 * `onProgress` 仅对单个文件有意义（百分比）；批量上传时回调会被多次调用，
 * 调用方若要展示总进度需自行按文件聚合。
 */
export function uploadFile(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (percent: number) => void
): Promise<UploadedAttachment> {
  const form = new FormData();
  form.append('files', file);

  return http.post<UploadedAttachment[]>('/v1/upload', form, {
    params: { purpose },
    onUploadProgress: onProgress
      ? event => {
          if (event.total) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        }
      : undefined,
  }).then(results => {
    const first = results[0];
    if (!first) {
      throw new Error('上传成功但未返回附件信息');
    }
    return first;
  });
}
