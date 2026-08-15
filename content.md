由于在 `oklchToHex` 函数中，OKLab 极坐标转换步骤声明了 `const b`，而在后续转 sRGB 的步骤中又再次声明了 `const b`，导致变量名冲突与构建编译错误。

下面为您生成修复该变量命名冲突的 `[WIP]` 计划：

## [WIP] fix(color): 修复 oklchUtils.ts 中 b 变量重复声明的编译错误

### 错误分析

**错误原因**：
在 `oklchUtils.ts` 的 `oklchToHex` 函数中：
1. 顶部在计算 OKLab 极坐标成分时使用了 `const b = C * Math.sin(rad)`；
2. 底部在转换 sRGB RGB 8-bit 分量时又使用了 `const b = Math.round(toSRGB(bLin) * 255)`；

在同一个函数作用域内二次使用 `const b` 进行变量声明引发了 TypeScript/Vite 构词解析器抛出 `The symbol "b" has already been declared` 的 Error。

**解决方案**：
将 OKLab 坐标成分命名重构为 `aLab` 和 `bLab`（与文件中已有的 `hsvToOkLab` 保持统一的命名风格），从而消除与最终 sRGB 蓝色分量 `b` 的命名碰撞。

### 用户需求
修复 Vite 打包/开发服务器提示的 `oklchUtils.ts` 变量 `b` 重复声明错误，恢复项目的正常编译与运行。

### 评论
变量重命名属于非破坏性局部修补，重命名为 `aLab`/`bLab` 能提高代码语义清晰度，彻底解决符号冲突。

### 目标
1. 修改 `src/utils/oklchUtils.ts` 中的 `oklchToHex` 函数，将 OKLab 色彩成分重命名为 `aLab` 和 `bLab`。
2. 确保项目能成功编译并通过构建检查。

### 基本原理
通过将 OKLab 分量重命名为 `aLab` / `bLab`，使得在同一个函数体作用域内 `bLab`（OKLab 黄青色轴）与 `b`（sRGB 蓝色通道）拥有唯一的符号标识，解决 JavaScript/TypeScript 语法作用域重名约束。

### 标签
#intent/fix #flow/ready #priority/critical #comp/build #concept/parser #scope/core #ai/instruct #task/domain/color-recognition #task/object/oklch-hue-gradient #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `oklchUtils.ts` 中的变量命名冲突

将 OKLab 轴变量重命名为 `aLab` 与 `bLab`。

~~~~~act
patch_file
src/utils/oklchUtils.ts
~~~~~
~~~~~typescript
/**
 * OKLCH (L: 0..1, C: 0..0.4, H: 0..360) -> OKLab -> Linear RGB -> sRGB HEX
 */
export function oklchToHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  // 1. OKLab -> LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
~~~~~
~~~~~typescript
/**
 * OKLCH (L: 0..1, C: 0..0.4, H: 0..360) -> OKLab -> Linear RGB -> sRGB HEX
 */
export function oklchToHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  const aLab = C * Math.cos(rad);
  const bLab = C * Math.sin(rad);

  // 1. OKLab -> LMS
  const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = L - 0.0894841775 * aLab - 1.291485548 * bLab;
~~~~~

### 下一步建议
- **重新运行开发服务**: 再次尝试 `npm run dev` 或 `npm run build` 确认编译错误已消除。
