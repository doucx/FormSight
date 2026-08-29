#!/usr/bin/env python3
"""
FormSight DRY (Don't Repeat Yourself) Code Smell & Duplication Detector
Usage:
    python scripts/check_dry.py
    python scripts/check_dry.py --src src --min-lines 5 --min-classes 4
    python scripts/check_dry.py --json-output dry_report.json
"""

import os
import re
import sys
import argparse
import hashlib
from collections import defaultdict, Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional

# ==============================================================================
# 配置与忽略项
# ==============================================================================

DEFAULT_IGNORE_DIRS = {
    "node_modules", "dist", ".git", "coverage", ".vscode", ".idea", "public", "packs"
}

DEFAULT_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}

# 忽略无实际逻辑的样板行（导入、单括号、空行等）
TRIVIAL_LINE_REGEX = re.compile(
    r"^(import\s.+|export\s\*|export\s\{|\}|\{|\);\s*|//.*|/\*.*|\*.*|const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);)$"
)

# ==============================================================================
# 数据模型
# ==============================================================================

@dataclass
class CodeOccurrence:
    file_path: str
    start_line: int
    end_line: int
    content: str

@dataclass
class CodeCloneGroup:
    fingerprint: str
    lines_count: int
    occurrences: List[CodeOccurrence] = field(default_factory=list)

@dataclass
class TailwindCloneGroup:
    class_set: Tuple[str, ...]
    count: int
    occurrences: List[Tuple[str, int]]  # (file_path, line_number)

# ==============================================================================
# 核心分析器
# ==============================================================================

class DryAnalyzer:
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

    def normalize_line(self, line: str) -> str:
        """剥离注释和空白，标准化 Token 格式"""
        s = line.strip()
        # 去掉单行注释
        s = re.sub(r"//.*$", "", s).strip()
        # 归一化空格
        s = re.sub(r"\s+", " ", s)
        return s

    def is_significant_line(self, line: str) -> bool:
        norm = self.normalize_line(line)
        if not norm or len(norm) <= 2:
            return False
        if TRIVIAL_LINE_REGEX.match(norm):
            return False
        return True

    # --------------------------------------------------------------------------
    # 1. 结构与代码块克隆检测 (Sliding Window Fingerprinting)
    # --------------------------------------------------------------------------
    def detect_code_clones(self) -> List[CodeCloneGroup]:
        window_size = self.min_duplicate_lines
        fingerprint_map: Dict[str, List[CodeOccurrence]] = defaultdict(list)

        for file_path in self.files:
            rel_path = str(file_path.as_posix())
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    self.file_lines[rel_path] = lines
            except Exception as e:
                print(f"Warn: Unable to read {file_path}: {e}", file=sys.stderr)
                continue

            num_lines = len(lines)
            if num_lines < window_size:
                continue

            for i in range(num_lines - window_size + 1):
                window = lines[i : i + window_size]
                
                # 检查窗口中是否有足够比例的实质性代码
                significant_count = sum(1 for l in window if self.is_significant_line(l))
                if significant_count < max(3, window_size - 1):
                    continue

                # 归一化后计算 hash
                normalized_block = "\n".join(self.normalize_line(l) for l in window)
                fp = hashlib.md5(normalized_block.encode("utf-8")).hexdigest()

                raw_content = "".join(window).rstrip()
                fingerprint_map[fp].append(
                    CodeOccurrence(
                        file_path=rel_path,
                        start_line=i + 1,
                        end_line=i + window_size,
                        content=raw_content,
                    )
                )

        # 过滤仅出现 1 次的或重叠窗口的重复组
        results: List[CodeCloneGroup] = []
        for fp, occs in fingerprint_map.items():
            # 过滤来自同一文件紧邻下一行触发的冗余窗口
            unique_occs: List[CodeOccurrence] = []
            for occ in occs:
                if not unique_occs:
                    unique_occs.append(occ)
                else:
                    prev = unique_occs[-1]
                    if prev.file_path == occ.file_path and abs(occ.start_line - prev.start_line) < window_size:
                        continue
                    unique_occs.append(occ)

            if len(unique_occs) > 1:
                # 跨多个位置重复
                results.append(
                    CodeCloneGroup(
                        fingerprint=fp,
                        lines_count=window_size,
                        occurrences=unique_occs,
                    )
                )

        # 按重复次数 * 影响范围倒序
        results.sort(key=lambda g: len(g.occurrences), reverse=True)
        return results

    # --------------------------------------------------------------------------
    # 2. Tailwind CSS 类名集合重复检测 (Class Set Permutation Invariant)
    # --------------------------------------------------------------------------
    def detect_tailwind_clones(self) -> List[TailwindCloneGroup]:
        class_regex = re.compile(r'class(?:Name)?\s*=\s*["\'`{]([^"\'`}]*)["\'`}]')
        tailwind_map: Dict[Tuple[str, ...], List[Tuple[str, int]]] = defaultdict(list)

        for file_path, lines in self.file_lines.items():
            for line_idx, line in enumerate(lines, start=1):
                matches = class_regex.findall(line)
                for match in matches:
                    # 过滤模板插值 ${...}，只分析纯样式词法
                    clean_match = re.sub(r"\$\{[^}]*\}", "", match)
                    classes = [c.strip() for c in clean_match.split() if c.strip()]
                    
                    # 仅关注长组合样式
                    if len(classes) >= self.min_tailwind_classes:
                        sorted_classes = tuple(sorted(classes))
                        tailwind_map[sorted_classes].append((file_path, line_idx))

        clones: List[TailwindCloneGroup] = []
        for class_set, occs in tailwind_map.items():
            if len(occs) >= self.min_tailwind_occurrences:
                clones.append(
                    TailwindCloneGroup(
                        class_set=class_set,
                        count=len(occs),
                        occurrences=occs,
                    )
                )

        clones.sort(key=lambda c: (c.count * len(c.class_set)), reverse=True)
        return clones

    # --------------------------------------------------------------------------
    # 3. 领域特征模式硬编码扫描 (Domain Pattern Smells)
    # --------------------------------------------------------------------------
    def detect_domain_smells(self) -> Dict[str, List[Tuple[str, int, str]]]:
        patterns = {
            "Accuracy Ternary Colors (80/60 threshold)": re.compile(
                r"(>=?\s*80|\.accuracy\s*>=?\s*80).*?(emerald|#10B981|#15803D).*?(amber|#F59E0B).*?(rose|#F43F5E|#E11D48)"
            ),
            "Inline formatTime (mm:ss) Logic": re.compile(
                r"Math\.floor\([^)]+\s*/\s*60\)\.toString\(\)\.padStart\(2"
            ),
            "Canvas Retina HiDPI & Size Boilerplate": re.compile(
                r"canvas\.getBoundingClientRect\(\).*?setupHiDpiCanvas"
            ),
            "Daily Summary Update Inline Aggregation": re.compile(
                r"totalCount\s*\+=\s*1.*?hitCount\s*\+=\s*1.*?maxLevel\s*=\s*Math\.max"
            ),
        }

        smell_results: Dict[str, List[Tuple[str, int, str]]] = defaultdict(list)

        for file_path, lines in self.file_lines.items():
            full_content = "".join(lines)
            for smell_name, regex in patterns.items():
                for line_idx, line in enumerate(lines, start=1):
                    if regex.search(line):
                        smell_results[smell_name].append((file_path, line_idx, line.strip()[:90]))
                
                # 多行跨行模式匹配
                if smell_name in ("Daily Summary Update Inline Aggregation", "Canvas Retina HiDPI & Size Boilerplate"):
                    matches = list(regex.finditer(full_content))
                    for m in matches:
                        # 计算所在行号
                        line_num = full_content[: m.start()].count("\n") + 1
                        snippet = full_content[m.start(): m.start() + 100].replace("\n", " ")
                        # 避免单行与多行重复记录
                        if not any(f == file_path and abs(l - line_num) <= 2 for f, l, _ in smell_results[smell_name]):
                            smell_results[smell_name].append((file_path, line_num, snippet[:90] + "..."))

        return smell_results


# ==============================================================================
# 终端报告与格式化输出
# ==============================================================================

class Reporter:
    @staticmethod
    def print_colored(text: str, color_code: str):
        print(f"\033[{color_code}m{text}\033[0m")

    @classmethod
    def render(
        cls,
        clones: List[CodeCloneGroup],
        tailwind_clones: List[TailwindCloneGroup],
        smells: Dict[str, List[Tuple[str, int, str]]],
    ):
        cls.print_colored("\n=======================================================", "1;36")
        cls.print_colored("   🔍 FormSight DRY & Code Duplication Report", "1;36")
        cls.print_colored("=======================================================\n", "1;36")

        # 1. 领域模式硬编码检测
        cls.print_colored("📌 1. Domain Pattern Code Smells (硬编码反模式)", "1;33")
        total_smells = sum(len(items) for items in smells.values())
        if total_smells == 0:
            print("  ✨ 无明显硬编码逻辑重复。\n")
        else:
            for smell_name, locations in smells.items():
                if not locations:
                    continue
                cls.print_colored(f"\n  • [Smell] {smell_name} ({len(locations)} 处)", "1;31")
                for f_path, l_num, snip in locations:
                    print(f"    - {f_path}:{l_num} ➔ \033[90m{snip}\033[0m")
            print()

        # 2. 代码块克隆
        cls.print_colored("📌 2. Structural Code Clones (>= 5 行逻辑克隆)", "1;33")
        if not clones:
            print("  ✨ 未检测到大块代码克隆。\n")
        else:
            for idx, group in enumerate(clones[:8], start=1):
                cls.print_colored(f"\n  [Group #{idx}] 重复出现 {len(group.occurrences)} 次 (窗口: {group.lines_count} 行)", "1;35")
                for occ in group.occurrences:
                    print(f"    - {occ.file_path}:{occ.start_line}-{occ.end_line}")
                
                # 打印其中一处的代码快照预览
                sample = "\n".join("      | " + l for l in group.occurrences[0].content.split("\n")[:4])
                print("\033[90m" + sample + "\n      | ...\033[0m")
            if len(clones) > 8:
                print(f"\n  ... 其余 {len(clones) - 8} 处轻量克隆已省略。")
            print()

        # 3. Tailwind 类名长组合重复
        cls.print_colored("📌 3. Tailwind CSS Class Set Duplications (重复样式组合)", "1;33")
        if not tailwind_clones:
            print("  ✨ 未发现高频重复的复杂 Tailwind 组合。\n")
        else:
            for idx, tc in enumerate(tailwind_clones[:6], start=1):
                cls.print_colored(f"\n  [Style Pattern #{idx}] 包含 {len(tc.class_set)} 个 Utility Classes，重复使用 {tc.count} 次:", "1;32")
                print(f"    \033[96m{' '.join(tc.class_set)}\033[0m")
                print("    出现在以下位置:")
                for f_path, l_num in tc.occurrences[:5]:
                    print(f"      • {f_path}:{l_num}")
                if len(tc.occurrences) > 5:
                    print(f"      • ... 以及另外 {len(tc.occurrences) - 5} 处")
            if len(tailwind_clones) > 6:
                print(f"\n  ... 其余 {len(tailwind_clones) - 6} 个重复样式组合已省略。")
            print()

        cls.print_colored("=======================================================", "1;36")
        cls.print_colored(
            f"  📊 总计: {len(clones)} 组代码克隆 | {len(tailwind_clones)} 组重复样式 | {total_smells} 处领域硬编码",
            "1;37",
        )
        cls.print_colored("=======================================================\n", "1;36")


# ==============================================================================
# CLI 入口
# ==============================================================================

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

    analyzer.collect_files()
    if not analyzer.files:
        print(f"No source files found in '{args.src}'. Exiting.")
        sys.exit(0)

    clones = analyzer.detect_code_clones()
    tailwind_clones = analyzer.detect_tailwind_clones()
    smells = analyzer.detect_domain_smells()

    Reporter.render(clones, tailwind_clones, smells)

    if args.fail_on_smells and (len(clones) > 0 or sum(len(x) for x in smells.values()) > 0):
        sys.exit(1)

if __name__ == "__main__":
    main()
