好的，我们立即实施对“环境穿透判别 (2AFC)”题目生成逻辑的重构，彻底解耦背景明暗与目标答案的必然联系。

## [WIP] fix(relative-color): 解耦 2AFC 模式背景与真理的绑定关系以封堵作弊漏洞

### 错误分析
在 `generateDecontextual2AfcQuestion` 中，原算法为了构造最大视错觉反差，将物理上更亮的中心色固定放在更亮的背景上（即 `bgLeftVal = largerPhysicalSide === 'A' ? brightBgVal : darkBgVal`）。
* **根本原因**：背景亮度与正确答案之间存在 100% 的强相关性，构成了心理物理学实验中的“刺激物混淆（Confounding Stimuli）”。
* **漏洞后果**：用户无需关注中心色块，只需机械化选择背景更亮的那一侧即可保证 100% 正确率，导致视错觉穿透训练完全失效。

### 用户需求
修复 2AFC 环境穿透判别模式中的作弊漏洞，使得背景明暗无法作为预测正确答案的线索，强迫用户真正运用视觉感知去判别中心色块的物理明度。

### 评论
通过引入 50% 陷阱组（Trap Trial）与 50% 对照组（Control Trial）的随机化分流，彻底打破了背景明暗与中心真理之间的统计相关性。用户无论顺应视错觉还是根据背景特征做元猜测，都只能获得 50%（瞎蒙）的命中率，唯有真正看穿中心色块物理值才能稳定提升胜率通关。

### 目标
1. 在 `src/utils/relativeColorUtils.ts` 的 `generateDecontextual2AfcQuestion` 中引入 `isTrapTrial` 随机布尔标志。
2. 50% 概率生成陷阱题（物理更亮者置于更亮背景上，产生逆向视错觉）。
3. 50% 概率生成对照题（物理更亮者置于更暗背景上，产生同向强化）。

### 基本原理
背景分配逻辑改造为：
```typescript
const isTrapTrial = Math.random() < 0.5;
const sideForBrightBg = isTrapTrial
  ? largerPhysicalSide
  : (largerPhysicalSide === 'A' ? 'B' : 'A');
```
由此使得 $P(\text{BrightBg} \mid \text{Target}) = 0.5$，消除任何单一背景特征带来的信息泄漏。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/color #task/object/decontextual-2afc-logic #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 重构 `relativeColorUtils.ts` 中的 2AFC 题型生成器

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

  // 构造视错觉陷阱：物理更亮的一侧放在更亮的背景上（被压暗），物理更暗的一侧放在暗背景上（被提亮）
  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;

  const bgLeftVal = largerPhysicalSide === 'A' ? brightBgVal : darkBgVal;
  const bgRightVal = largerPhysicalSide === 'B' ? brightBgVal : darkBgVal;
~~~~~
~~~~~typescript
  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

  // 随机化陷阱/对照分布：50% 概率为陷阱题（更亮放更亮背景），50% 概率为对照题（更亮放更暗背景）
  // 彻底解耦背景明暗与目标答案，防止通过选亮背景作弊
  const isTrapTrial = Math.random() < 0.5;
  const sideForBrightBg: 'A' | 'B' = isTrapTrial
    ? largerPhysicalSide
    : largerPhysicalSide === 'A'
      ? 'B'
      : 'A';

  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;

  const bgLeftVal = sideForBrightBg === 'A' ? brightBgVal : darkBgVal;
  const bgRightVal = sideForBrightBg === 'B' ? brightBgVal : darkBgVal;
~~~~~

### 下一步建议
1. 在本地重新进入“环境穿透判别 (2AFC)”进行 10~20 题的连续实战，验证亮背景与暗背景是否已呈现均匀的 50/50 分布。
2. 体验在陷阱题与对照题交替出现时，视觉系统对抗错觉的真实心流体验。
