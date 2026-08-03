完全同意你的建议。在开启自动翻页模式下，画板本身已直观提供了击中/偏差的视觉指示，底部提示文字属于冗余信息；并且由于答题后会自动跳转，底部的“下一题”控制栏在自动翻页模式下也是不需要的。

我们将按以下原则优化 `TrainingView.tsx`：
1. **彻底移除** 训练视图底部的文本/数值答题反馈组件（包括“击中/偏差”图标及像素偏差值）。
2. **条件渲染底部控制栏**：仅当 `settings.autoNext === false`（手动翻页模式）时，才渲染包含“下一题”按钮的底部控制栏。
3. **清理无用代码**：移除已不再使用的 `CheckCircle2` 和 `XCircle` 图标导入，避免触发 Strict 模式下的 `noUnusedLocals` 校验。

## [WIP] refactor(ui): 移除自动翻页时的底部按钮与答题反馈

### 用户需求
1. 在“自动翻页”设置开启时，训练界面隐去底部的“下一题”按钮控制栏。
2. 彻底删除底部的“击中/偏差”及像素距离数值文本反馈，仅保留 Canvas 画板上的图形视觉反馈。
3. 仅在“自动翻页”关闭（手动翻页模式）时，才保留显示“下一题”操作按钮。

### 评论
该重构能够进一步精简训练界面，减少不必要的 UI 视觉噪音，使用户能更加专注于几何感知的直觉训练，同时提升自动翻页模式下的流畅度。

### 目标
1. 修改 `src/views/TrainingView.tsx`，移除底部的文本答题反馈。
2. 给底部操作面板添加 `!settings.autoNext` 条件渲染逻辑。
3. 清理无用的图标导入，确保 TypeScript 编译通过。

### 基本原理
通过读取 `settings.autoNext` 配置，在自动翻页开启时直接不挂载底部栏 DOM 元素。由于 `StarCanvas` 内部在答题后已通过深绿色十字高亮和红色虚线精准标注了真理点与错误偏差，去除冗余的文字反馈不会影响训练体验。

### 标签
#intent/refine #flow/ready #priority/medium #concept/ui #scope/ux #ai/instruct

---

### Script

#### Acts 1: 移除底部答题反馈并按设置条件渲染“下一题”操作栏

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~python.old
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
~~~~~
~~~~~python.new
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~python.old
      {/* 底部操作与简略反馈 */}
      <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-between min-h-[56px]">
        <div>
          {showAnswer && userAnswer && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                  userAnswer.hitResult.isHit
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {userAnswer.hitResult.isHit ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {userAnswer.hitResult.isHit ? '击中' : '偏差'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {userAnswer.hitResult.errorDistance} px
              </span>
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={handleFinishSession}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
          >
            完成并退出
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!showAnswer}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
              showAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            下一题
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
~~~~~
~~~~~python.new
      {/* 底部操作面板（仅在未开启自动翻页时显示） */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              onClick={handleFinishSession}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并退出
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
~~~~~

### 下一步建议
1. 运行项目构建命令（如 `npm run build`）测试验证类型检查与包打逻辑。
2. 进入浏览器验证在切换“训练偏好设置”中的自动翻页开关时，界面交互及底部控件的显隐效果。
