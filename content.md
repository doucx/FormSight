## [WIP] 去除白边

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
~~~~~
