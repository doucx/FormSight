这是一个由于在无索引签名（Index Signature）的字面量对象上使用可能为空字符串的 key (`size || ''`) 进行索引而引起的 TypeScript 类型检查错误。

我将生成一个计划，使用安全的三元条件判断来索引 `size` 对应的样式映射，以消除该类型报错。

## [WIP] fix: 修复 ColorSwatch 中 sizeStyles 的类型索引错误

### 错误分析
TypeScript 报告错误 `TS2339: Property '' does not exist on type '{ sm: string; md: string; lg: string; full: string; }'`。
- **原因分析**: `size` 属性是可选的（类型为 `'sm' | 'md' | 'lg' | 'full' | undefined`）。代码中使用 `[size || '']` 尝试在未传 `size` 时回退到空字符串 `''`。但内联对象字面量只定义了 `sm`、`md`、`lg` 和 `full` 四个键，并不存在空字符串 `''` 键，因此在 TypeScript 严格类型检查下判定索引越界报错。
- **解决方案**: 将索引改写为三元表达式 `size ? { ... }[size] : ''`。当 `size` 存在时，其被类型收窄为合法键；当 `size` 为 `undefined` 时直接返回空字符串，既安全又符合原有逻辑。

### 用户需求
修复 `src/components/common/ColorSwatch.tsx` 中的类型错误，使 TypeScript 类型检查正常通过。

### 评论
这是一个常见的 TypeScript 对象属性访问模式问题。通过基于条件守卫（三元表达式或映射抽取）来收窄联合类型，能够保持代码简洁的同时满足严格模式检查。

### 目标
1. 修改 `src/components/common/ColorSwatch.tsx` 中的 `sizeStyles` 索引计算逻辑。
2. 消除 TS2339 错误，确保类型检查与代码逻辑行为一致。

### 基本原理
当 `size` 未传入时直接短路返回空字符串 `''`；仅当 `size` 有值时才访问尺寸字典。此时 TypeScript 能够准确推断 `size` 为 `'sm' | 'md' | 'lg' | 'full'`，确保索引完全类型安全。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/type #scope/dx #ai/instruct #task/domain/ui #task/object/color-swatch #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `ColorSwatch.tsx` 的属性索引逻辑

我们将修改 `ColorSwatch.tsx` 中 `sizeStyles` 的取值方式，使用三元运算符在确保 `size` 存在时再进行对象索引。

~~~~~act
patch_file
src/components/common/ColorSwatch.tsx
~~~~~
~~~~~tsx
  const sizeStyles =
    {
      sm: 'w-16 h-16',
      md: 'w-20 h-20',
      lg: 'w-32 h-32',
      full: 'w-full h-full',
    }[size || ''] || '';
~~~~~
~~~~~tsx
  const sizeStyles = size
    ? {
        sm: 'w-16 h-16',
        md: 'w-20 h-20',
        lg: 'w-32 h-32',
        full: 'w-full h-full',
      }[size]
    : '';
~~~~~

### 下一步建议
- 重新运行类型检查命令（例如 `npx tsc --noEmit` 或项目构建命令），确认 `ColorSwatch.tsx` 中的类型错误已被完全消除。
- 检查是否存在其他类似的可选属性对象查表模式，统一为安全的类型收窄写法。
