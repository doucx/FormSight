通过检查四个主导航页面（今日工作台、探索大盘、计划中心、认知档案）的根容器样式：

- **今日工作台 (`Home.tsx`)**: `max-w-5xl` (1024px)
- **探索大盘 (`DiscoveryView.tsx`)**: `max-w-6xl` (1152px)
- **计划中心 (`PlanEditorView.tsx`)**: `max-w-6xl` (1152px)
- **认知档案 (`GlobalStatsView.tsx`)**: `max-w-6xl` (1152px)

四个主页面中，今日工作台为 `max-w-5xl`，其余三个页面均为 `max-w-6xl`，导致在宽屏切换导航 Tab 时页面内容宽度出现明显的跳变与不对齐。

将今日工作台统一调整为 `max-w-6xl` 即可实现全站主干视图宽度的完全对齐。

## [WIP] style(views): 对齐四大主导航页面的内容总宽度

### 用户需求
检查并对齐“今日工作台”、“探索大盘”、“计划中心”与“认知档案”四个页面的内容总宽度，消除切换时的宽度不一致。

### 评论
将四个页面的最大内容宽度统一收敛至 `max-w-6xl`，能极大增强切换各主干页面时的视觉稳定性与版面呼吸感。

### 目标
将 `src/views/Home.tsx` 的外层容器宽度由 `max-w-5xl` 统一修改为 `max-w-6xl`，使四大主页面完全一致。

### 基本原理
四个页面的顶层排版均嵌套在 `AppRouter` 的 `<main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 ...">` 中。通过统一各页面顶层根容器的 `max-w-6xl mx-auto` 约束，确保桌面端视口下的两侧边距与内容中心对齐线完全一致。

### 标签
#intent/tune #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/page-max-width #task/action/unify #task/state/continue

---

### Script

#### Acts 1: 将 `Home.tsx` 根容器最大宽度对齐为 `max-w-6xl`

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部状态与问候信息 */}
~~~~~
~~~~~tsx.new
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部状态与问候信息 */}
~~~~~

### 下一步建议
1. 建议在浏览器中依次点击切换侧边栏的四个主导航项（今日工作台、探索大盘、计划中心、认知档案），体验平滑无抖动的视觉过渡。
2. 运行 `npm run check` 确保代码格式和类型规范。
