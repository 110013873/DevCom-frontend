import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { adminCourseApi, RESOURCE_STATUS_OPTIONS } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { COURSE_LEVEL_LABELS, LESSON_TYPE_LABELS, type CourseLevel, type LessonType } from '@/types/content';
import {
  type AdminCourseDay,
  type AdminLesson,
  type ResourceStatus,
  type UpsertCourseDayPayload,
  type UpsertCoursePayload,
  type UpsertLessonPayload,
} from '@/types/adminContent';

const { Title, Text } = Typography;

const LEVEL_OPTIONS = (Object.keys(COURSE_LEVEL_LABELS) as CourseLevel[]).map(value => ({
  value,
  label: COURSE_LEVEL_LABELS[value],
}));

const LESSON_TYPE_OPTIONS = (Object.keys(LESSON_TYPE_LABELS) as LessonType[]).map(value => ({
  value,
  label: LESSON_TYPE_LABELS[value],
}));

/** 三个层级都是同一批字段的简单表单，共用一个弹窗状态机即可 */
type LessonModalState = { open: boolean; lesson: AdminLesson | null; dayId: string | null };
type DayModalState = { open: boolean; day: AdminCourseDay | null };

interface CourseFormValues {
  title: string;
  coverImage?: string;
  level: CourseLevel;
  direction?: string;
  instructor?: string;
  duration?: string;
  prerequisites?: string;
  status: ResourceStatus;
  sortOrder: number;
}

const EMPTY_FORM: CourseFormValues = {
  title: '',
  level: 'beginner',
  status: 'draft',
  sortOrder: 0,
};

/**
 * 课程编辑器（三级结构：课程 → Day → Lesson）。
 *
 * 路由 `/admin/content/courses/edit/:id`，`new` 表示新建。
 *
 * 三级内容合并在一个页面里，但**提交时机不同**，这是刻意的：
 *
 * - **课程本体**（标题/讲师/封面等）走表单的「保存」按钮，整份 PUT。
 * - **Day 与 Lesson** 各自独立增删改，每改一次立刻请求后端 —— 它们有各自的
 *   接口（`/days/:id`、`/lessons/:id`），共用底部那个保存按钮会让「保存」
 *   的语义变成「把三张表的改动一起提交」，而 PUT 是全量替换，很容易把
 *   刚加的课时冲掉。
 * - 新建课程时后端还没有 `id`，两种子资源都无法挂载，因此**先保存课程本体**，
 *   Day/Lesson 区块在新建态下只显示提示、不渲染编辑器。
 *
 * ⚠️ 删除 Day 会走 `ON DELETE CASCADE` 连带删掉该 Day 下的所有课时 ——
 * 确认框里必须把这个后果说清楚，不能只说「删除该 Day」。
 */
export default function AdminCourseEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<CourseFormValues>();

  const [description, setDescription] = useState('');
  const [lessonModal, setLessonModal] = useState<LessonModalState>({
    open: false,
    lesson: null,
    dayId: null,
  });
  const [dayModal, setDayModal] = useState<DayModalState>({ open: false, day: null });
  const [lessonForm] = Form.useForm<UpsertLessonPayload>();
  const [dayForm] = Form.useForm<UpsertCourseDayPayload>();

  const detailQuery = useQuery({
    queryKey: queryKeys.admin.courses.detail(id ?? 'new'),
    queryFn: () => adminCourseApi.detail(id as string),
    enabled: !isCreate,
  });

  const detail = detailQuery.data;

  useEffect(() => {
    if (!detail) {
      return;
    }
    form.setFieldsValue({
      title: detail.title,
      coverImage: detail.coverImage ?? undefined,
      level: detail.level,
      direction: detail.direction ?? undefined,
      instructor: detail.instructor ?? undefined,
      duration: detail.duration ?? undefined,
      prerequisites: detail.prerequisites ?? undefined,
      status: detail.status,
      sortOrder: detail.sortOrder,
    });
    setDescription(detail.description ?? '');
  }, [detail, form]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.courses.all });

  /**
   * 两条分支的返回类型不同（创建返回 `{ id }`，更新返回整份详情），
   * 统一收敛成 `{ id }` 再交给 onSuccess —— 这里唯一需要的就是 id。
   */
  const saveMutation = useMutation<{ id: string }, unknown, UpsertCoursePayload>({
    mutationFn: async (payload: UpsertCoursePayload) => {
      if (isCreate) {
        const created = await adminCourseApi.create(payload);
        return { id: created.id };
      }
      const updated = await adminCourseApi.update(id as string, payload);
      return { id: updated.id };
    },
    onSuccess: result => {
      message.success(isCreate ? '课程已创建，请继续添加 Day 与课时' : '课程已保存');
      void invalidate();
      if (isCreate) {
        // 创建成功后直接跳进编辑态，省掉一次「回列表再点编辑」
        navigate(`/admin/content/courses/edit/${result.id}`, { replace: true });
      }
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const saveDayMutation = useMutation({
    mutationFn: (payload: UpsertCourseDayPayload) =>
      dayModal.day
        ? adminCourseApi.updateDay(id as string, dayModal.day.id, payload)
        : adminCourseApi.createDay(id as string, payload),
    onSuccess: () => {
      message.success(dayModal.day ? 'Day 已更新' : 'Day 已添加');
      setDayModal({ open: false, day: null });
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败'),
  });

  const removeDayMutation = useMutation({
    mutationFn: (dayId: string) => adminCourseApi.removeDay(id as string, dayId),
    onSuccess: () => {
      message.success('Day 已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const saveLessonMutation = useMutation({
    mutationFn: (payload: UpsertLessonPayload) =>
      lessonModal.lesson
        ? adminCourseApi.updateLesson(id as string, lessonModal.lesson.id, payload)
        : adminCourseApi.createLesson(id as string, payload),
    onSuccess: () => {
      message.success(lessonModal.lesson ? '课时已更新' : '课时已添加');
      setLessonModal({ open: false, lesson: null, dayId: null });
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败'),
  });

  const removeLessonMutation = useMutation({
    mutationFn: (lessonId: string) => adminCourseApi.removeLesson(id as string, lessonId),
    onSuccess: () => {
      message.success('课时已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const openLessonModal = (lesson?: AdminLesson, dayId?: string) => {
    lessonForm.resetFields();
    if (lesson) {
      lessonForm.setFieldsValue({
        title: lesson.title,
        dayId: lesson.dayId ?? undefined,
        type: lesson.type,
        externalUrl: lesson.externalUrl ?? undefined,
        isPaid: lesson.isPaid,
        duration: lesson.duration ?? undefined,
        sortOrder: lesson.sortOrder,
      });
    } else {
      lessonForm.setFieldsValue({ type: 'markdown', isPaid: false, sortOrder: 0, dayId });
    }
    setLessonModal({ open: true, lesson: lesson ?? null, dayId: dayId ?? lesson?.dayId ?? null });
  };

  const openDayModal = (day?: AdminCourseDay) => {
    dayForm.resetFields();
    if (day) {
      dayForm.setFieldsValue({ dayNumber: day.dayNumber, title: day.title, sortOrder: day.sortOrder });
    } else {
      // 默认接在最后一个 Day 后面，运营最常做的就是往下续
      const nextNumber = (detail?.days ?? []).reduce((max, item) => Math.max(max, item.dayNumber), 0) + 1;
      dayForm.setFieldsValue({ dayNumber: nextNumber, title: '', sortOrder: nextNumber - 1 });
    }
    setDayModal({ open: true, day: day ?? null });
  };

  const submit = (values: CourseFormValues) => {
    const payload: UpsertCoursePayload = {
      title: values.title.trim(),
      coverImage: values.coverImage || undefined,
      level: values.level,
      direction: values.direction?.trim() || undefined,
      instructor: values.instructor?.trim() || undefined,
      duration: values.duration?.trim() || undefined,
      prerequisites: values.prerequisites?.trim() || undefined,
      description,
      status: values.status,
      sortOrder: values.sortOrder,
    };
    saveMutation.mutate(payload);
  };

  if (!isCreate && detailQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!isCreate && detailQuery.isError) {
    return (
      <Card>
        <Text type="danger">
          加载失败：{detailQuery.error instanceof ApiError ? detailQuery.error.message : '未知错误'}
        </Text>
        <div className="mt-4">
          <Button onClick={() => navigate('/admin/content/courses')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  /** 未挂到任何 Day 上的课时，单独成组展示 —— 否则它们会凭空消失 */
  const orphanLessons = (detail?.lessons ?? []).filter(lesson => !lesson.dayId);

  const lessonColumns = (dayId: string | null): TableProps<AdminLesson>['columns'] => [
    {
      title: '课时标题',
      dataIndex: 'title',
      render: (value: string, record) => (
        <Space size={6}>
          <Text>{value}</Text>
          {record.isPaid && <Tag color="gold">付费</Tag>}
        </Space>
      ),
    },
    {
      title: '形式',
      dataIndex: 'type',
      width: 100,
      render: (value: LessonType) => LESSON_TYPE_LABELS[value],
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 100,
      align: 'right',
      render: (value: number | null) => (value ? `${value} 分钟` : <Text type="secondary">-</Text>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openLessonModal(record, dayId ?? undefined)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这个课时？"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => removeLessonMutation.mutate(record.id)}
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
      <SEOHead title={isCreate ? '新建课程' : '编辑课程'} description="人才培养课程与课节编排。" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/content/courses')}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {isCreate ? '新建课程' : '编辑课程'}
            </Title>
          </Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() => void form.submit()}
          >
            保存
          </Button>
        </div>

        <Form<CourseFormValues> form={form} layout="vertical" initialValues={EMPTY_FORM} onFinish={submit}>
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              <Card title="课程信息">
                <Form.Item
                  name="title"
                  label="课程标题"
                  rules={[
                    { required: true, message: '请输入课程标题' },
                    { max: 200, message: '最多 200 字' },
                  ]}
                >
                  <Input placeholder="例如 RISC-V 十天入门课" maxLength={200} showCount />
                </Form.Item>
                <Form.Item label="课程简介" extra="课程详情页顶部的介绍正文">
                  <RichTextEditor value={description} onChange={setDescription} minHeight={220} />
                </Form.Item>
                <Form.Item name="prerequisites" label="前置要求">
                  <Input.TextArea rows={3} maxLength={500} showCount placeholder="可留空" />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Space direction="vertical" size={16} className="w-full">
                <Card title="发布">
                  <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                    <Select options={RESOURCE_STATUS_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="level" label="难度" rules={[{ required: true }]}>
                    <Select options={LEVEL_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="sortOrder" label="排序" extra="数字越小越靠前">
                    <InputNumber min={0} max={9999} className="w-full" />
                  </Form.Item>
                </Card>

                <Card title="师资与规模">
                  <Form.Item name="instructor" label="讲师">
                    <Input placeholder="可留空" maxLength={100} />
                  </Form.Item>
                  <Form.Item name="direction" label="方向" extra="例如 编译器 / AI 加速">
                    <Input placeholder="可留空" maxLength={100} />
                  </Form.Item>
                  <Form.Item name="duration" label="学时" extra="自由文本，例如 10 天 / 20 课时">
                    <Input placeholder="可留空" maxLength={50} />
                  </Form.Item>
                </Card>

                <Card title="封面">
                  <Form.Item name="coverImage" label="封面图">
                    <ImageUploadField purpose="cover" size={140} />
                  </Form.Item>
                </Card>
              </Space>
            </Col>
          </Row>
        </Form>

        {/* ---------- 目录编排：必须先有课程 id ---------- */}
        {isCreate ? (
          <Card title="目录编排">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请先保存课程，再添加 Day 与课时"
            />
          </Card>
        ) : (
          <Card
            title="目录编排"
            extra={
              <Button icon={<PlusOutlined />} onClick={() => openDayModal()}>
                添加 Day
              </Button>
            }
          >
            {(detail?.days ?? []).length === 0 && orphanLessons.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有任何 Day 或课时" />
            ) : (
              <Space direction="vertical" size={12} className="w-full">
                {(detail?.days ?? []).map(day => {
                  const dayLessons = (detail?.lessons ?? []).filter(lesson => lesson.dayId === day.id);
                  return (
                    <Card
                      key={day.id}
                      type="inner"
                      size="small"
                      title={
                        <Space size={8}>
                          <Tag color="blue">Day {day.dayNumber}</Tag>
                          <Text strong>{day.title}</Text>
                        </Space>
                      }
                      extra={
                        <Space size={4}>
                          <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => openLessonModal(undefined, day.id)}
                          >
                            添加课时
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openDayModal(day)}
                          >
                            编辑
                          </Button>
                          <Popconfirm
                            title="确认删除这个 Day？"
                            // 级联是后端行为，必须在这里讲清楚，否则用户以为课时会留下来
                            description={`该 Day 下的 ${dayLessons.length} 个课时会被一并删除，且无法恢复。`}
                            okText="删除"
                            okButtonProps={{ danger: true }}
                            cancelText="取消"
                            onConfirm={() => removeDayMutation.mutate(day.id)}
                          >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <Table<AdminLesson>
                        rowKey="id"
                        size="small"
                        columns={lessonColumns(day.id)}
                        dataSource={dayLessons}
                        pagination={false}
                        locale={{ emptyText: '该 Day 下暂无课时' }}
                      />
                    </Card>
                  );
                })}

                {orphanLessons.length > 0 && (
                  <Card
                    type="inner"
                    size="small"
                    title={
                      <Space size={8}>
                        <Tag color="orange">未分 Day</Tag>
                        <Text type="secondary">这些课时没有挂到任何 Day 上</Text>
                      </Space>
                    }
                  >
                    <Table<AdminLesson>
                      rowKey="id"
                      size="small"
                      columns={lessonColumns(null)}
                      dataSource={orphanLessons}
                      pagination={false}
                    />
                  </Card>
                )}
              </Space>
            )}
          </Card>
        )}
      </div>

      {/* ---------------- Day 表单 ---------------- */}
      <Modal
        open={dayModal.open}
        title={dayModal.day ? '编辑 Day' : '添加 Day'}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveDayMutation.isPending}
        onCancel={() => setDayModal({ open: false, day: null })}
        onOk={() => void dayForm.submit()}
        destroyOnHidden
      >
        <Form<UpsertCourseDayPayload>
          form={dayForm}
          layout="vertical"
          onFinish={values => saveDayMutation.mutate({ ...values, title: values.title.trim() })}
        >
          <Form.Item
            name="dayNumber"
            label="第几天"
            rules={[{ required: true, message: '请输入天序号' }]}
            extra="用于展示的序号，例如 Day 3"
          >
            <InputNumber min={1} max={999} className="w-full" />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }, { max: 200 }]}
          >
            <Input placeholder="例如 RISC-V 指令集概览" maxLength={200} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} max={9999} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---------------- 课时表单 ---------------- */}
      <Modal
        open={lessonModal.open}
        title={lessonModal.lesson ? '编辑课时' : '添加课时'}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveLessonMutation.isPending}
        onCancel={() => setLessonModal({ open: false, lesson: null, dayId: null })}
        onOk={() => void lessonForm.submit()}
        destroyOnHidden
      >
        <Form<UpsertLessonPayload>
          form={lessonForm}
          layout="vertical"
          onFinish={values =>
            saveLessonMutation.mutate({
              ...values,
              title: values.title.trim(),
              externalUrl: values.externalUrl?.trim() || undefined,
              // 空串会让后端把 externalUrl 存成 ''，这里统一转成 undefined
              content: values.content || undefined,
            })
          }
        >
          <Form.Item
            name="title"
            label="课时标题"
            rules={[{ required: true, message: '请输入课时标题' }, { max: 200 }]}
          >
            <Input placeholder="例如 第一个 RVV 内核" maxLength={200} />
          </Form.Item>
          <Form.Item name="dayId" label="所属 Day" extra="留空则该课时不归属任何一天">
            <Select
              allowClear
              placeholder="选择 Day"
              options={(detail?.days ?? []).map(day => ({
                value: day.id,
                label: `Day ${day.dayNumber} · ${day.title}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="type" label="形式" rules={[{ required: true }]}>
            <Select options={LESSON_TYPE_OPTIONS} />
          </Form.Item>
          {/* 外链课时只用到 externalUrl；正文课时只用到 content。两个都留着，用哪个填哪个 */}
          <Form.Item name="externalUrl" label="外部链接" extra="形式为「外部链接」时必填">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="duration" label="时长（分钟）">
            <InputNumber min={1} max={10000} className="w-full" placeholder="可留空" />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="isPaid" label="付费内容" valuePropName="checked" extra="平台首版不代收费用">
              <Switch />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序" style={{ width: 140 }}>
              <InputNumber min={0} max={9999} className="w-full" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
