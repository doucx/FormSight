好的，我将生成一个计划来移除 `SpatialFractalView.tsx` 中不必要的选项标题及红蓝定向说明文本。

## [WIP] refactor(spatial_fractal): 移除多余的 2D 剖面选项说明文本

### 错误分析

（本次任务为常规重构，无错误修复需求）

### 用户需求
用户要求从 `SpatialFractalView.tsx` 中去除顶部的选项标题及红蓝定向说明文本（即 `{t('optionsLabel')}`、`{t('topOrientation')}` 和 `{t('leftOrientation')}` 所在的 `div` 标签及其内容）。

### 评论
该改动精简了 `SpatialFractalView` 的右侧面板界面，去除了冗余的图例说明，使 4-AFC 选项区更加紧凑和直观。

### 目标
精确定位 `SpatialFractalView.tsx` 中的说明栏 `div` 元素，并使用 `patch_file` 将其安全移除，同时保留下方的选项网格。

### 基本原理
通过 `patch_file` 替换掉包含说明文本的 `div` 结构，直接将外层容器与 `grid grid-cols-2 gap-4` 衔接，保持其余代码和布局不变。

### 标签
#intent/refine #flow/ready #priority/medium #scope/ux #ai/instruct #task/domain/ui #task/object/spatial-fractal-view #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 移除 SpatialFractalView 中的冗余说明文本

~~~~~act
patch_file
src/cards/spatial_fractal/SpatialFractalView.tsx
~~~~~
~~~~~old
        {/* 右侧：4-AFC 截面选项区 */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="font-bold uppercase tracking-wider">{t('optionsLabel')}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />{' '}
                {t('topOrientation')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />{' '}
                {t('leftOrientation')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
~~~~~
~~~~~new
        {/* 右侧：4-AFC 截面选项区 */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
~~~~~

### 下一步建议

建议在本地运行项目测试，验证移除该说明栏后 UI 布局是否符合预期，以及是否存在未使用的国际化键值告警。
