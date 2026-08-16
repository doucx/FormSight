## [WIP] fix(lint): 修复 Biome 依赖警告与 TypeScript 未使用变量报错

### 用户需求
修复刚才 `npm run checkf` 和 `npm run build` 报出的两个错误：
1. `src/components/GlobalStatsModal.tsx`: `useEffect` 传入了不必要的依赖 `dailyData`。
2. `src/hooks/useTrainingSession.ts`: `mode` 参数声明了但未被使用（TS6133）。

### 评论
这两处报错非常清晰，我们只需针对性地移除不必要的依赖项和未使用的参数即可。

### 目标
1. 移除 `GlobalStatsModal.tsx` 中 `useEffect` 的 `dailyData` 依赖。
2. 在 `useTrainingSession.ts` 中移除未使用的 `mode` 变量（或添加下划线前缀 `_mode`），确保 `tsc` 编译通过。
3. 重新运行构建和测试校验。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #scope/core #ai/instruct #task/domain/architecture #task/object/code-splitting #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `GlobalStatsModal.tsx` 与 `useTrainingSession.ts` 中的编译与 Lint 错误

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
  // === 5. 折线图渲染 ===
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);
~~~~~
~~~~~typescript.new
  // === 5. 折线图渲染 ===
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading]);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
~~~~~
~~~~~typescript.new
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  _mode: string;
  sessionType: 'training' | 'benchmark';
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
~~~~~
~~~~~typescript.new
export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  _mode,
  sessionType,
  initialLevel,
~~~~~

### 下一步建议
如果构建和测试全部通过，我们可以进行提交（Commit）阶段。
