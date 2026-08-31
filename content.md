这 3 处位于 `src/utils/__tests__/` 测试目录中，在 `utils/db/` 与 `utils/settings.ts` 提升至 `src/storage/` 顶层后，测试文件的引用路径需相应由 `../db` 和 `../settings` 更新为 `../../storage/db` 和 `../../storage/settings`。

我们立即对这 3 个测试文件进行路径修复，并再次执行全量扫描与测试检查。

## [WIP] fix: 修复单元测试文件中的持久化模块引用路径

### 错误分析
测试文件 `src/utils/__tests__/db.test.ts`、`settings.test.ts` 和 `sound.test.ts` 依然保留了指向旧 `src/utils/db/` 及 `src/utils/settings.ts` 的相对路径，随着仓储层重构提升至 `src/storage/`，测试文件的引用路径需相应调整为 `../../storage/`。

### 用户需求
修复 `src/utils/__tests__/` 下三个测试用例的 import 相对引用。

### 评论
测试用例是保障项目重构无损迁移的关键防线，修复后可确保单元测试套件全部绿灯通过。

### 目标
1. 修复 `src/utils/__tests__/db.test.ts` 的导入路径。
2. 修复 `src/utils/__tests__/settings.test.ts` 的导入路径。
3. 修复 `src/utils/__tests__/sound.test.ts` 的导入路径。
4. 运行 `python3 scripts/check_imports.py` 和 `npm run checkf` 确保 0 报错。

### 基本原理
将测试代码中的相对导入路径从 `../db` 与 `../settings` 更新为 `../../storage/db` 与 `../../storage/settings`。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/state #scope/dx #ai/instruct #task/domain/testing #task/object/test-imports #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `src/utils/__tests__/` 下测试文件的导入路径

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript.old
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllProfiles,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  importAllData,
  saveSession,
  saveTrialRecord,
} from '../db';
import type { UnifiedSessionData, UnifiedTrialRecord } from '../db/schema';
~~~~~
~~~~~typescript.new
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllProfiles,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  importAllData,
  saveSession,
  saveTrialRecord,
} from '../../storage/db';
import type { UnifiedSessionData, UnifiedTrialRecord } from '../../storage/db/schema';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript.old
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getCardSettings, loadSettings, saveSettings } from '../settings';

describe('settings utils with card-scoped isolation', () => {
~~~~~
~~~~~typescript.new
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getCardSettings, loadSettings, saveSettings } from '../../storage/settings';

describe('settings utils with card-scoped isolation', () => {
~~~~~

~~~~~act
patch_file
src/utils/__tests__/sound.test.ts
~~~~~
~~~~~typescript.old
import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../settings';
import { playHitSound, playMissSound } from '../sound';
~~~~~
~~~~~typescript.new
import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../../storage/settings';
import { playHitSound, playMissSound } from '../sound';
~~~~~

### 下一步建议
1. **运行单元测试套件**：执行 `npx vitest run`（或 `npm test`）验证所有测试用例通过。
2. **提交与归档**：在所有验证通过后，若准备好提交，可向我发送提交指令以创建 `[COMMIT]` 计划。
