好的，我们将编写一个专门用于工程全量 import 引用的静态扫描校验脚本 `scripts/check_imports.py`，遍历并解析所有源码文件中的导入语句，检测并定位所有悬空或错误的路径引用，并对目前发现的遗留引用（如 `src/utils/sound.ts` 与 `src/utils/theme.ts`）进行精准修复。

## [WIP] feat: 增加全量导入引用静态诊断脚本并修复遗留引用

### 错误分析
在先前将 `src/utils/settings.ts` 提升为 `src/storage/settings.ts` 后，同属于 `src/utils/` 下的 `sound.ts` 和 `theme.ts` 中仍保留了 `./settings`（同级引用），未及时调整为 `../storage/settings`，导致 Vite 在预转换分析（`import-analysis`）时抛出未找到模块错误。

### 用户需求
创建一个用于自动扫描和检验全工程 import 导入路径正确性的静态诊断脚本，并修复所有存在的导入解析错误。

### 评论
静态导入扫描器可以深度模拟 Vite / TypeScript 的模块寻址解析逻辑（自动尝试 `.ts`, `.tsx`, `.d.ts`, `/index.ts`, `/index.tsx` 等后缀），能够在运行构建或开发服务前毫秒级拦截所有悬空引用，极大提升重构与日常开发体验。

### 目标
1. 编写 `scripts/check_imports.py`，全量扫描 `src/` 下所有 `.ts` 和 `.tsx` 文件中的 `import ... from '...'` 及 `export ... from '...'`。
2. 运行脚本全面定位并报告所有无效相对路径。
3. 修复 `src/utils/sound.ts` 和 `src/utils/theme.ts` 等文件的相对导入路径。
4. 执行 `npm run checkf` 验证全量类型与代码规范检查通过。

### 基本原理
利用 Python 正则解析所有 ECMAScript 静态与动态导入，对相对路径（以 `.` 开头）基于发起方文件的实际物理路径进行模块路径推导，若在文件系统上既找不到目标文件也找不到对应目录下的 `index` 桶文件，则作为错误捕获并列出。

### 标签
#intent/tooling #flow/ready #priority/high #comp/build #concept/executor #scope/dx #ai/instruct #task/domain/tooling #task/object/import-checker #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 编写全工程 import 静态引用检查脚本

~~~~~act
write_file
scripts/check_imports.py
~~~~~
~~~~~python
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

IMPORT_REGEX = re.compile(
    r"""(?:import|export)\s+(?:[\w\s{},*]+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)"""
)

EXTENSIONS_TO_TRY = [
    "",
    ".ts",
    ".tsx",
    ".d.ts",
    ".js",
    ".jsx",
    ".json",
    ".css",
    "/index.ts",
    "/index.tsx",
    "/index.d.ts",
    "/index.js",
]

def check_relative_import(source_file: Path, specifier: str) -> bool:
    # 忽略外部三方模块或绝对别名 (非 '.' 开头)
    if not specifier.startswith("."):
        return True

    base_dir = source_file.parent
    target_base = (base_dir / specifier).resolve()

    for ext in EXTENSIONS_TO_TRY:
        candidate = Path(str(target_base) + ext)
        if candidate.is_file():
            return True

    return False

def scan_all_imports():
    files = list(SRC.rglob("*.ts")) + list(SRC.rglob("*.tsx"))
    errors = []
    total_imports = 0

    for file_path in files:
        content = file_path.read_text(encoding="utf-8")
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            # 排除纯注释行
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*"):
                continue

            for match in IMPORT_REGEX.finditer(line):
                specifier = match.group(1) or match.group(2)
                if not specifier:
                    continue

                total_imports += 1
                if specifier.startswith("."):
                    valid = check_relative_import(file_path, specifier)
                    if not valid:
                        errors.append({
                            "file": file_path.relative_to(ROOT),
                            "line": line_idx,
                            "specifier": specifier,
                            "code": stripped
                        })

    print(f"Scanned {len(files)} files, {total_imports} total import/export statements.")
    if errors:
        print(f"\n❌ Found {len(errors)} unresolved import(s):\n")
        for err in errors:
            print(f"  {err['file']}:{err['line']}")
            print(f"    Import: '{err['specifier']}'")
            print(f"    Code:   {err['code']}\n")
        return False
    else:
        print("\n✅ All relative imports resolved successfully!")
        return True

if __name__ == "__main__":
    success = scan_all_imports()
    if not success:
        sys.exit(1)
~~~~~

#### Acts 2: 修复 `src/utils/sound.ts` 与 `src/utils/theme.ts` 的导入路径

~~~~~act
patch_file
src/utils/sound.ts
~~~~~
~~~~~typescript.old
import { loadSettings } from './settings';

let audioCtx: AudioContext | null = null;
~~~~~
~~~~~typescript.new
import { loadSettings } from '../storage/settings';

let audioCtx: AudioContext | null = null;
~~~~~

~~~~~act
patch_file
src/utils/theme.ts
~~~~~
~~~~~typescript.old
import type { ResolvedTheme } from './settings';

/**
 * 1. 基础调色盘（与 Tailwind 标准色彩空间 100% 对齐）
 */
~~~~~
~~~~~typescript.new
import type { ResolvedTheme } from '../storage/settings';

/**
 * 1. 基础调色盘（与 Tailwind 标准色彩空间 100% 对齐）
 */
~~~~~

### 下一步建议
1. **保留诊断工具**：可将 `scripts/check_imports.py` 保留在仓库中，后续可在 `package.json` 中配置为 pre-commit 或 CI 流水线的一部分。
2. **启动本地开发服务**：执行 `npm run dev` 在浏览器中验证各功能运行无阻。
3. **完成最终提交**：如果一切正常，可告诉我创建 `[COMMIT]` 计划归档本次重构。
