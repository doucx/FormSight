已精确定位问题原因：在上一轮对 `GlobalSettingsModal.tsx` 进行重构以同步 `settings` 时，组件内部引入了 `useEffect` 钩子，但头部从 `'preact/hooks'` 中遗漏了解构导入 `useEffect`。这导致当用户点击设置按钮触发 `setIsGlobalSettingsOpen(true)` 挂载组件时，抛出 `ReferenceError: useEffect is not defined` 运行时异常，从而导致弹窗无法打开。

下面立即修复此导入问题。

## [WIP] fix: 补全 GlobalSettingsModal 中 preact/hooks 的 useEffect 导入

### 错误分析
在 `GlobalSettingsModal.tsx` 中增加了对外部 `externalSettings` 变动的 `useEffect` 监听，但顶部只从 `'preact/hooks'` 导入了 `useState`。当设置弹窗被点击触发挂载时，会触发 `ReferenceError: useEffect is not defined` 阻断渲染，导致全局设置弹窗无法正常弹出。

### 用户需求
修复设置弹窗组件运行时的未定义钩子异常，恢复桌面端侧边栏、移动端底栏等各入口设置按钮的正常交互与弹窗展开功能。

### 评论
必须确保所有新增 Hook 均完整引入，消除打包和运行时的作用域引用错误。

### 目标
在 `src/components/GlobalSettingsModal.tsx` 顶部补全 `useEffect` 的解构导入。

### 基本原理
从 `'preact/hooks'` 中显式导入 `useEffect`，使 `GlobalSettingsModal` 在挂载和响应外部 `settings` 变更时能够正常执行副作用监听。

### 标签
#intent/fix #flow/ready #priority/critical #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/global-settings-modal #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 在 `GlobalSettingsModal.tsx` 中补齐 `useEffect` 导入

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
~~~~~

### 下一步建议
1. **交互验证**: 点击侧边栏底部的“全局设置”按钮，验证弹窗能否立即顺畅打开。
2. **主题切换验证**: 在弹窗内点击“浅色”、“深色”及“跟随系统”，验证主题是否能实时同步切换。
3. **完成提交**: 验证通过后，请指示我生成 `[COMMIT]` 计划以完成本次修复单元的归档。
