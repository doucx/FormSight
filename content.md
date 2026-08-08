好的，分析了你提供的 HTML 片段，出现重复的原因是在替换色感训练卡片的底部节点时，原本的 `div` 节点未被替换移除，导致卡片底部出现了两行“进入色感练习看板”。

我将修复 `src/views/Home.tsx` 中的结构，移除多余的旧节点。

## [WIP] fix: 修复主页色感练习卡片底部元素重复问题

### 错误分析

在上一次对 `src/views/Home.tsx` 进行代码重构时，色感训练卡片（`color-sense`）追加了包含“累计练习”与“进入色感练习看板”的新 flex 容器，但原本旧有的底部 `div` 元素未被包含在 `patch_file` 的匹配替换块中，导致卡片模板内同时留存了新旧两个底部操作区。

**解决方案**:
在 `src/views/Home.tsx` 中定位色感练习卡片底部，将多余的旧 `<div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">...</div>` 节点予以删除。

### 用户需求
修复主页色感训练卡片底部出现的“进入色感练习看板”文字与图标重复展示的问题。

### 评论
及时修正模板中的重复 HTML 节点，确保 UI 布局整洁且结构规范。

### 目标
清理 `src/views/Home.tsx` 中色感练习卡片底部重复多余的 `div` 节点。

### 基本原理
精细匹配 `Home.tsx` 色感练习卡片末尾处的 DOM 结构，移除旧的占位节点。

### 标签
#intent/fix #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/home-card-duplication #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 删除 `src/views/Home.tsx` 中重复的旧节点

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>累计练习: {formatTotalTime(colorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入色感练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入色感练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
~~~~~
~~~~~typescript.new
          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>累计练习: {formatTotalTime(colorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入色感练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
~~~~~

### 下一步建议
重新刷新页面检查，确认主页两个卡片底部格式完全一致且不再出现重复项。
