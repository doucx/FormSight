收到，由于在 Vite 研发服务器热更新机制下，直接引用目录名可能会因客户端缓存尝试拉取旧版 `db.ts` 导致 404。我们立即将项目中所有业务模块对数据库的导入路径显式指向 `src/utils/db/index`。

## [WIP] refactor: 规范化更新所有业务模块对 db 模块的显式导入路径

### 用户需求
将全项目中所有引用 `utils/db` 的文件显式更新为 `utils/db/index`，彻底消除 Vite 开发环境下模块解析歧义与 404 资源加载异常。

### 评论
显式指定模块入口文件（`index`）是 ESM 规范与现代打包器最稳健的做法，避免了跨目录解析时对文件扩展名/同名目录的猜测开销与客户端缓存冲突。

### 目标
1. 批量更新 `src/app.tsx`、`src/views/*`、`src/components/*`、`src/hooks/*`、`src/domains/*` 中所有 `utils/db` 导入语句为 `utils/db/index`。
2. 保持项目内所有组件与 hooks 的正常运行与热更新。

### 基本原理
通过将模糊的目录路径或已删除的单文件路径 `'../utils/db'` 明确修改为 `'../utils/db/index'`，使 Vite 的 HMR 与浏览器 ESM 能够精确定位到 `src/utils/db/index.ts`，防止向不存在的 `db.ts` 发起请求。

### 标签
#intent/refine #flow/ready #priority/high
#comp/build #scope/dx #scope/core
#ai/instruct
#task/domain/refactoring
#task/object/import-paths
#task/action/explicit-module-resolution
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 更新应用主入口与视图层的 db 导入

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
~~~~~
~~~~~typescript.new
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db/index';
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
import { type TrainingDomain, formatTotalTime } from '../utils/db';
~~~~~
~~~~~typescript.new
import { type TrainingDomain, formatTotalTime } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
import { saveSession, saveTrialRecord } from '../utils/db';
~~~~~
~~~~~typescript.new
import { saveSession, saveTrialRecord } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
import { getProfile } from '../utils/db';
~~~~~
~~~~~typescript.new
import { getProfile } from '../utils/db/index';
~~~~~

#### Acts 2: 更新配置、类型与 Hooks 中的 db 导入

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../utils/db';
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../utils/db';
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../utils/db';
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../utils/db';
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript.old
import { type TrainingDomain, getTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript.new
import { type TrainingDomain, getTrialRecords } from '../utils/db/index';
~~~~~

#### Acts 3: 更新全局弹窗与设置组件的 db 导入

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
import { clearAllData, exportAllData, importAllData } from '../utils/db';
~~~~~
~~~~~typescript.new
import { clearAllData, exportAllData, importAllData } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
import { type TrainingDomain, getTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript.new
import { type TrainingDomain, getTrialRecords } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
import type { UnifiedTrialRecord } from '../utils/db';
~~~~~
~~~~~typescript.new
import type { UnifiedTrialRecord } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript.old
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db';
~~~~~
~~~~~typescript.new
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db/index';
~~~~~

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../../utils/db';
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../../utils/db/index';
~~~~~

#### Acts 4: 更新分析模块与工具层的 db 导入

~~~~~act
patch_file
src/domains/color/analytics.tsx
~~~~~
~~~~~typescript.old
import { getTrialRecordsByCard } from '../../utils/db';
~~~~~
~~~~~typescript.new
import { getTrialRecordsByCard } from '../../utils/db/index';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/analytics.tsx
~~~~~
~~~~~typescript.old
import { getTrialRecordsByCard } from '../../utils/db';
~~~~~
~~~~~typescript.new
import { getTrialRecordsByCard } from '../../utils/db/index';
~~~~~

~~~~~act
patch_file
src/domains/star/analytics.tsx
~~~~~
~~~~~typescript.old
import { getTrialRecordsByCard } from '../../utils/db';
~~~~~
~~~~~typescript.new
import { getTrialRecordsByCard } from '../../utils/db/index';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
import type { UnifiedTrialRecord } from '../db';
~~~~~
~~~~~typescript.new
import type { UnifiedTrialRecord } from '../db/index';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
import type { UnifiedTrialRecord } from '../db';
~~~~~
~~~~~typescript.new
import type { UnifiedTrialRecord } from '../db/index';
~~~~~

### 下一步建议
1. 刷新浏览器页面，确认 404 告警已消除。
2. 推进下一阶段重构：封装通用 `<CanvasView />` 与 2AFC 泛型交互壳，进一步精简重复代码。
