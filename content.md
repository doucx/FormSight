## [WIP] 清除所有正确答案揭晓框

~~~~~act
patch_file
src/components/abstraction/TopDownPatternView.tsx
~~~~~
~~~~~tsx.old
      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '调性基底寻源匹配完全正确！' : '色彩调性感知出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">(正确匹配为: 画面 {targetIdx + 1})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/abstraction/TopDown2AfcView.tsx
~~~~~
~~~~~tsx.old
      {showAnswer && (
        <AnswerDiagnosticBar
          isHit={Boolean(userAnswer?.isHit)}
          successTitle="瞬时结构透视识别完全正确！"
          failTitle="结构透视判断出现偏差"
          subText={`(正确匹配为: 区域 ${userAnswer?.correctChoice ?? (isTargetA ? 'A' : 'B')})`}
        />
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/abstraction/NotanThresholdView.tsx
~~~~~
~~~~~tsx.old
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              最佳素描阈值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {question.idealNotanThreshold}%
              </span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{question.tolerance}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx.new
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/abstraction/GestureAxisView.tsx
~~~~~
~~~~~tsx.old
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {question.targetAngleDeg}
                {unit}
              </span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}
              {unit} (容错: ±{question.tolerance}
              {unit})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx.new
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
~~~~~
~~~~~tsx.old
      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '瞬时直觉判断正确！' : '直觉判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (留白实际差异率 Δ ={' '}
                <strong className="font-mono text-slate-700">{question.areaDeltaPercent}%</strong>)
              </span>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-slate-600">
            A: {question.negRatioA}% vs B: {question.negRatioB}%
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/ShapeMemory2AfcView.tsx
~~~~~
~~~~~tsx.old
      {isRevealed && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '瞬时形态记忆完全正确！' : '记忆形态判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (正确目标为: 区域 {question.correctChoice})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/relativeColor/HueInductionView.tsx
~~~~~
~~~~~tsx.old
      {/* 答案揭晓诊断条 */}
      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '精准补偿环境补色残像！' : '环境色诱导调和判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (正确项为: 候选 {targetIdx + 1}，色差 ΔE ={' '}
                <strong className="font-mono text-slate-700">{userAnswer?.deltaEError}</strong>)
              </span>
            </div>
          </div>
        </div>
      )}
~~~~~
~~~~~tsx.new
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/VertexFittingView.tsx
~~~~~
~~~~~tsx.old
      {showAnswer && (
        <div className="w-full max-w-xl bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '精准命中目标顶点！' : '定点定位出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (像素误差:{' '}
                <strong className="font-mono text-slate-700">{userAnswer?.errorValue}px</strong>)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/relativeColor/AlbersInductionView.tsx
~~~~~
~~~~~tsx.old
      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '精准补偿环境视错觉！' : '环境补偿偏转出现误差'}
              </span>
              <span className="text-slate-400 ml-2">
                (色差 ΔE ={' '}
                <strong className="font-mono text-slate-700">{userAnswer?.deltaEError}</strong>)
              </span>
            </div>
          </div>
        </div>
      )}
~~~~~
~~~~~tsx.new
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/RatioEstimationView.tsx
~~~~~
~~~~~tsx.old
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>
~~~~~
~~~~~tsx.new
      </div>
~~~~~

~~~~~act
patch_file
src/components/relativeColor/Decontextual2AfcView.tsx
~~~~~
~~~~~tsx.old
      {showAnswer && (
        <AnswerDiagnosticBar
          isHit={Boolean(userAnswer?.isHit)}
          successTitle="成功穿透背景视错觉！"
          failTitle="受背景诱导产生了认知偏差"
          subText={`(已统一切换至中性灰背景对比，物理明度差 ΔV = ${question.physicalValueDiff}%)`}
        />
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
    </div>
  );
}
~~~~~
