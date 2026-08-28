已定位到单元测试失败的原因：在 `src/utils/db/queries.ts` 中，`formatTotalTime` 在未传入 `t` 翻译函数时使用了英文的硬编码作为 fallback，而系统默认语言及测试用例期望的是统一使用 `i18n.t` 提供的本地化字典。

## [WIP] fix: 修复 formatTotalTime 默认使用 i18n 翻译函数以通过单元测试

### 错误分析

在运行 `vitest` 时，`src/utils/__tests__/db.test.ts` 中的 `should format total time strings properly` 测试用例失败：
- **期望值**: `expect(formatTotalTime(0)).toBe('0天0小时0分钟')`
- **实际返回**: `'0d 0h 0min'`

**根本原因**:
`formatTotalTime(ms, t)` 函数在没有显式传递 `t` 参数时，使用了硬编码的英文字符串 `'0d 0h 0min'`、`'d '`、`'h '`、`'min'`，而没有使用系统全局的 `i18n.t` 作为默认参数，导致默认情况下无法走本地化词典映射（默认语言 `zh-CN`）。

### 用户需求

修复 `formatTotalTime` 的默认翻译行为，使其在未传参 `t` 时默认使用 `i18n.t`，使单元测试恢复通过。

### 评论

这是一个标准的 API 默认参数与多语言回退问题。在整个系统中，如 `getCardTitle`、`getCardDesc` 等均使用 `t = i18n.t` 作为默认参数。将 `formatTotalTime` 的 `t` 参数默认设为 `i18n.t` 能统一系统设计，同时完全兼容显式传参调用的场景。

### 目标

1. 在 `src/utils/db/queries.ts` 中引入 `i18n`。
2. 将 `formatTotalTime` 的 `t` 参数默认值设为 `i18n.t`，并移除过时的硬编码 fallback 逻辑。
3. 保证单元测试全部通过。

### 基本原理

通过 `t: (key: string) => string = i18n.t` 为参数提供默认值：当调用方未传参时自动获取全局 `i18n.t`，查取当前活动语言包（默认 `zh-CN`）；当调用方传入自定义 `t` 时则使用传入函数，逻辑简洁且无状态歧义。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/config #scope/core #ai/refine #task/domain/testing #task/object/format-total-time #task/action/fix-i18n-fallback #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修正 `formatTotalTime` 默认翻译函数为 `i18n.t`

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
import { registry } from '../../core/registry';
import {
  type DailySummaryData,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';
~~~~~
~~~~~typescript.new
import { i18n } from '../../core/i18n';
import { registry } from '../../core/registry';
import {
  type DailySummaryData,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
export function formatTotalTime(ms: number, t?: (key: string) => string): string {
  const tr = t || ((k: string) => (k === 'common.zeroTime' ? '0d 0h 0min' : k));
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return tr('common.zeroTime');
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const dUnit = t ? t('common.daysUnit') : 'd ';
  const hUnit = t ? t('common.hoursUnit') : 'h ';
  const mUnit = t ? t('common.minutesUnit') : 'min';

  return `${days}${dUnit}${hours}${hUnit}${minutes}${mUnit}`;
}
~~~~~
~~~~~typescript.new
export function formatTotalTime(ms: number, t: (key: string) => string = i18n.t): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return t('common.zeroTime');
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const dUnit = t('common.daysUnit');
  const hUnit = t('common.hoursUnit');
  const mUnit = t('common.minutesUnit');

  return `${days}${dUnit}${hours}${hUnit}${minutes}${mUnit}`;
}
~~~~~

### 下一步建议

- 执行测试套件验证：运行 `npm run test` 或 `vitest run`，确认 `db.test.ts` 及其他所有测试通过。
- 执行代码质量检查：运行 `npm run check` 确保类型与 Biome 规则完全一致。
