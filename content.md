我将通过一个工作计划彻底解决该问题，直接从底层基础组件 `ChoiceCard` 中剔除 `faded` 状态的 `opacity-50` 样式，杜绝一切级联半透明混色，同时优化环境穿透模块在答案揭晓时的纯平中性背景呈现。

## [WIP] fix: 彻底移除 ChoiceCard faded 状态的透明度衰减以消除色偏

### 错误分析
1. **根本原因**：`src/components/ui/choice-card.tsx` 中定义 `faded` 状态样式为 `'bg-muted/40 border-border opacity-50 cursor-default pointer-events-none'`。
2. **级联破坏**：CSS 的 `opacity` 属性会在父级元素上创建层叠上下文。当选择题揭晓答案时，未选中的非目标选项被置为 `faded`，导致父容器被强制施加 `opacity: 0.5`。由于透明度的层叠继承性，卡片内包含的任何色块（如 `ColorSwatch`、Canvas、SVG）都连带变成了 50% 半透明，并与底层卡片背景产生减法混色（Subtractive Color Mixing），造成严重色相漂移、明度损失以及两边背景一黑一灰的视觉割裂。

### 用户需求
完全消除 `ChoiceCard` 上的透明度 `faded` 效果，避免所有与色彩、明度相关的卡片在揭晓答案时因透明度级联导致色彩真值失真。

### 评论
在视知觉与心理物理学测试中，色块的物理属性（HSV/RGB）呈现必须保持 100% 绝对中立与保真。通过从通用基础基元中彻底剥离 `opacity-50`，能够一劳永逸地保障整套系统中所有选择题型卡片视觉色彩的严格一致性。

### 目标
1. 修改 `src/components/ui/choice-card.tsx`，将 `faded` 变体中的 `opacity-50` 彻底移除，保留不可交互与中性静态边框特性。
2. 在 `src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx` 中，优化揭晓答案时的背景内阴影处理，避免边缘二次明度衰减。

### 基本原理
直接修改公共组件 `choiceCardVariants` 中的 `faded` 样式定义，使其仅保留 `bg-muted/40 border-border cursor-default pointer-events-none`。由于没有了 `opacity` 衰减，子树内的所有像素均能保持 100% 物理真值渲染；在视觉语义上，未选中项通过缺失高亮外环与纯中立边框自然表达落选状态，完全满足交互设计与物理色彩真值的双重规范。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/core #ai/instruct #task/domain/ui #task/object/choice-card-opacity #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 移除 ChoiceCard faded 变体中的 opacity-50

~~~~~act
patch_file
src/components/ui/choice-card.tsx
~~~~~
~~~~~typescript
        wrong: 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm cursor-default',
        faded: 'bg-muted/40 border-border opacity-50 cursor-default pointer-events-none',
      },
~~~~~
~~~~~typescript
        wrong: 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm cursor-default',
        faded: 'bg-muted/40 border-border cursor-default pointer-events-none',
      },
~~~~~

#### Acts 2: 优化环境穿透卡片在揭晓时的纯平黑色背景呈现

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgA}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterA} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgB}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterB} variant="embedded" size="sm" />
          </ColorSwatch>
~~~~~
~~~~~typescript
          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgA}
            variant="container"
            className={`w-full h-44 ${showAnswer ? '' : 'shadow-inner'}`}
          >
            <ColorSwatch color={hexCenterA} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgB}
            variant="container"
            className={`w-full h-44 ${showAnswer ? '' : 'shadow-inner'}`}
          >
            <ColorSwatch color={hexCenterB} variant="embedded" size="sm" />
          </ColorSwatch>
~~~~~

### 下一步建议
1. 执行测试用例并实际在浏览器中体验 `rel_decontextual_2afc`，验证答题揭晓时两张卡片背景是否均呈现 100% 相同且纯正的平黑基准色。
2. 检查其他涉及选择交互的色彩卡片（如多选一辨色、色调判别等），确保其在揭晓答案时同样保持无衰减的色彩真值。
