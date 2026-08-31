#!/usr/bin/env python3
"""
FormSight Typography Refactoring Script
Automates the replacement of micro font sizes (9px, 10px, 11px) with standard Tailwind text-xs.
"""

import os
import re
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"

# 复合模式优先替换
COMPOSITE_RULES = [
    (re.compile(r'\btext-\[(?:9|10|11)px\]\s+sm:text-\[(?:9|10|11)px\]\b'), 'text-xs'),
    (re.compile(r'\btext-\[(?:9|10|11)px\]\s+sm:text-xs\b'), 'text-xs'),
    (re.compile(r'\btext-xs\s+sm:text-\[(?:9|10|11)px\]\b'), 'text-xs'),
]

# 单独类名与前缀替换
PREFIXED_RULE = re.compile(r'(?<![\w-])((?:[a-z0-9_-]+:)*)text-\[(?:9|10|11)px\](?![\w-])')

# 清理冗余重复类
CLEANUP_RULES = [
    (re.compile(r'\btext-xs\s+sm:text-xs\b'), 'text-xs'),
    (re.compile(r'\btext-xs\s+text-xs\b'), 'text-xs'),
]

def refactor_content(content: str) -> tuple[str, int]:
    modified_count = 0
    new_content = content

    # 1. 替换复合响应式类名
    for pattern, replacement in COMPOSITE_RULES:
        matches = len(pattern.findall(new_content))
        if matches > 0:
            modified_count += matches
            new_content = pattern.sub(replacement, new_content)

    # 2. 替换常规及带前缀的 text-[Xpx]
    def replacer(match: re.Match) -> str:
        nonlocal modified_count
        modified_count += 1
        prefix = match.group(1) or ""
        return f"{prefix}text-xs"

    new_content = PREFIXED_RULE.sub(replacer, new_content)

    # 3. 清理替换后可能产生的冗余类名
    for pattern, replacement in CLEANUP_RULES:
        new_content = pattern.sub(replacement, new_content)

    return new_content, modified_count

def main():
    target_extensions = {".tsx", ".ts", ".jsx", ".js", ".css", ".html"}
    total_files_changed = 0
    total_replacements = 0

    print(f"Scanning directory: {SRC_DIR}")

    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            file_path = Path(root) / file
            if file_path.suffix in target_extensions:
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        original_content = f.read()

                    new_content, count = refactor_content(original_content)

                    if count > 0 and new_content != original_content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        rel_path = file_path.relative_to(SRC_DIR.parent)
                        print(f"  [MODIFIED] {rel_path} ({count} replacements)")
                        total_files_changed += 1
                        total_replacements += count
                except Exception as err:
                    print(f"  [ERROR] Failed processing {file_path}: {err}")

    print(f"\nRefactoring completed successfully:")
    print(f"  - Total files modified: {total_files_changed}")
    print(f"  - Total micro-typography classes upgraded: {total_replacements}")

if __name__ == "__main__":
    main()