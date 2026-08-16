## [WIP] 将节点 C D 放在节点 A B 的下方

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
      {/* 对比展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-white/40"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>
~~~~~
~~~~~typescript.new
      {/* 对比展示区 (2x2 网格: 上 A -> B，下 C -> D) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-4">
        {/* 上排: 基准推移组 (A -> B) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 下排: 目标推移组 (C -> D) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-white/40"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>
~~~~~
