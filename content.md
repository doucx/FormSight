已定位问题根因：在 TypeScript 严格模式下，具有明确属性定义的接口类型（如 `StarSettings`）由于缺少通用索引签名 `[key: string]: unknown`，直接传给 `Record<string, unknown>` 时会触发类型赋值不兼容错误。

我将生成一个计划来修复该类型问题。

## [WIP] fix: 修复 SettingsModal 向 DynamicDomainSettings 传参时的索引签名类型不兼容

### 错误分析
TypeScript 严格类型检查下，`domainSettings` 的联合类型 `StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings` 是具体的强类型接口，未声明自由索引签名 `[key: string]: unknown`。当将其直接传递给期望接收 `Record<string, unknown>` 的 `DynamicDomainSettings` 的 `values` 属性时，编译器报告 `TS2322: Index signature for type 'string' is missing in type 'StarSettings'`。

### 用户需求
解决 `SettingsModal.tsx` 中的类型断言/传递问题，确保 TypeScript 编译 (`tsc && vite build`) 能够顺利通过。

### 评论
该问题属于前端通用 Schema-Driven 表单在强类型与动态 Key 访问之间的常见类型收窄问题。通过在调用处进行安全的类型转换，或者在动态组件处放宽受限类型约束，即可在保留运行时安全性的同时消除编译错误。

### 目标
在 `SettingsModal.tsx` 中将 `domainSettings` 显式转换为 `Record<string, unknown>`，消除 `TS2322` 编译报错。

### 基本原理
`DynamicDomainSettings` 作为通用的表单渲染器，接收动态字段键名读取属性；而 `domainSettings` 为强类型实体对象。在组件调用边界处通过 `as unknown as Record<string, unknown>` 进行安全桥接，既不破坏组件内部类型推导，也符合 TypeScript 针对动态属性读写的标准处理范式。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/core #ai/instruct #task/domain/build #task/object/typecheck-and-lint #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 修正 `SettingsModal.tsx` 中向 `DynamicDomainSettings` 传参的类型转换

在 `SettingsModal.tsx` 中为 `domainSettings` 添加类型转换，适配 `DynamicDomainSettings` 的参数要求。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
        {/* 渲染特定领域的表单 (Schema 驱动) */}
        {DOMAIN_SETTING_SCHEMAS[domain] && (
          <DynamicDomainSettings
            schemas={DOMAIN_SETTING_SCHEMAS[domain]}
            values={domainSettings}
            onChange={(patch) => updateDomainSettings(patch)}
          />
        )}
~~~~~
~~~~~typescript.new
        {/* 渲染特定领域的表单 (Schema 驱动) */}
        {DOMAIN_SETTING_SCHEMAS[domain] && (
          <DynamicDomainSettings
            schemas={DOMAIN_SETTING_SCHEMAS[domain]}
            values={domainSettings as unknown as Record<string, unknown>}
            onChange={(patch) => updateDomainSettings(patch)}
          />
        )}
~~~~~

### 下一步建议
1. 再次执行 `npm run build` 验证 TypeScript 编译是否已全部通过；
2. 执行 `npm run checkf` 确保 Biome linter 规则无违规。
