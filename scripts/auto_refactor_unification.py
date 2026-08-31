#!/usr/bin/env python3
"""FormSight Automated Design System & Token Refactoring Script.

Batch migrates hardcoded slate/indigo classes to semantic Design Tokens
(bg-card, bg-muted, bg-accent, text-foreground, text-muted-foreground, border-border)
while respecting core color models and test fixtures.
"""

import argparse
import os
from pathlib import Path
import re
import sys

# Terminal Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    "test",
    "coverage",
}

EXCLUDE_FILES = {
    "src/utils/theme.ts",
    "src/core/color/colorUtils.ts",
    "src/core/color/oklchUtils.ts",
    "src/index.css",
    "src/utils/__tests__/colorUtils.test.ts",
}

# Ordered Replacement Rules (High specificity compound rules first, then general atomic tokens)
REPLACEMENTS = [
    # 1. Compound Diagnostic / Callout Boxes
    (
        re.compile(
            r"bg-indigo-50/60\s+p-3\.5\s+rounded-2xl\s+border\s+border-indigo-100"
        ),
        "bg-accent/70 p-3.5 rounded-2xl border border-border/60 dark:border-border",
    ),
    (
        re.compile(
            r"bg-amber-50/60\s+p-3\.5\s+rounded-2xl\s+border\s+border-amber-100"
        ),
        "bg-amber-50/70 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-800/60",
    ),
    (
        re.compile(
            r"bg-emerald-50/60\s+p-3\.5\s+rounded-2xl\s+border\s+border-emerald-100"
        ),
        "bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60",
    ),
    (
        re.compile(
            r"bg-indigo-50/80\s+dark:bg-indigo-950/60\s+border\s+border-indigo-100/90\s+dark:border-indigo-900/60"
        ),
        "bg-accent/80 border border-border/60 dark:border-border",
    ),
    # 2. Dual-Theme Compound Pairs
    (
        re.compile(
            r"border\s+border-slate-200/50\s+dark:border-slate-700/50"
        ),
        "border border-border/50",
    ),
    (
        re.compile(
            r"border\s+border-white/60\s+dark:border-slate-700/60"
        ),
        "border border-border/60",
    ),
    (
        re.compile(
            r"border\s+border-slate-200/60\s+dark:border-slate-700/60"
        ),
        "border border-border/60",
    ),
    (
        re.compile(
            r"border-4\s+border-white\s+dark:border-slate-800"
        ),
        "border-4 border-card dark:border-border shadow-md",
    ),
    (
        re.compile(
            r"border-2\s+border-white\s+dark:border-slate-800"
        ),
        "border-2 border-card dark:border-border",
    ),
    (
        re.compile(
            r"ring-1\s+ring-slate-200\s+dark:ring-slate-700"
        ),
        "ring-1 ring-border/60",
    ),
    (
        re.compile(
            r"bg-slate-50\s+dark:bg-slate-950"
        ),
        "bg-muted/40",
    ),
    # 3. Specific Border Variants
    (
        re.compile(
            r"\bborder-slate-200/80\b"
        ),
        "border-border/80",
    ),
    (
        re.compile(
            r"\bborder-slate-200/60\b"
        ),
        "border-border/60",
    ),
    (
        re.compile(
            r"\bborder-slate-200/50\b"
        ),
        "border-border/50",
    ),
    (
        re.compile(
            r"\bborder-slate-200\b"
        ),
        "border-border",
    ),
    (
        re.compile(
            r"\bborder-slate-700/60\b"
        ),
        "border-border/60",
    ),
    (
        re.compile(
            r"\bdark:border-slate-800\b"
        ),
        "dark:border-border",
    ),
    (
        re.compile(
            r"\bdark:border-slate-700\b"
        ),
        "dark:border-border",
    ),
    (
        re.compile(
            r"\bborder-indigo-100\b"
        ),
        "border-border/60",
    ),
    (
        re.compile(
            r"\bborder-amber-200/60\b"
        ),
        "border-amber-200/60 dark:border-amber-800/60",
    ),
    # 4. Text Color Tokens
    (
        re.compile(r"\btext-slate-800\b"),
        "text-foreground",
    ),
    (
        re.compile(r"\btext-slate-700\b"),
        "text-foreground",
    ),
    (
        re.compile(r"\btext-slate-600\b"),
        "text-muted-foreground",
    ),
    (
        re.compile(r"\btext-slate-500\b"),
        "text-muted-foreground",
    ),
    (
        re.compile(r"\btext-amber-800\b"),
        "text-amber-700 dark:text-amber-300",
    ),
    (
        re.compile(r"\btext-amber-900\b"),
        "text-amber-800 dark:text-amber-200",
    ),
    (
        re.compile(r"\btext-indigo-900\b"),
        "text-primary font-black",
    ),
    (
        re.compile(r"\btext-emerald-900\b"),
        "text-emerald-800 dark:text-emerald-200",
    ),
]


def refactor_file(file_path: Path, root_path: Path, dry_run: bool = False) -> int:
    rel_path_str = str(file_path.relative_to(root_path)).replace("\\", "/")

    if rel_path_str in EXCLUDE_FILES:
        return 0

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"{RED}Error reading {file_path}: {e}{RESET}", file=sys.stderr)
        return 0

    modified_content = content
    changes_count = 0

    for pattern, replacement in REPLACEMENTS:
        new_content, count = pattern.subn(replacement, modified_content)
        if count > 0:
            changes_count += count
            modified_content = new_content

    if changes_count > 0 and not dry_run:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(modified_content)

    return changes_count


def main():
    parser = argparse.ArgumentParser(
        description="FormSight Automated Design System & Token Refactoring Tool"
    )
    parser.add_argument(
        "--path",
        default="src",
        help="Root folder to refactor (default: src)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without modifying files",
    )
    args = parser.parse_args()

    root_path = Path(args.path).resolve()
    if not root_path.exists():
        print(f"{RED}Error: Target path '{root_path}' does not exist.{RESET}")
        sys.exit(1)

    project_root = root_path if root_path.name != "src" else root_path.parent

    print(f"\n{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════{RESET}")
    print(f" {BOLD}{MAGENTA}🚀 FormSight Automated Design System Refactoring Engine{RESET}")
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════{RESET}\n")

    if args.dry_run:
        print(f"{YELLOW}⚠️  Running in DRY-RUN mode. No files will be modified.{RESET}\n")

    total_files_changed = 0
    total_replacements = 0

    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file.endswith((".ts", ".tsx")):
                full_path = Path(root) / file
                count = refactor_file(full_path, project_root, dry_run=args.dry_run)
                if count > 0:
                    rel_p = str(full_path.relative_to(project_root)).replace("\\", "/")
                    print(f"  {GREEN}✓ Cleaned:{RESET} {rel_p:<50} {DIM}({count} replacements){RESET}")
                    total_files_changed += 1
                    total_replacements += count

    print(f"\n{BOLD}{CYAN}─────────────────────────── Refactor Results ───────────────────────────{RESET}")
    print(f"Total files updated:      {BOLD}{GREEN}{total_files_changed}{RESET}")
    print(f"Total token replacements: {BOLD}{GREEN}{total_replacements}{RESET}")
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════{RESET}\n")


if __name__ == "__main__":
    main()