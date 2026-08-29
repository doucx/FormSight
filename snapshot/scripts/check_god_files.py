#!/usr/bin/env python3
"""
God File / Overly Large File Detector for TypeScript/JavaScript/Python codebases.
Analyzes files based on SLOC, Import Density, Component/Function Count, React Hook Complexity,
and calculates a composite "God Score".

Zero external dependencies required.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List, Tuple

# 默认扫描的文件后缀
DEFAULT_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".vue"}

# 默认忽略的目录与文件
DEFAULT_IGNORES = {
    "node_modules", "dist", "build", ".git", ".next", ".turbo",
    "coverage", "public", "package-lock.json", "biome.json",
    "tsconfig.json", "vite.config.ts"
}

# ANSI 颜色输出
class Colors:
    RED = "\033[91m"
    YELLOW = "\033[93m"
    GREEN = "\033[92m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


@dataclass
class FileReport:
    path: str
    loc: int             # 总行数
    sloc: int            # 有效代码行数 (剔除空行和注释)
    import_count: int    # 导入外部模块数 (代表耦合度 Fan-In)
    export_count: int    # 导出数
    fn_count: int        # 函数 / 组件 / 类数量
    hook_count: int      # React Hooks 数量 (useState, useEffect, useMemo等)
    god_score: float     # 综合上帝指数
    level: str           # 'CRITICAL' | 'WARNING' | 'OK'
    reasons: List[str]   # 触发原因说明


class GodFileAnalyzer:
    def __init__(self, sloc_limit: int = 300, god_score_limit: float = 35.0):
        self.sloc_limit = sloc_limit
        self.god_score_limit = god_score_limit

    @staticmethod
    def strip_comments_and_empty(content: str, ext: str) -> Tuple[List[str], int]:
        """剔除注释和空行，返回 SLOC 行列表和原始 LOC"""
        raw_lines = content.splitlines()
        loc = len(raw_lines)
        
        if ext in {".ts", ".tsx", ".js", ".jsx"}:
            # 移除块级注释 /* ... */
            content_no_block = re.sub(r'/\*[\s\S]*?\*/', '', content)
            lines = content_no_block.splitlines()
            # 过滤单行注释和空行
            sloc_lines = [
                line for line in lines 
                if line.strip() and not line.strip().startswith("//")
            ]
        elif ext == ".py":
            # 移除 Python 块级字符串 docstring 和 # 注释
            content_no_doc = re.sub(r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')', '', content)
            lines = content_no_doc.splitlines()
            sloc_lines = [
                line for line in lines 
                if line.strip() and not line.strip().startswith("#")
            ]
        else:
            sloc_lines = [l for l in raw_lines if l.strip()]

        return sloc_lines, loc

    def analyze_file(self, file_path: Path) -> FileReport:
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return None

        ext = file_path.suffix.lower()
        sloc_lines, loc = self.strip_comments_and_empty(content, ext)
        sloc = len(sloc_lines)
        sloc_text = "\n".join(sloc_lines)

        # 1. 统计 Imports (衡量依赖复杂度与职责分散度)
        if ext == ".py":
            imports = len(re.findall(r'^\s*(?:import|from)\s+\w+', sloc_text, re.MULTILINE))
        else:
            imports = len(re.findall(r'^\s*import\s+.*?;?$', sloc_text, re.MULTILINE)) + \
                      len(re.findall(r'require\(.*?\)', sloc_text))

        # 2. 统计 Exports
        exports = len(re.findall(r'^\s*export\s+', sloc_text, re.MULTILINE))

        # 3. 统计函数/方法/类/组件声明
        # 匹配: function foo, const foo = () =>, class Bar, def foo
        if ext == ".py":
            fn_count = len(re.findall(r'^\s*(?:def|class)\s+\w+', sloc_text, re.MULTILINE))
            hook_count = 0
        else:
            fn_matches = (
                re.findall(r'(?:export\s+)?function\s+\w+', sloc_text) +
                re.findall(r'(?:export\s+)?const\s+\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>', sloc_text) +
                re.findall(r'class\s+\w+', sloc_text)
            )
            fn_count = len(fn_matches)
            
            # React Hook 复杂度
            hook_matches = re.findall(r'\buse[A-Z]\w+\(', sloc_text)
            hook_count = len(hook_matches)

        # 4. 核心：计算 God Score (加权上帝文件综合分)
        # 权重公式：
        # - 代码量基础分: SLOC / 25
        # - 依赖过多 (高耦合): imports * 1.2
        # - 职责过多 (函数过多): fn_count * 1.5
        # - 状态/副作用过多 (React 上帝组件): hook_count * 1.8
        god_score = round(
            (sloc / 25.0) +
            (imports * 1.2) +
            (fn_count * 1.5) +
            (hook_count * 1.8),
            1
        )

        reasons = []
        if sloc > 450:
            reasons.append(f"巨大代码量 (SLOC: {sloc})")
        elif sloc > self.sloc_limit:
            reasons.append(f"代码行偏多 (SLOC: {sloc})")

        if imports >= 18:
            reasons.append(f"高耦合/过多依赖 ({imports} imports)")
        if hook_count >= 12:
            reasons.append(f"过多状态/副作用 ({hook_count} hooks)")
        if fn_count >= 12:
            reasons.append(f"过多内部逻辑/函数 ({fn_count} functions)")

        # 判定级别
        if god_score >= self.god_score_limit or sloc >= 500:
            level = "CRITICAL"
        elif god_score >= (self.god_score_limit * 0.75) or sloc >= self.sloc_limit:
            level = "WARNING"
        else:
            level = "OK"

        return FileReport(
            path=str(file_path),
            loc=loc,
            sloc=sloc,
            import_count=imports,
            export_count=exports,
            fn_count=fn_count,
            hook_count=hook_count,
            god_score=god_score,
            level=level,
            reasons=reasons,
        )


def scan_directory(root_dir: str, analyzer: GodFileAnalyzer, exts: set) -> List[FileReport]:
    reports = []
    root = Path(root_dir).resolve()

    for dirpath, dirnames, filenames in os.walk(root):
        # 排除忽略目录
        dirnames[:] = [d for d in dirnames if d not in DEFAULT_IGNORES and not d.startswith(".")]

        for fname in filenames:
            file_path = Path(dirpath) / fname
            if file_path.suffix.lower() in exts and fname not in DEFAULT_IGNORES:
                report = analyzer.analyze_file(file_path)
                if report:
                    # 转为相对路径显示
                    try:
                        report.path = str(file_path.relative_to(root))
                    except ValueError:
                        pass
                    reports.append(report)

    return reports


def print_table(reports: List[FileReport], top_n: int = 15):
    # 按照 God Score 降序排序
    sorted_reports = sorted(reports, key=lambda x: x.god_score, reverse=True)
    display_list = sorted_reports[:top_n]

    print(f"\n{Colors.BOLD}🔍 [FormSight] God File & Complexity Analysis (Top {min(top_n, len(display_list))}){Colors.RESET}\n")
    
    headers = f"{'Level':<10} {'Score':<8} {'SLOC':<8} {'Imps':<6} {'Fns':<6} {'Hooks':<6} {'File Path'}"
    print(Colors.DIM + headers + Colors.RESET)
    print(Colors.DIM + "-" * 85 + Colors.RESET)

    for r in display_list:
        if r.level == "CRITICAL":
            lvl_str = f"{Colors.RED}{Colors.BOLD}CRITICAL{Colors.RESET}"
            score_str = f"{Colors.RED}{r.god_score:<8.1f}{Colors.RESET}"
        elif r.level == "WARNING":
            lvl_str = f"{Colors.YELLOW}WARNING {Colors.RESET}"
            score_str = f"{Colors.YELLOW}{r.god_score:<8.1f}{Colors.RESET}"
        else:
            lvl_str = f"{Colors.GREEN}OK      {Colors.RESET}"
            score_str = f"{r.god_score:<8.1f}"

        print(f"{lvl_str} {score_str} {r.sloc:<8} {r.import_count:<6} {r.fn_count:<6} {r.hook_count:<6} {r.path}")
        if r.reasons and r.level != "OK":
            reason_str = " | ".join(r.reasons)
            print(f"  {Colors.DIM}↳ ⚠️  {reason_str}{Colors.RESET}")

    print(Colors.DIM + "-" * 85 + Colors.RESET)


def main():
    parser = argparse.ArgumentParser(description="Check for God Files & Large files in the codebase.")
    parser.add_argument("--root", default=".", help="Root directory to scan (default: .)")
    parser.add_argument("--sloc", type=int, default=300, help="SLOC threshold for warning (default: 300)")
    parser.add_argument("--score", type=float, default=35.0, help="God Score threshold for critical (default: 35.0)")
    parser.add_argument("--top", type=int, default=15, help="Number of files to display (default: 15)")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--fail-on-violation", action="store_true", help="Exit with non-zero code if critical files exist")

    args = parser.parse_args()

    analyzer = GodFileAnalyzer(sloc_limit=args.sloc, god_score_limit=args.score)
    reports = scan_directory(args.root, analyzer, DEFAULT_EXTENSIONS)

    if not reports:
        print("No files found.")
        sys.exit(0)

    if args.json:
        print(json.dumps([asdict(r) for r in reports], indent=2, ensure_ascii=False))
        return

    print_table(reports, top_n=args.top)

    critical_count = sum(1 for r in reports if r.level == "CRITICAL")
    warning_count = sum(1 for r in reports if r.level == "WARNING")
    total_scanned = len(reports)

    print(f"\n📊 统计汇总: 扫描了 {Colors.CYAN}{total_scanned}{Colors.RESET} 个文件 | "
          f"{Colors.RED}{critical_count} Critical{Colors.RESET} | "
          f"{Colors.YELLOW}{warning_count} Warning{Colors.RESET}")

    if critical_count > 0 and args.fail_on_violation:
        print(f"\n{Colors.RED}❌ 发现 {critical_count} 个上帝文件超过阈值，请重构拆分！{Colors.RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
