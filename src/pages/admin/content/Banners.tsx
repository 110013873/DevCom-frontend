import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import SEOHead from '@/components/common/SEOHead';
import {
  adminBannerApi,
  adminCourseApi,
  adminNewsApi,
  adminResourceApi,
  SLOT_TARGET_TYPES,
} from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import {
  type AdminAnnouncement,
  type AdminRecommendationSlot,
  type SlotTargetType,
  type UpsertAnnouncementPayload,
  type UpsertRecommendationSlotPayload,
} from '@/types/adminContent';

const { Title, Text } = Typography;

/* ------------------------------------------------------------ 公告 */

interface AnnouncementFormValues {
  title: string;
  content?: string;
  position?: string;
  /** 时间区间在表单里是一对 Dayjs，落库时拆成两个 ISO 串。 */
  range?: [Dayjs | null, Dayjs | null];
  isActive: boolean;
}

const EMPTY_ANNOUNCEMENT: AnnouncementFormValues = {
  title: '',
  position: 'home',
  isActive: true,
};

/** 公告位置目前后端是自由文本，这里给几个常用值，允许运营自己填别的 */
const POSITION_OPTIONS = [
  { value: 'home', label: '首页' },
  { value: 'news', label: '新闻页' },
  { value: 'resource', label: '资源页' },
  { value: 'course', label: '课程页' },
];

/* ------------------------------------------------------------ 推荐位 */

interface SlotFormValues {
  slotKey: string;
  targetType: SlotTargetType;
  targetId: string;
  sortOrder: number;
  range?: [Dayjs | null, Dayjs | null];
  isActive: boolean;
}

const EMPTY_SLOT: SlotFormValues = {
  slotKey: 'home_banner',
  targetType: 'news',
  targetId: '',
  sortOrder: 0,
  isActive: true,
};

/** 槽位名后端也是自由文本；这几个值与前台首页读取的键对应 */
const SLOT_KEY_OPTIONS = [
  { value: 'home_banner', label: '首页轮播' },
  { value: 'home_featured', label: '首页精选' },
  { value: 'resource_featured', label: '资源推荐' },
];

/** 目标类型 → 可选内容的中文名，用于「目标」列的回显 */
const TARGET_TYPE_LABELS: Record<SlotTargetType, string> = {
  news: '新闻',
  resource: '资源',
  course: '课程',
};

const TARGET_TYPE_COLORS: Record<SlotTargetType, string> = {
  news: 'blue',
  resource: 'green',
  course: 'purple',
};

/**
 * 把一对 Dayjs 拆成 `startAt` / `endAt`。
 *
 * 区间的两端都可能为空（「长期有效」就是两段都空），因此不能简写成
 * `range[0]?.toISOString()` —— 那样空区间会变成 undefined 的端点是正确行为，
 * 但写成 `range && range[0]` 更容易读错。
 */
function splitRange(range?: [Dayjs | null, Dayjs | null] | null): {
  startAt?: string;
  endAt?: string;
} {
  if (!range) {
    return {};
  }
  const [start, end] = range;
  return {
    startAt: start ? start.toISOString() : undefined,
    endAt: end ? end.toISOString() : undefined,
  };
}

/**
 * 公告与推荐位管理。路由 `/admin/content/banners`。
 *
 * 两块内容放在同一页的两个 Tab 里，因为它们服务的是同一个入口 —— 首页首屏。
 * 运营调整首屏时通常两样都要动，分成两个导航项反而增加来回跳转。
 *
 * 两者的表单结构也不同：公告有正文与位置，推荐位是「槽位 + 指向某个内容」，
 * 所以共用页面壳但不共用表单。
 */
export default function AdminBanners() {
  const [tab, setTab] = useState('announcement');

  return (
    <>
      <SEOHead title="公告与推荐位" description="首页公告、轮播与内容推荐位维护。" />
      <div className="space-y-4">
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            公告与推荐位
          </Title>
          <Text type="secondary">首页首屏的公告条与内容推荐位</Text>
        </div>

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'announcement', label: '公告', children: <AnnouncementPanel /> },
            { key: 'slot', label: '推荐位', children: <SlotPanel /> },
          ]}
        />
      </div>
    </>
  );
}

/* ============================================================ 公告面板 */

function AnnouncementPanel() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [form] = Form.useForm<AnnouncementFormValues>();

  const query = { pageNumber: page, pageSize };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.announcements.list(query),
    queryFn: () => adminBannerApi.listAnnouncements(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements.all });

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertAnnouncementPayload) =>
      editing
        ? adminBannerApi.updateAnnouncement(editing.id, payload)
        : adminBannerApi.createAnnouncement(payload),
    onSuccess: () => {
      message.success(editing ? '公告已更新' : '公告已创建');
      setModalOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminBannerApi.removeAnnouncement(id),
    onSuccess: () => {
      message.success('公告已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const openModal = (announcement?: AdminAnnouncement) => {
    setEditing(announcement ?? null);
    form.resetFields();
    if (announcement) {
      form.setFieldsValue({
        title: announcement.title,
        content: announcement.content,
        position: announcement.position,
        isActive: announcement.isActive,
        range:
          announcement.startAt || announcement.endAt
            ? [
                announcement.startAt ? dayjs(announcement.startAt) : null,
                announcement.endAt ? dayjs(announcement.endAt) : null,
              ]
            : undefined,
      });
    } else {
      form.setFieldsValue(EMPTY_ANNOUNCEMENT);
    }
    setModalOpen(true);
  };

  const columns: TableProps<AdminAnnouncement>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (value: string, record) => (
        <div className="leading-tight">
          <Text strong>{value}</Text>
          <div className="line-clamp-1 text-xs text-muted-foreground">{record.content}</div>
        </div>
      ),
    },
    {
      title: '位置',
      dataIndex: 'position',
      width: 110,
      render: (value: string) =>
        POSITION_OPTIONS.find(option => option.value === value)?.label ?? value ?? '-',
    },
    {
      title: '生效期',
      key: 'range',
      width: 300,
      render: (_value, record) =>
        record.startAt || record.endAt ? (
          <Text type="secondary">
            {record.startAt ? formatDateTime(record.startAt) : '不限'}
            {' → '}
            {record.endAt ? formatDateTime(record.endAt) : '不限'}
          </Text>
        ) : (
          <Tag>长期有效</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 100,
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>,
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这条公告？"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => removeMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Text type="secondary">共 {data?.total ?? 0} 条</Text>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建公告
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<AdminAnnouncement>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isFetching}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: total => `共 ${total} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? '编辑公告' : '新建公告'}
        okText="保存"
        cancelText="取消"
        width={640}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={() => void form.submit()}
        destroyOnHidden
      >
        <Form<AnnouncementFormValues>
          form={form}
          layout="vertical"
          initialValues={EMPTY_ANNOUNCEMENT}
          onFinish={values => {
            const { startAt, endAt } = splitRange(values.range);
            saveMutation.mutate({
              title: values.title.trim(),
              content: values.content?.trim() || undefined,
              position: values.position?.trim() || undefined,
              startAt,
              endAt,
              isActive: values.isActive,
            });
          }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入公告标题' }, { max: 200 }]}
          >
            <Input placeholder="例如 社区开放注册" maxLength={200} />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={4} maxLength={1000} showCount placeholder="可留空" />
          </Form.Item>
          <Form.Item name="position" label="展示位置">
            <Select allowClear placeholder="选择位置" options={POSITION_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="range"
            label="生效期"
            extra="两端都留空表示长期有效；后台会据此自动决定何时停止展示"
          >
            <DatePicker.RangePicker showTime className="w-full" placeholder={['开始时间', '结束时间']} />
          </Form.Item>
          <Form.Item name="isActive" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

/* ============================================================ 推荐位面板 */

function SlotPanel() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRecommendationSlot | null>(null);
  const [pickerType, setPickerType] = useState<SlotTargetType>('news');
  const [form] = Form.useForm<SlotFormValues>();

  const query = { pageNumber: page, pageSize };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.slots.list(query),
    queryFn: () => adminBannerApi.listSlots(query),
    placeholderData: keepPreviousData,
  });

  /**
   * 目标内容的下拉候选。
   *
   * 三个类型各有各的列表接口与字段名（新闻用 `title`、资源用 `name`），
   * 所以按 `pickerType` 分别取；`staleTime` 给足是因为这是运营侧的
   * 选择器，内容不会在这一分钟内变。
   */
  const newsQuery = useQuery({
    queryKey: queryKeys.admin.news.list({ pageSize: 100 }),
    queryFn: () => adminNewsApi.list({ pageNumber: 1, pageSize: 100 }),
    enabled: pickerType === 'news',
    staleTime: 60_000,
  });

  const resourceQuery = useQuery({
    queryKey: queryKeys.admin.resources.list({ pageSize: 100 }),
    queryFn: () => adminResourceApi.list({ pageNumber: 1, pageSize: 100 }),
    enabled: pickerType === 'resource',
    staleTime: 60_000,
  });

  const courseQuery = useQuery({
    queryKey: queryKeys.admin.courses.list({ pageSize: 100 }),
    queryFn: () => adminCourseApi.list({ pageNumber: 1, pageSize: 100 }),
    enabled: pickerType === 'course',
    staleTime: 60_000,
  });

  const targetOptions = useMemo(() => {
    if (pickerType === 'news') {
      return (newsQuery.data?.items ?? []).map(item => ({ value: item.id, label: item.title }));
    }
    if (pickerType === 'resource') {
      return (resourceQuery.data?.items ?? []).map(item => ({ value: item.id, label: item.name }));
    }
    return (courseQuery.data?.items ?? []).map(item => ({ value: item.id, label: item.title }));
  }, [pickerType, newsQuery.data, resourceQuery.data, courseQuery.data]);

  const targetOptionsLoading =
    pickerType === 'news'
      ? newsQuery.isLoading
      : pickerType === 'resource'
        ? resourceQuery.isLoading
        : courseQuery.isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.slots.all });

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertRecommendationSlotPayload) =>
      editing ? adminBannerApi.updateSlot(editing.id, payload) : adminBannerApi.createSlot(payload),
    onSuccess: () => {
      message.success(editing ? '推荐位已更新' : '推荐位已创建');
      setModalOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminBannerApi.removeSlot(id),
    onSuccess: () => {
      message.success('推荐位已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const openModal = (slot?: AdminRecommendationSlot) => {
    setEditing(slot ?? null);
    form.resetFields();
    if (slot) {
      setPickerType(slot.targetType);
      form.setFieldsValue({
        slotKey: slot.slotKey,
        targetType: slot.targetType,
        targetId: slot.targetId,
        sortOrder: slot.sortOrder,
        isActive: slot.isActive,
        range:
          slot.startAt || slot.endAt
            ? [
                slot.startAt ? dayjs(slot.startAt) : null,
                slot.endAt ? dayjs(slot.endAt) : null,
              ]
            : undefined,
      });
    } else {
      setPickerType('news');
      form.setFieldsValue(EMPTY_SLOT);
    }
    setModalOpen(true);
  };

  const columns: TableProps<AdminRecommendationSlot>['columns'] = [
    {
      title: '槽位',
      dataIndex: 'slotKey',
      width: 180,
      render: (value: string) => (
        <Text code>{SLOT_KEY_OPTIONS.find(option => option.value === value)?.label ?? value}</Text>
      ),
    },
    {
      title: '目标',
      key: 'target',
      render: (_value, record) => (
        <Space size={6}>
          <Tag color={TARGET_TYPE_COLORS[record.targetType]}>
            {TARGET_TYPE_LABELS[record.targetType]}
          </Tag>
          {/* 这里只显示 id —— 列表接口不返回目标标题，逐个回查会变成 N+1 */}
          <Text type="secondary" className="text-xs">
            {record.targetId}
          </Text>
        </Space>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 80, align: 'right' },
    {
      title: '生效期',
      key: 'range',
      width: 300,
      render: (_value, record) =>
        record.startAt || record.endAt ? (
          <Text type="secondary">
            {record.startAt ? formatDateTime(record.startAt) : '不限'}
            {' → '}
            {record.endAt ? formatDateTime(record.endAt) : '不限'}
          </Text>
        ) : (
          <Tag>长期有效</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 100,
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这个推荐位？"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => removeMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Text type="secondary">共 {data?.total ?? 0} 条</Text>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建推荐位
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<AdminRecommendationSlot>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isFetching}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: total => `共 ${total} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? '编辑推荐位' : '新建推荐位'}
        okText="保存"
        cancelText="取消"
        width={560}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={() => void form.submit()}
        destroyOnHidden
      >
        <Form<SlotFormValues>
          form={form}
          layout="vertical"
          initialValues={EMPTY_SLOT}
          onFinish={values => {
            const { startAt, endAt } = splitRange(values.range);
            saveMutation.mutate({
              slotKey: values.slotKey.trim(),
              targetType: values.targetType,
              targetId: values.targetId,
              sortOrder: values.sortOrder,
              startAt,
              endAt,
              isActive: values.isActive,
            });
          }}
        >
          <Form.Item
            name="slotKey"
            label="槽位"
            rules={[{ required: true, message: '请输入槽位标识' }, { max: 100 }]}
            extra="同一槽位下的条目按排序号依次展示"
          >
            <Select
              showSearch
              placeholder="选择或输入槽位标识"
              options={SLOT_KEY_OPTIONS}
              // 允许运营填后端约定的新槽位，而不必改前端
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase()) ||
                (option?.value ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="targetType" label="内容类型" rules={[{ required: true }]}>
            <Select
              options={SLOT_TARGET_TYPES}
              onChange={value => {
                // 换了类型，之前选的目标 id 一定不属于新类型，必须清掉
                setPickerType(value);
                form.setFieldValue('targetId', undefined);
              }}
            />
          </Form.Item>
          <Form.Item
            name="targetId"
            label="推荐内容"
            rules={[{ required: true, message: '请选择推荐的内容' }]}
          >
            <Select
              showSearch
              placeholder="选择内容"
              loading={targetOptionsLoading}
              options={targetOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" extra="数字越小越靠前">
            <InputNumber min={0} max={9999} className="w-full" />
          </Form.Item>
          <Form.Item name="range" label="生效期" extra="两端都留空表示长期有效">
            <DatePicker.RangePicker showTime className="w-full" placeholder={['开始时间', '结束时间']} />
          </Form.Item>
          <Form.Item name="isActive" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
