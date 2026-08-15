## [WIP] 去除干扰文本

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
      {/* 目标色块 / 双色块对比 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                目标色 (Truth)
              </span>
              <div
                className="w-full h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
                style={{ backgroundColor: targetHex }}
              />
            </div>
            <div className="text-slate-300 font-black text-xl pt-5">VS</div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                你的调制 (Match)
              </span>
              <div
                className="w-full h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-150"
                style={{ backgroundColor: hsvToHex(userH, userS, userV) }}
              />
            </div>
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>
~~~~~
~~~~~typescript.new
      {/* 目标色块 / 双色块对比 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-150"
              style={{ backgroundColor: hsvToHex(userH, userS, userV) }}
            />
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>
~~~~~
