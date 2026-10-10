import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import SEOHead from '@/components/common/SEOHead';
import TagManager, { type TagApi } from '@/components/admin/TagManager';
import { adminNewsTagApi, adminResourceTagApi } from '@/api/admin';
import type { TagType } from '@/types/content';

const { Title, Text } = Typography;

/**
 * 标签类别登记表 —— 本页**唯一的扩展点**。
 *
 * 新增一类标签（例如课程标签）时只做三件事：
 *   1. 在 `types/content.ts` 的 `TagType` 里加上该类型；
 *   2. 在 `api/admin.ts` 里生成对应的 `createTagApi('<segment>', '<type>')`；
 *   3. 在下表加一项。
 * Tabs、菜单、路由都不必再动 —— 类别是按这张表渲染出来的。
 */
interface TagCategory {
  /** Tab 的 key，同时用作 TagType，需与 `api` 指向的端点一致 */
  type: TagType;
  label: string;
  api: TagApi;
  description: string;
  namePlaceholder: string;
}

const CATEGORIES: TagCategory[] = [
  {
    type: 'news',
    label: '新闻标签',
    api: adminNewsTagApi,
    description: '用于给新闻打标与筛选。标签在新闻编辑器中按此词表选择。',
    namePlaceholder: '例如 芯片设计',
  },
  {
    type: 'resource',
    label: '资源标签',
    api: adminResourceTagApi,
    description: '用于给资源打标与筛选。资源标签与新闻标签互不共用。',
    namePlaceholder: '例如 操作系统',
  },
];

/**
 * 标签管理。路由 `/admin/tags`。
 *
 * 各类别是**两套独立词表**（后端 `Tag.type` 区分，互不影响），但交互完全一致，
 * 因此收在一个页面里用 Tab 切换，而不是在侧栏各占一项 —— 侧栏越短越好找，
 * 而「标签」这一件事本就不该按类别裂成多条导航。
 *
 * 默认选中第一个 Tab；`activeKey` 由本组件持有而不放进 URL，因为切换类别
 * 只是换个词表看，不构成需要分享或回退的页面状态。
 */
export default function AdminTags() {
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].type);

  return (
    <>
      <SEOHead title="标签管理" description="新闻标签与资源标签的维护。" />
      <div className="space-y-4">
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            标签管理
          </Title>
          <Text type="secondary">按类别维护内容标签词表；同类标签共用一套词表，跨类别互不影响</Text>
        </div>

        <Tabs
          activeKey={activeKey}
          onChange={key => setActiveKey(key as TagType)}
          items={CATEGORIES.map(category => ({
            key: category.type,
            label: category.label,
            children: (
              <TagManager
                type={category.type}
                api={category.api}
                description={category.description}
                namePlaceholder={category.namePlaceholder}
              />
            ),
          }))}
        />
      </div>
    </>
  );
}
