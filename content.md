已为你准备好配置 Vitest 及相关 npm 脚本的计划。

## [WIP] feat: 为项目配置 Vitest 测试框架与脚本

### 用户需求
为 FormSight 项目配置 Vitest 测试工具链，并在 `package.json` 的 `scripts` 中添加 `"test": "vitest"` 与 `"test:coverage": "vitest run --coverage"` 命令。

### 评论
配置 Vitest 可以为当前的视觉与色彩算法模块（如 `geometry.ts`、`colorUtils.ts` 及 `adaptiveEngine.ts`）提供高质量的单元测试与覆盖率报告保障，提升代码健壮性与可维护性。

### 目标
1. 在 `package.json` 中配置 `test` 和 `test:coverage` 脚本指令。
2. 添加 `vitest` 与 `@vitest/coverage-v8` 依赖包声明。
3. 更新 `vite.config.ts` 以集成 Vitest 的 `test` 配置选项。

### 基本原理
Vitest 与 Vite 共享相同的插件和转换配置，使用 `vitest/config` 的 `defineConfig` 函数可以在不需要增加额外配置文件的情况下优雅地配置测试选项，保证构建与测试规则的一致性。

### 标签
#intent/build #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/instruct #task/domain/testing #task/object/vitest-setup #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 package.json 脚本与测试依赖

添加 `"test"` 与 `"test:coverage"` 脚本，并将 `vitest` 及 `@vitest/coverage-v8` 加入 `devDependencies`。

~~~~~act
patch_file
package.json
~~~~~
~~~~~json.old
    "lint": "biome lint .",
    "format": "biome format . --write",
    "check": "biome check --write .",
    "checkf": "biome check --fix --unsafe ."
  },
  "dependencies": {
    "idb": "^8.0.0",
    "lucide-preact": "^0.344.0",
    "preact": "^10.19.6"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@preact/preset-vite": "^2.8.2",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4"
  }
~~~~~
~~~~~json.new
    "lint": "biome lint .",
    "format": "biome format . --write",
    "check": "biome check --write .",
    "checkf": "biome check --fix --unsafe .",
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "idb": "^8.0.0",
    "lucide-preact": "^0.344.0",
    "preact": "^10.19.6"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@preact/preset-vite": "^2.8.2",
    "@vitest/coverage-v8": "^1.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4",
    "vitest": "^1.3.1"
  }
~~~~~

#### Acts 2: 更新 vite.config.ts 以集成 Vitest 配置

导入 `vitest/config` 并添加 `test` 选项配置。

~~~~~act
patch_file
vite.config.ts
~~~~~
~~~~~typescript.old
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});
~~~~~
~~~~~typescript.new
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
~~~~~

### 下一步建议
1. 运行 `npm install` 安装新增的测试依赖。
2. 在 `src/utils/` 下尝试编写测试样例（如针对 `geometry.ts` 中的点运算、极坐标网格生成的单元测试 `src/utils/__tests__/geometry.test.ts`）。
3. 运行 `npm run test` 或 `npm run test:coverage` 验证测试套件运行正常。
