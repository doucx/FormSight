我们将这 5 处挂载点全部打通，使「角度感知」领域能够正确显示在首页卡片列表、正常响应 Hash 路由导航，并在全局统计与设置面板中正常运作。

## [WIP] feat(angle): 在主页、路由、全局统计与动态设置中接入角度感知领域

### 用户需求
在以下 5 个关键挂载点补齐 `'angle'` 领域注册：
1. `src/views/Home.tsx`：在首页模块顺序列表中加入 `'angle'`。
2. `src/hooks/useHashRoute.ts`：在看板路由白名单中支持 `'angle'`。
3. `src/app.tsx`：在 `ALL_DOMAINS` 与 `domainTimes` 初始状态中注册 `'angle'`。
4. `src/components/GlobalStatsModal.tsx`：在统计看板领域列表中加入 `'angle'`。
5. `src/components/settings/DynamicDomainSettings.tsx`：在 `DOMAIN_SETTING_SCHEMAS` 中配置 `angle: []`。

### 评论
补齐这些领域入口后，`angle` 模块将完整嵌入系统的生命周期，包括路由切换、耗时统计、Profile 加载与全局数据聚合。

### 目标
1. 在 `DynamicDomainSettings.tsx` 中添加 `angle` 的设置架构定义。
2. 在 `GlobalStatsModal.tsx` 的 `ALL_DOMAINS` 中加入 `angle`。
3. 在 `useHashRoute.ts` 的路由过滤条件中加入 `angle`。
4. 在 `Home.tsx` 的首页渲染数组中将 `angle` 置于首位展示。
5. 在 `app.tsx` 中更新所有全局领域数组与统计初始状态。

### 基本原理
通过在前端路由与全局状态层声明 `'angle'` 对应的 key，使 Preact Router 能识别 `#/dashboard/angle`，并在首页加载 IndexedDB 中的练习记录与各卡片 Profile。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #comp/runtime #concept/ui #concept/navigation #scope/ux #ai/instruct #task/domain/geometry #task/object/angle-perception-module #task/action/integration #task/state/continue

---

### Script

#### Acts 1: 更新动态设置与全局统计面板

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
export const DOMAIN_SETTING_SCHEMAS: Record<TrainingDomain, SettingFieldSchema[]> = {
  abstraction: [],
  concretization: [],
  star: [
~~~~~
~~~~~typescript.new
export const DOMAIN_SETTING_SCHEMAS: Record<TrainingDomain, SettingFieldSchema[]> = {
  angle: [],
  abstraction: [],
  concretization: [],
  star: [
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~
~~~~~typescript.new
const ALL_DOMAINS: TrainingDomain[] = [
  'angle',
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~

#### Acts 2: 更新路由白名单

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
    if (
      [
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
~~~~~
~~~~~typescript.new
    if (
      [
        'angle',
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
~~~~~

#### Acts 3: 更新首页与 App 顶层状态

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
  const domainOrder: TrainingDomain[] = [
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
~~~~~
~~~~~typescript.new
  const domainOrder: TrainingDomain[] = [
    'angle',
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~
~~~~~typescript.new
const ALL_DOMAINS: TrainingDomain[] = [
  'angle',
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~
~~~~~typescript.new
  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    angle: 0,
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~

### 下一步建议
1. 刷新首页验证「角度感知」卡片入口是否正常渲染。
2. 点击卡片进入 `#/dashboard/angle` 看板，分别开始训练「夹角大小估算」、「角度二分对比」与「平行线对偶辨识」，验证作答、判定反馈及成绩记录是否完整存入 IndexedDB。
