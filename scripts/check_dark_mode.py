#!/usr/bin/env python3
"""
FormSight Dark Mode Coverage Linter
扫描 src/ 下的所有 .tsx 组件，检查是否存在有浅色背景/文字/边框但缺少 dark:* 对应的类名。
"""

import os
import re
import sys
from pathlib import Path

# 关注的浅色特征类名（支持直接匹配以及 hover:、focus:、group-hover: 等复合前缀）
PATTERNS = [
    # 1. 浅色背景 (需配对 dark:bg-* 或 dark:hover:bg-*)
    (
        r'(?:^|\s)(?:[a-z0-9-]+:)?(bg-white|bg-slate-50(?:/\d+)?|bg-slate-100(?:/\d+)?)',
        r'dark:(?:[a-z0-9-]+:)?bg-',
        'Missing dark background (dark:bg-*)',
    ),
    # 2. 深色文字 (需配对 dark:text-* 或 dark:hover:text-*)
    (
        r'(?:^|\s)(?:[a-z0-9-]+:)?(text-slate-900|text-slate-800|text-slate-700)',
        r'dark:(?:[a-z0-9-]+:)?text-',
        'Missing dark text (dark:text-*)',
    ),
    # 3. 浅色边框 (需配对 dark:border-* 或 dark:hover:border-*)
    (
        r'(?:^|\s)(?:[a-z0-9-]+:)?(border-slate-200(?:/\d+)?|border-slate-100|border-gray-100|border-gray-200(?:/\d+)?)',
        r'dark:(?:[a-z0-9-]+:)?border-',
        'Missing dark border (dark:border-*)',
    ),
]

# 允许豁免的固定对比度场景 (如强制白底主色按钮、黑底白字胶囊等)
EXEMPT_COMBINATIONS = [
    r'bg-slate-800\s+text-white',
    r'bg-indigo-600\s+text-white',
    r'bg-emerald-600\s+text-white',
    r'bg-rose-600\s+text-white',
    r'bg-amber-600\s+text-white',
    r'text-white\s+bg-slate-800',
    r'text-white\s+bg-indigo-600',
]

def scan_file(file_path: Path):
    issues = []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for idx, line in enumerate(lines, 1):
        # 提取 className 内容
        class_matches = re.findall(r'className=(?:\{`([^`]+)`\}|"([^"]+)")', line)
        for match in class_matches:
            class_str = match[0] or match[1]

            # 检查是否命中豁免组合
            is_exempt = any(re.search(ex, class_str) for ex in EXEMPT_COMBINATIONS)

            for light_regex, dark_regex, desc in PATTERNS:
                light_match = re.search(light_regex, class_str)
                if light_match:
                    has_dark = bool(re.search(dark_regex, class_str))
                    if not has_dark and not is_exempt:
                        matched_token = light_match.group(1)
                        issues.append({
                            'line': idx,
                            'token': matched_token,
                            'desc': desc,
                            'snippet': line.strip()[:100],
                        })

    return issues

def main():
    root_dir = Path(__file__).resolve().parent.parent / 'src'
    target_dirs = [
        root_dir / 'components',
        root_dir / 'views',
        root_dir / 'app.tsx',
    ]

    total_scanned = 0
    total_issues = 0
    file_reports = {}

    for target in target_dirs:
        if target.is_file() and target.suffix == '.tsx':
            files = [target]
        elif target.is_dir():
            files = list(target.rglob('*.tsx'))
        else:
            continue

        for file_path in sorted(files):
            total_scanned += 1
            issues = scan_file(file_path)
            if issues:
                rel_path = file_path.relative_to(root_dir.parent)
                file_reports[str(rel_path)] = issues
                total_issues += len(issues)

    print("=" * 70)
    print("🔍 FormSight 夜间模式覆盖度扫描审计")
    print("=" * 70)
    print(f"扫描组件总数: {total_scanned} 个 TSX 文件")
    print(f"检测到潜在遗漏: {total_issues} 处\n")

    if not file_reports:
        print("✅ 完美！未检测到任何缺失 dark:* 变体的浅色类名，夜间模式覆盖率达到 100%！")
        print("=" * 70)
        sys.exit(0)

    for file_name, issues in file_reports.items():
        print(f"\n📂 {file_name} ({len(issues)} 处待核对):")
        for iss in issues:
            print(f"  • Line {iss['line']:3d}: [{iss['token']}] -> {iss['desc']}")
            print(f"    代码片段: {iss['snippet']}")

    print("\n" + "=" * 70)
    print(f"⚠️  共发现 {total_issues} 处潜在需补充深色适配项。")

if __name__ == '__main__':
    main()