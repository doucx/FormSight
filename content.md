我将为你优化“计划中心 - 训练阶段列表 (`PlanStageList`)”中的阶段卡片布局，解决题量选择器挤压卡片标题的问题。

当前在双栏编辑模式（或窄屏/移动端）下，单个条目固定为单行 `flex-row justify-between`，右侧的 5 档题量切换按钮（10/15/20/30/50）加上排序/删除操作固定占据了约 260px，导致较长的模块名称（如“负空间反切定点”、“阿尔伯斯同时对比”等）被严重压缩甚至截断。

1. 将阶段列表条目重构为**容器自适应响应式布局**：在移动端或紧凑分栏宽度下，自动拆分为“上层标题/描述”与“下层题量/操作”，保障卡片标题与说明有充裕的横向展示空间。
2. 当容器宽度充足（如 `sm:` 及以上且无挤压时）平铺展示；在换行时，题量选择器与操作按钮整齐对齐，并保持极高的触控与点击易用性。

## [WIP] refactor(plan-editor): 优化训练阶段卡片布局支持自适应换行

### 用户需求
在计划中心的训练阶段列表中，题量切换按钮组导致卡片名称被截断遮挡，需要优化排版使标题能清晰完整显示。

### 评论
卡片标题是用户识别训练步骤的关键信息。通过容器自适应断点（`flex-col sm:flex-row`）与弹性对齐，不仅彻底解决了标题被挤压的问题，还提升了在移动端和中等分栏下的可读性与操作手感。

### 目标
1. 修改 `PlanStageList.tsx` 中的条目布局，使其在紧凑宽度下自适应换行。
2. 保持视觉风格一致，确保标题与描述完整清晰，操作按钮排列规整。

### 基本原理
将阶段条目容器由固定单行改为响应式弹性布局（`flex-col sm:flex-row items-start sm:items-center`），在左侧标题部分给予完整展开宽度，右侧控制区在折行时靠右或两端自适应对齐。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-stage-card #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 优化 `PlanStageList.tsx` 中的阶段条目响应式布局

修改条目容器与子项的 flex 布局，支持紧凑宽度自适应折行。

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx.old
            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between gap-3"
              >
                {/* 左侧：严格 min-w-0 弹性约束，保证超长文本必然被截断，绝不撑开容器 */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 右侧：严格 flex-shrink-0 防挤压 */}
                <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1 cursor-pointer"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
~~~~~
~~~~~tsx.new
            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
              >
                {/* 模块信息区：包含序号、图标、标题与描述，在窄屏下拥有完整横向展示空间 */}
                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 题量选择与操作控制区：在紧凑宽度下换行并靠右/充满对齐 */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1 cursor-pointer"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
~~~~~

### 下一步建议
1. 验证在不同视口宽度（移动端、平板、桌面端）下计划编辑器的表现，确保长标题模块清晰可见。
2. 运行 `npm run check` 确保代码格式和 TypeScript 类型检查全部通过。
