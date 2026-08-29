我们将修复 Biome 检查中报告的 4 处无障碍（a11y）规则报错：为 `AppNavigation.tsx` 中的 `AfdianIcon` SVG 元素添加 `<title>` 标签，并为 `Home.tsx` 中绑定了 `onClick` 的 3 个入口卡片添加对应的 `onKeyDown` 键盘事件处理。

## [WIP] fix: 修复 SVG 缺失标题与点击事件缺失键盘响应的 a11y 报错

### 错误分析
运行 `npm run checkf` 时，Biome 报出 4 处 a11y 规则错误：
1. `src/components/navigation/AppNavigation.tsx`: `lint/a11y/noSvgWithoutTitle` 规则检测到 `AfdianIcon` 组件内的 `<svg>` 标签缺少可访问性描述或 `<title>` 元素。
2. `src/views/Home.tsx`: 3 处带有 `onClick` 的卡片容器（今日刷题指标卡、探索大盘入口、计划管理入口）触发了 `lint/a11y/useKeyWithClickEvents`，未提供对应的 `onKeyDown`/`onKeyUp` 键盘无障碍事件支持。

### 用户需求
修复这些 Biome linter 校验错误，确保项目通过 `npm run checkf` 与 CI 静态检查。

### 评论
遵循 Web 无障碍规范（WCAG）与 Biome 代码质量检查是保持前端代码健壮性和可访问性的最佳实践。通过为 SVG 补充 `<title>` 并在可交互容器上补充 `Enter` / `Space` 键的响应，可以同时解决静态检查报错并改善键盘用户的交互体验。

### 目标
1. 在 `src/components/navigation/AppNavigation.tsx` 的 `AfdianIcon` 中补充 `<title>`。
2. 在 `src/views/Home.tsx` 的 3 个可点击 `div` 容器上添加 `onKeyDown` 键盘事件响应。

### 基本原理
- 在 SVG 元素内部添加 `<title>Afdian</title>` 可以满足 `noSvgWithoutTitle` 的可访问性标准要求。
- 在带有 `onClick` 事件的卡片元素上添加 `onKeyDown`（并在按下 `Enter` 或空格键时触发对应路由跳转），可以满足 `useKeyWithClickEvents` 的键盘可访问性要求。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/linter-a11y #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `AppNavigation.tsx` 中 SVG 缺失 `<title>` 的问题

~~~~~act
patch_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript.old
function AfdianIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.4 15.6l-1-4.6h3.4l-6.8 7 1.2-5.4H7.2l6.2-7-.6 4.6h3.4l-4.4 5.4z" />
    </svg>
  );
}
~~~~~
~~~~~typescript.new
function AfdianIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Afdian</title>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.4 15.6l-1-4.6h3.4l-6.8 7 1.2-5.4H7.2l6.2-7-.6 4.6h3.4l-4.4 5.4z" />
    </svg>
  );
}
~~~~~

#### Acts 2: 修复 `Home.tsx` 中点击事件缺少键盘事件绑定的问题

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
        {/* 指标卡 1: 今日刷题 */}
        <div
          role="presentation"
          onClick={onNavigateToStats}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.trialsUnit')}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            {t('common.accuracy')}:{' '}
            <span className="font-bold text-slate-700 font-mono">{overallAccuracy}%</span>
          </div>
        </div>

        {/* 快捷跳转 2: 探索大盘入口 */}
        <div
          role="presentation"
          onClick={onNavigateToDiscovery}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Compass className="w-3.5 h-3.5" />
              {t('nav.discovery')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{t('home.allPacks')}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
        </div>

        {/* 快捷跳转 3: 计划管理入口 */}
        <div
          role="presentation"
          onClick={onOpenPlanEditor}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Layers className="w-3.5 h-3.5" />
              {t('nav.plans')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{trainingPlan.name}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('plan.stageAndTrialsSummary', {
                stages: validPlanItems.length,
                trials: validPlanItems.reduce((acc, c) => acc + c.targetTrials, 0),
              })}
            </p>
          </div>
        </div>
~~~~~
~~~~~typescript.new
        {/* 指标卡 1: 今日刷题 */}
        <div
          role="presentation"
          onClick={onNavigateToStats}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToStats();
            }
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.trialsUnit')}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            {t('common.accuracy')}:{' '}
            <span className="font-bold text-slate-700 font-mono">{overallAccuracy}%</span>
          </div>
        </div>

        {/* 快捷跳转 2: 探索大盘入口 */}
        <div
          role="presentation"
          onClick={onNavigateToDiscovery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToDiscovery();
            }
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Compass className="w-3.5 h-3.5" />
              {t('nav.discovery')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{t('home.allPacks')}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
        </div>

        {/* 快捷跳转 3: 计划管理入口 */}
        <div
          role="presentation"
          onClick={onOpenPlanEditor}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPlanEditor();
            }
          }}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Layers className="w-3.5 h-3.5" />
              {t('nav.plans')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{trainingPlan.name}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('plan.stageAndTrialsSummary', {
                stages: validPlanItems.length,
                trials: validPlanItems.reduce((acc, c) => acc + c.targetTrials, 0),
              })}
            </p>
          </div>
        </div>
~~~~~

### 下一步建议
1. 执行 `npm run check` 验证 Biome 和 TypeScript 类型检查是否全部通过。
2. 执行 `npm test` 确认测试套件运行无异常。
