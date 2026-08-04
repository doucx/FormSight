好的，我将为你为本项目（FormSight）配置 Biome 代码格式化与 Linter 工具。

## [WIP] chore: 为项目配置 Biome 代码格式化与 Linter 工具

### 用户需求
在项目中集成 Biome 工具链，配置 `biome.json` 规则文件，并在 `package.json` 中添加 `@biomejs/biome` 依赖以及相应的辅助脚本（如 `lint`、`format`、`check`、`checkf`）。

### 评论
配置 Biome 能够显著提升项目代码的一致性、格式化速度以及 Lint 检查效率，改善代码质量与开发体验 (DX)。

### 目标
1. 在项目根目录下创建 `biome.json` 配置文件。
2. 在 `package.json` 中添加 `@biomejs/biome` 依赖与相关操作脚本。

### 基本原理
通过在项目根目录提供统一的 `biome.json` 配置文件，Biome 可以快速分析并格式化前端代码库（包含 TypeScript/JSX 等）。在 `package.json` 的 `scripts` 中新增对应的管理命令后，开发者可以通过简单的 npm 脚本触发代码格式化与合规性检查。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/instruct #task/domain/tooling #task/object/biome-config #task/action/setup #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 `biome.json` 配置文件

在项目根目录下新建 `biome.json`，配置常规文件忽略规则、导入排序、格式化样式与 Lint 规则。

~~~~~act
write_file
biome.json
~~~~~
~~~~~json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "files": {
    "ignore": ["dist/**", "node_modules/**", "coverage/**"]
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100,
    "attributePosition": "auto"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
~~~~~

#### Acts 2: 更新 `package.json` 脚本与开发依赖

在 `package.json` 的 `scripts` 中添加 `lint`、`format`、`check` 和 `checkf` 命令，并在 `devDependencies` 中加入 `@biomejs/biome` 依赖。

~~~~~act
patch_file
package.json
~~~~~
~~~~~json.old
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
~~~~~
~~~~~json.new
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "biome lint .",
    "format": "biome format . --write",
    "check": "biome check --write .",
    "checkf": "biome check --fix --unsafe ."
  },
  "dependencies": {
~~~~~

~~~~~act
patch_file
package.json
~~~~~
~~~~~json.old
  "devDependencies": {
    "@preact/preset-vite": "^2.8.2",
~~~~~
~~~~~json.new
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@preact/preset-vite": "^2.8.2",
~~~~~

### 下一步建议
1. 运行 `npm install` 来安装 `@biomejs/biome` 开发依赖。
2. 运行 `npm run check` 检查当前项目中的所有代码格式与 Lint 警告，并自动修正可修复项。
