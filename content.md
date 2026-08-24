好的，我们将精简 `VectorShiftView` 组件，移除其中展示的两组只读/联动 HSV 滑块及相关的渐变与变量计算，大幅降低卡片高度，让用户聚焦于 A➔B 与 C➔D 色块推移比对。

## [WIP] refactor(relative-color): 移除 VectorShiftView 中的冗余 HSV 滑块

### 用户需求
在色彩矢量迁移卡片（`VECTOR_SHIFT` 模式）中去除展示的两组 HSV 滑块，优化信息密度与视觉层级。

### 评论
在“色彩矢量迁移”题型中，核心考点是通过视觉直觉捕捉固有色推移矢量 $\vec{v}_{AB}$ 并映射到 $C \to D$。下方展示的 6 条静态/联动 HSV 轨不仅占用了超过 300px 的纵向空间导致移动端严重需要滚动，还削弱了用户依靠纯视觉对比色彩推移的直觉训练目的。移除后能让界面更紧凑、专注。

### 目标
1. 从 `VectorShiftView.tsx` 中移除 `HsvTrackSlider` 的导入与 `middleContent` 渲染插槽。
2. 清理相关的渐变色字符串定义（`hueGradient`, `satGradient`, `valGradient`, `cSatGradient`, `cValGradient`）与未使用变量。
3. 保持组件接口兼容性与 4-AFC 候选项切换预览功能完整。

### 基本原理
通过直接将 `StandardNafcView` 的 `middleContent` 移除，将视口布局由“色彩预览 ➔ 6 条滑轨 ➔ 候选区”精简为纯粹的“色彩矢量推移预览 ➔ 候选区选择”，在保证状态响应一致性的同时显著降低组件渲染开销与视口占用。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/vector-shift-view #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `VectorShiftView.tsx` 并移除 HSV 滑块代码

~~~~~act
write_file
src/packs/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Shuffle } from 'lucide-preact';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface VectorShiftViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function VectorShiftView({
  question,
  showAnswer,
  selectedIndex,
  onSelectIndex,
  onSubmit,
  disabled = false,
  showCanvasHints = true,
}: VectorShiftViewProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(...activeColor);
  const hexTargetD = hsvToHex(...targetD);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText="观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIndex}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onSelectIndex={(idx) => onSelectIndex(idx)}
      onAnswer={() => onSubmit()}
      preview={
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: hexSelectedD }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: hexTargetD }}
                />
              )}
            </div>
          </div>
        </div>
      }
    />
  );
}
~~~~~

### 下一步建议
1. **测试验证**：启动开发服务器或测试套件，检查相对色感题型中的“色彩矢量迁移”卡片在桌面端和移动端视口下的排版与作答是否流畅。
2. **后续优化**：根据此前分析，推进 `perspective`（比例盲切 Touch 事件支持）或 `star`（触控准星偏移/放大镜）等 P0 移动端适配任务。
