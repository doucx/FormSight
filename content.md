好的，我已为你设计好修改方案。我们将在 `scripts/check_dry.py` 中增加对 `packs` 目录的默认忽略支持，并提供 CLI 参数选项（`--ignore-packs` / `--include-packs` 以及 `--ignore-dirs`），以便灵活切换是否扫描 `src/packs` 扩展包。

## [WIP] feat(scripts): 支持忽略 src/packs 目录的 DRY 检查

### 用户需求
在运行 `scripts/check_dry.py` 时，默认或通过选项不扫描 `src/packs` 目录下的所有文件，避免各独立扩展包内部合理的特化/领域重复代码干扰核心框架的 DRY 分析。

### 评论
这个需求非常合理。在 FormSight 架构中，`src/packs/*` 属于独立的内容扩展包（Pack），各个 Pack 作为插件可能具有各自独立的领域配置或特定的画布渲染与工具函数，将其从核心公共代码的 DRY 检查中默认隔离出来，能够显著提升核心骨架（Core / Utils / Views / Components）的代码异味定位精度。

### 目标
1. 在 `DEFAULT_IGNORE_DIRS` 默认忽略集合中加入 `"packs"`。
2. 为 `DryAnalyzer` 构造函数增加动态 `ignore_dirs` 参数支持。
3. 在 CLI 参数中增加 `--include-packs` 与 `--ignore-dirs` 选项，支持灵活开关。

### 基本原理
在文件搜集阶段（`collect_files`），通过 `path.parts` 判定路径中是否包含已配置的忽略目录名（如 `packs`）。同时在参数解析器中提供布尔开关，允许用户在需要时显式通过 `--include-packs` 恢复全量扫描。

### 标签
#intent/build #flow/ready #priority/medium
#comp/tooling #concept/cli #scope/dx
#ai/instruct
#task/domain/tooling #task/object/dry-checker #task/action/feature-extension #task/state/begin

---

### Script

#### Acts 1: 更新 `scripts/check_dry.py` 以支持忽略 packs 目录

我们通过 `patch_file` 修改 `scripts/check_dry.py`，配置默认忽略 `packs` 目录并完善 CLI 参数。

~~~~~act
patch_file
scripts/check_dry.py
~~~~~
~~~~~python.old
DEFAULT_IGNORE_DIRS = {
    "node_modules", "dist", ".git", "coverage", ".vscode", ".idea", "public"
}
~~~~~
~~~~~python.new
DEFAULT_IGNORE_DIRS = {
    "node_modules", "dist", ".git", "coverage", ".vscode", ".idea", "public", "packs"
}
~~~~~

~~~~~act
patch_file
scripts/check_dry.py
~~~~~
~~~~~python.old
    def __init__(
        self,
        root_dir: str = "src",
        min_duplicate_lines: int = 5,
        min_tailwind_classes: int = 4,
        min_tailwind_occurrences: int = 3,
    ):
        self.root_dir = Path(root_dir)
        self.min_duplicate_lines = min_duplicate_lines
        self.min_tailwind_classes = min_tailwind_classes
        self.min_tailwind_occurrences = min_tailwind_occurrences
        self.files: List[Path] = []
        self.file_lines: Dict[str, List[str]] = {}

    def collect_files(self):
        for path in self.root_dir.rglob("*"):
            if path.is_file() and path.suffix in DEFAULT_EXTENSIONS:
                if any(part in DEFAULT_IGNORE_DIRS for part in path.parts):
                    continue
                self.files.append(path)
~~~~~
~~~~~python.new
    def __init__(
        self,
        root_dir: str = "src",
        min_duplicate_lines: int = 5,
        min_tailwind_classes: int = 4,
        min_tailwind_occurrences: int = 3,
        ignore_dirs: Optional[Set[str]] = None,
    ):
        self.root_dir = Path(root_dir)
        self.min_duplicate_lines = min_duplicate_lines
        self.min_tailwind_classes = min_tailwind_classes
        self.min_tailwind_occurrences = min_tailwind_occurrences
        self.ignore_dirs = ignore_dirs if ignore_dirs is not None else set(DEFAULT_IGNORE_DIRS)
        self.files: List[Path] = []
        self.file_lines: Dict[str, List[str]] = {}

    def collect_files(self):
        for path in self.root_dir.rglob("*"):
            if path.is_file() and path.suffix in DEFAULT_EXTENSIONS:
                if any(part in self.ignore_dirs for part in path.parts):
                    continue
                self.files.append(path)
~~~~~

~~~~~act
patch_file
scripts/check_dry.py
~~~~~
~~~~~python.old
def main():
    parser = argparse.ArgumentParser(description="FormSight DRY Pattern & Clone Checker")
    parser.add_argument("--src", default="src", help="Source code directory to analyze (default: src)")
    parser.add_argument("--min-lines", type=int, default=5, help="Minimum duplicate lines for code clones")
    parser.add_argument("--min-classes", type=int, default=4, help="Minimum Tailwind classes count in a pattern")
    parser.add_argument("--min-occurrences", type=int, default=3, help="Minimum occurrences for Tailwind style clones")
    parser.add_argument("--fail-on-smells", action="store_true", help="Exit with code 1 if smells or clones exist (for CI)")
    
    args = parser.parse_args()

    analyzer = DryAnalyzer(
        root_dir=args.src,
        min_duplicate_lines=args.min_lines,
        min_tailwind_classes=args.min_classes,
        min_tailwind_occurrences=args.min_occurrences,
    )
~~~~~
~~~~~python.new
def main():
    parser = argparse.ArgumentParser(description="FormSight DRY Pattern & Clone Checker")
    parser.add_argument("--src", default="src", help="Source code directory to analyze (default: src)")
    parser.add_argument("--min-lines", type=int, default=5, help="Minimum duplicate lines for code clones")
    parser.add_argument("--min-classes", type=int, default=4, help="Minimum Tailwind classes count in a pattern")
    parser.add_argument("--min-occurrences", type=int, default=3, help="Minimum occurrences for Tailwind style clones")
    parser.add_argument("--include-packs", action="store_true", help="Include src/packs directory in analysis (default: ignored)")
    parser.add_argument("--ignore-dirs", nargs="*", default=[], help="Additional directory names to ignore")
    parser.add_argument("--fail-on-smells", action="store_true", help="Exit with code 1 if smells or clones exist (for CI)")
    
    args = parser.parse_args()

    ignore_dirs = set(DEFAULT_IGNORE_DIRS)
    if args.include_packs:
        ignore_dirs.discard("packs")
    if args.ignore_dirs:
        ignore_dirs.update(args.ignore_dirs)

    analyzer = DryAnalyzer(
        root_dir=args.src,
        min_duplicate_lines=args.min_lines,
        min_tailwind_classes=args.min_classes,
        min_tailwind_occurrences=args.min_occurrences,
        ignore_dirs=ignore_dirs,
    )
~~~~~

### 下一步建议

1. **执行验证**：运行 `python scripts/check_dry.py`，确认已不再扫描 `src/packs` 目录下的内容。
2. **需要时包含 Packs 扫描**：如果后续需要对 Packs 插件自身进行跨包重复检查，可运行 `python scripts/check_dry.py --include-packs`。
