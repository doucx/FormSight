好的，我已制定将 `src/domains/` 目录平移并规范化重命名为 `src/packs/` 的重构计划，并同步更新相关组件与配置中的引用路径。

## [WIP] refactor: 将 src/domains 目录平移重命名为 src/packs

### 用户需求
将项目中的 `src/domains/` 目录平移重命名为 `src/packs/`，以完成 FormSight v0.4.x 扩展包架构规范的落地，消除旧分类学术语。

### 评论
该变更符合 v0.4.x 架构演进路线图中的里程碑 2。将物理目录从 `domains` 迁移至 `packs` 能彻底理顺模块的物理组织与分发形态，让代码目录结构与 `PackManifest` 及 `registry` 的自动扫描机制保持高度一致。

### 目标
1. 通过文件系统命令将 `src/domains/` 平移重命名为 `src/packs/`。
2. 更新 `src/components/common/PointClickCanvas.tsx` 中对 `star` 模块的引用路径。
3. 更新 `piconfig.json` 中配置的路径映射。

### 基本原理
由于 `src/core/registry.ts` 已经内置了 `import.meta.glob('../packs/*/index.ts')` 的自动扫描机制，当目录重命名为 `src/packs/` 后，各个扩展包将直接通过 pack 注册通道被自动发现与装载。只需同步修复代码中残留的显式路径引用即可平滑完成切换。

### 标签
#intent/refine #flow/ready #priority/medium #scope/core #ai/instruct #task/domain/architecture #task/object/packs-directory-migration #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 平移重命名目录

将 `src/domains/` 目录移动为 `src/packs/`。

~~~~~act
run_command
~~~~~
~~~~~
mv src/domains src/packs
~~~~~

#### Acts 2: 修复组件中的引用路径

更新 `PointClickCanvas.tsx` 中的引用路径，将其指向 `src/packs/`。

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { findNearestGridPoint } from '../../domains/star/utils/hitDetection';
import type { Point } from '../../types';
~~~~~
~~~~~tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';
~~~~~

#### Acts 3: 更新预设配置文件中的路径映射

更新 `piconfig.json` 中的 `paths` 数组，将 `src/domains/` 替换为 `src/packs/`。

~~~~~act
patch_file
piconfig.json
~~~~~
~~~~~json
        "src/components/common/Standard2AfcView.tsx",
        "src/components/common/StandardNafcView.tsx",
        "src/domains/angle/index.ts",
        "src/domains/angle/plugin.tsx",
        "src/domains/angle/views/AngleCanvas.tsx",
        "src/domains/angle/components/AngleEstimationView.tsx",
        "src/domains/angle/components/AngleComparison2AfcView.tsx",
        "src/domains/angle/utils/angleUtils.ts"
      ]
~~~~~
~~~~~json
        "src/components/common/Standard2AfcView.tsx",
        "src/components/common/StandardNafcView.tsx",
        "src/packs/angle/index.ts",
        "src/packs/angle/plugin.tsx",
        "src/packs/angle/views/AngleCanvas.tsx",
        "src/packs/angle/components/AngleEstimationView.tsx",
        "src/packs/angle/components/AngleComparison2AfcView.tsx",
        "src/packs/angle/utils/angleUtils.ts"
      ]
~~~~~

### 下一步建议
1. 运行 `npm run check` 或 `npm run test` 确保所有类型检查与单元测试通过。
2. 在确认功能运行无误后，可以创建独立的 `[COMMIT]` 计划将此次架构重构变更进行提交。
