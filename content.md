## [WIP] refactor(ui): 移除答题结果提示卡片并优化真理色彩对比展示样式

### 错误分析

无错误，本次为 UI 样式的进一步重构与精细调整。

### 用户需求

1. 彻底删除回答揭晓后的诊断提示卡片（包含 `✅ 矢量匹配成功！`、感知色差 ΔE、矢量模长差、色温偏角等文字信息的 `div`）。
2. 修改目标色块 D 在揭晓答案时的对比样式：
   - 将“真理色彩 D”从原本浮在下方的圆形指示点，改为直接占据“待调色 D”色块的**下半部分**（即上半部分显示用户调出的颜色，下半部分显示真理色彩）。
   - 色块整体及上下两半之间**不能有白色间隔**（无 gap、无内边框/白色内分割线）。

### 评论

采用上下平分（Top/Bottom split）的对比方式，能够使用户无需任何文字干扰，最直观地看到调色结果与真理色彩在缝隙拼接处的颜色微小差别。

### 目标
1. 删除 `RelativeColorCanvas.tsx` 中的答案诊断数据提示卡片。
2. 将待调色 D 色块调整为：
   - 容器保持 `w-28 h-28 rounded-2xl`，设置 `overflow-hidden`。
   - 上半部分 `h-1/2` 显示用户调出的预览色（或者揭晓后上半部分是用户色，下半部分是真理色）。
   - 当 `showAnswer` 为 true 时，在下半部分渲染 `h-1/2 w-full` 的真理色彩色块 `hexTargetD`，上下紧密拼接，中间无白色间隔。

### 基本原理

通过改写 `RelativeColorCanvas.tsx` 中 `D` 色块的内部 DOM 结构，当 `showAnswer` 为 true 时利用 flex 或 absolute 布局，将 `hexTargetD` 填充至容器下半区域 `bottom-0 left-0 right-0 h-1/2`，并移除内框/圆点样式，即可做到无缝对比。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-canvas #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 移除诊断数据卡片，改写 D 色块为上下无缝分割对比

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~tsx.old
        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-6 h-6 text-indigo-400" />
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative"
              style={{ backgroundColor: hexUserD }}
            >
              {showAnswer && (
                <div
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: hexTargetD }}
                  title="真理色彩 D"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 揭晓答案诊断数据 */}
      {showAnswer && userAnswer && (
        <div
          className={`w-full p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
            userAnswer.isHit
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="font-bold">
            {userAnswer.isHit ? '✅ 矢量匹配成功！' : '❌ 矢量偏转较大'}
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>感知色差 ΔE: {userAnswer.deltaEError}</span>
            <span>矢量模长差: {userAnswer.magnitudeError}</span>
            <span>色温偏角: {userAnswer.angleErrorDeg}°</span>
          </div>
        </div>
      )}

      {/* 下方 D 颜色调制滑块轨道 (使用通用 HsvTrackSlider) */}
~~~~~
~~~~~tsx.new
        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-6 h-6 text-indigo-400" />
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative overflow-hidden"
              style={{ backgroundColor: hexUserD }}
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
      </div>

      {/* 下方 D 颜色调制滑块轨道 (使用通用 HsvTrackSlider) */}
~~~~~

### 下一步建议

- 在揭晓答案时，D 色块上边将呈现用户调出的颜色，下边无缝显示绝对真理色，直接通过两条色彩接缝评估感知准确度。
- 可以继续运行单元测试或启动开发服务测试体验。
