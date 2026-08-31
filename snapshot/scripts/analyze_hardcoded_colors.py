#!/usr/bin/env python3
"""
FormSight 硬编码颜色检测分析工具
用于扫描代码库中的内联 HEX / RGB / RGBA / HSL 色值，辅助统一接入 Design System / Tailwind Tokens。
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set

# ANSI 彩色输出控制
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    RESET = "\033[0m"


# 默认忽略的目录与文件
DEFAULT_IGNORED_DIRS = {
    "node_modules",
    "dist",
    ".git",
    ".vscode",
    "coverage",
    "build",
    ".husky",
}

# 默认忽略的合法 Token 定义文件或纯算法文件（可按需通过参数调整）
DEFAULT_IGNORED_FILES = {
    "theme.ts",        # Token 定义源头本身
    "oklchUtils.ts",   # 色彩空间底层变换矩阵
}

# 匹配 Hex, RGB(A), HSL(A) 的正则表达式
HEX_COLOR_PATTERN = re.compile(
    r"(?<![a-zA-Z0-9_\-\$])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![a-zA-Z0-9_\-\$])"
)
RGB_COLOR_PATTERN = re.compile(
    r"\brgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0?\.\d+|\d+|0))?\s*\)",
    re.IGNORECASE,
)
HSL_COLOR_PATTERN = re.compile(
    r"\bhsla?\(\s*\d+(?:deg)?\s*,\s*\d+%\s*,\s*\d+%(?:\s*,\s*(?:0?\.\d+|\d+|0))?\s*\)",
    re.IGNORECASE,
)


@dataclass
class ColorOccurrence:
    file_path: str
    line_number: int
    column: int
    color_val: str
    line_content: str


def normalize_color(color_str: str) -> str:
    """标准化颜色字符串，统一大小写并去除冗余空格"""
    color = color_str.strip()
    if color.startswith("#"):
        return color.upper()
    # 统一 rgb/rgba 内部空格
    return re.sub(r"\s+", " ", color).lower()


def scan_file(file_path: Path, ignore_common_bw: bool = False) -> List[ColorOccurrence]:
    """扫描单个文件中的颜色硬编码"""
    results: List[ColorOccurrence] = []
    
    # 常见纯黑白及透明基础色
    common_bw_set = {"#FFF", "#FFFFFF", "#000", "#000000"}

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line_idx, line in enumerate(f, start=1):
                clean_line = line.strip()
                # 忽略纯注释行
                if clean_line.startswith("//") or clean_line.startswith("/*") or clean_line.startswith("*"):
                    continue

                # 匹配 HEX
                for match in HEX_COLOR_PATTERN.finditer(line):
                    raw_val = match.group()
                    norm_val = normalize_color(raw_val)
                    if ignore_common_bw and norm_val in common_bw_set:
                        continue
                    results.append(
                        ColorOccurrence(
                            file_path=str(file_path),
                            line_number=line_idx,
                            column=match.start() + 1,
                            color_val=norm_val,
                            line_content=line.strip(),
                        )
                    )

                # 匹配 RGB/RGBA
                for match in RGB_COLOR_PATTERN.finditer(line):
                    norm_val = normalize_color(match.group())
                    results.append(
                        ColorOccurrence(
                            file_path=str(file_path),
                            line_number=line_idx,
                            column=match.start() + 1,
                            color_val=norm_val,
                            line_content=line.strip(),
                        )
                    )

                # 匹配 HSL/HSLA
                for match in HSL_COLOR_PATTERN.finditer(line):
                    norm_val = normalize_color(match.group())
                    results.append(
                        ColorOccurrence(
                            file_path=str(file_path),
                            line_number=line_idx,
                            column=match.start() + 1,
                            color_val=norm_val,
                            line_content=line.strip(),
                        )
                    )
    except Exception as err:
        print(f"{Colors.RED}无法读取文件 {file_path}: {err}{Colors.RESET}", file=sys.stderr)

    return results


def run_analysis(
    target_dir: Path,
    extensions: Set[str],
    ignore_tests: bool = True,
    ignore_common_bw: bool = False,
    include_token_files: bool = False,
) -> List[ColorOccurrence]:
    all_occurrences: List[ColorOccurrence] = []

    for root, dirs, files in os.walk(target_dir):
        # 过滤掉排除目录
        dirs[:] = [d for d in dirs if d not in DEFAULT_IGNORED_DIRS]

        for file in files:
            file_path = Path(root) / file
            
            # 扩展名过滤
            if file_path.suffix not in extensions:
                continue

            # 测试文件过滤
            if ignore_tests and (
                ".test." in file or ".spec." in file or "__tests__" in str(file_path)
            ):
                continue

            # 白名单文件过滤
            if not include_token_files and file in DEFAULT_IGNORED_FILES:
                continue

            occurrences = scan_file(file_path, ignore_common_bw=ignore_common_bw)
            all_occurrences.extend(occurrences)

    return all_occurrences


def print_cli_report(occurrences: List[ColorOccurrence], root_dir: Path, group_by: str):
    """打印漂亮的终端命令行统计摘要与详情"""
    total_found = len(occurrences)
    
    # 统计不同颜色与文件分布
    color_to_files: Dict[str, Set[str]] = defaultdict(set)
    file_to_colors: Dict[str, List[ColorOccurrence]] = defaultdict(list)
    color_frequency: Dict[str, int] = defaultdict(int)

    for occ in occurrences:
        rel_path = os.path.relpath(occ.file_path, root_dir)
        color_to_files[occ.color_val].add(rel_path)
        file_to_colors[rel_path].append(occ)
        color_frequency[occ.color_val] += 1

    unique_colors = len(color_frequency)
    affected_files = len(file_to_colors)

    print(f"\n{Colors.BOLD}{Colors.HEADER}==================================================")
    print(f"       🎨 FormSight 硬编码颜色分析报告")
    print(f"=================================================={Colors.RESET}\n")

    print(f" 📊 {Colors.BOLD}总体概览：{Colors.RESET}")
    print(f"   • 发现硬编码色值总计: {Colors.RED}{Colors.BOLD}{total_found}{Colors.RESET} 处")
    print(f"   • 独立不重复颜色数:   {Colors.YELLOW}{Colors.BOLD}{unique_colors}{Colors.RESET} 种")
    print(f"   • 受影响的代码文件:   {Colors.CYAN}{Colors.BOLD}{affected_files}{Colors.RESET} 个\n")

    if total_found == 0:
        print(f"{Colors.GREEN}✨ 太棒了！未扫描到任何硬编码颜色。{Colors.RESET}\n")
        return

    if group_by == "color":
        print(f"{Colors.BOLD}{Colors.BLUE}▶ 按【颜色频次】降序排列：{Colors.RESET}")
        sorted_colors = sorted(color_frequency.items(), key=lambda x: x[1], reverse=True)
        for color, count in sorted_colors:
            files_count = len(color_to_files[color])
            print(
                f"  • {Colors.YELLOW}{color:<24}{Colors.RESET} 出现 {Colors.BOLD}{count:>3}{Colors.RESET} 次 (分布在 {files_count} 个文件)"
            )
            # 打印涉及的文件
            for f in sorted(color_to_files[color]):
                print(f"     └─ {Colors.CYAN}{f}{Colors.RESET}")
        print()

    elif group_by == "file":
        print(f"{Colors.BOLD}{Colors.BLUE}▶ 按【文件维度】统计分布：{Colors.RESET}")
        sorted_files = sorted(file_to_colors.items(), key=lambda x: len(x[1]), reverse=True)
        for rel_file, occ_list in sorted_files:
            print(f"\n 📄 {Colors.BOLD}{Colors.CYAN}{rel_file}{Colors.RESET} ({len(occ_list)} 处色值):")
            for occ in occ_list:
                print(
                    f"    Line {Colors.GREEN}{occ.line_number:<4}{Colors.RESET} "
                    f"Col {Colors.YELLOW}{occ.column:<3}{Colors.RESET} "
                    f"[{Colors.BOLD}{occ.color_val}{Colors.RESET}] -> {Colors.RESET}{occ.line_content[:70]}"
                )
        print()


def main():
    parser = argparse.ArgumentParser(
        description="扫描并分析项目中的硬编码颜色值（Hex, RGBA, HSLA 等）"
    )
    parser.add_argument(
        "-p",
        "--path",
        default="src",
        help="待扫描的目录路径 (默认: src)",
    )
    parser.add_argument(
        "-g",
        "--group-by",
        choices=["color", "file"],
        default="file",
        help="输出分组模式：'file' (按文件查看明细) 或 'color' (按色值频次汇总) (默认: file)",
    )
    parser.add_argument(
        "--ignore-bw",
        action="store_true",
        help="忽略常见的黑白色 (#FFF, #FFFFFF, #000, #000000)",
    )
    parser.add_argument(
        "--include-tests",
        action="store_true",
        help="包含测试用例文件 (*.test.ts, __tests__ 等)",
    )
    parser.add_argument(
        "--include-tokens",
        action="store_true",
        help="包含 theme.ts / oklchUtils.ts 等官方 Token 定义文件",
    )
    parser.add_argument(
        "--json",
        dest="json_output",
        action="store_true",
        help="以 JSON 格式输出结果，便于集成 CI 或二次处理",
    )

    args = parser.parse_args()

    # 确定根目录
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent if script_dir.name == "scripts" else script_dir
    scan_target = repo_root / args.path

    if not scan_target.exists():
        print(f"{Colors.RED}错误: 扫描目录不存在: {scan_target}{Colors.RESET}", file=sys.stderr)
        sys.exit(1)

    allowed_exts = {".ts", ".tsx", ".js", ".jsx", ".css", ".html"}

    occurrences = run_analysis(
        target_dir=scan_target,
        extensions=allowed_exts,
        ignore_tests=not args.include_tests,
        ignore_common_bw=args.ignore_bw,
        include_token_files=args.include_tokens,
    )

    if args.json_output:
        json_data = [asdict(o) for o in occurrences]
        print(json.dumps(json_data, indent=2, ensure_ascii=False))
    else:
        print_cli_report(occurrences, repo_root, group_by=args.group_by)


if __name__ == "__main__":
    main()
