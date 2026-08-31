#!/usr/bin/env python3
"""FormSight Design System Unification Scanner.

Scans the codebase to detect:
1. Raw <button> usages (candidates for <Button>)
2. Ad-hoc badge-like <span>/<div> (candidates for <Badge>)
3. Hardcoded slate/indigo color classes (candidates for tokens: bg-card, text-foreground, etc.)
4. Hardcoded Hex colors in UI components
"""

import argparse
from collections import defaultdict
from dataclasses import dataclass
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

# Files/Folders to exclude from checks
EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    "test",
    "coverage",
}

# Specific files excluded from certain rules
UI_PRIMITIVES = {
    "src/components/ui/button.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/card.tsx",
    "src/components/ui/index.ts",
    "src/utils/cn.ts",
}

COLOR_SYSTEM_FILES = {
    "src/utils/theme.ts",
    "src/core/color/colorUtils.ts",
    "src/core/color/oklchUtils.ts",
    "src/index.css",
}


@dataclass
class Finding:
    category: str
    file_path: str
    line_num: int
    matched_text: str
    suggestion: str
    line_content: str


# Regex rules for unification detection
RULES = [
    # 1. Raw Buttons
    {
        "category": "Raw <button> Tag",
        "pattern": re.compile(r"<button\b"),
        "suggestion": "Replace with <Button variant='...' size='...'>",
        "filter": lambda p: str(p).replace("\\", "/") not in UI_PRIMITIVES,
    },
    # 2. Hardcoded dark: classes that should be semantic tokens
    {
        "category": "Hardcoded Dual-Theme Color",
        "pattern": re.compile(
            r"\b(dark:bg-slate-\d+|dark:text-slate-\d+|dark:border-slate-\d+|dark:bg-black\S*)\b"
        ),
        "suggestion": "Use semantic tokens (bg-card, bg-muted, text-foreground, border-border, etc.)",
        "filter": lambda p: str(p).replace("\\", "/") not in COLOR_SYSTEM_FILES,
    },
    # 3. Hardcoded Light Slate Grayscale Colors
    {
        "category": "Hardcoded Slate Grayscale",
        "pattern": re.compile(
            r"\b(text-slate-[4-9]00|bg-slate-[5-9]00|bg-slate-[5-9]0|border-slate-[1-9]00(?:/\d+)?)\b"
        ),
        "suggestion": "Use semantic tokens (text-foreground, text-muted-foreground, bg-card, border-border)",
        "filter": lambda p: str(p).replace("\\", "/") not in COLOR_SYSTEM_FILES
        and str(p).replace("\\", "/") not in UI_PRIMITIVES,
    },
    # 4. Hardcoded Brand Indigo Colors (Interactive)
    {
        "category": "Hardcoded Brand Indigo Class",
        "pattern": re.compile(
            r"\b(bg-indigo-50|dark:bg-indigo-950(?:/\d+)?|text-indigo-600|dark:text-indigo-400|hover:bg-indigo-50|border-indigo-100)\b"
        ),
        "suggestion": "Use semantic tokens (bg-accent, text-primary, hover:bg-accent, border-border)",
        "filter": lambda p: str(p).replace("\\", "/") not in COLOR_SYSTEM_FILES
        and str(p).replace("\\", "/") not in UI_PRIMITIVES,
    },
    # 5. Ad-hoc Badges (inline styled spans with border/bg/rounded-full)
    {
        "category": "Ad-hoc Badge Span",
        "pattern": re.compile(
            r"<span\s+className=[\"'][^\"']*\b(rounded-(?:md|full|lg|xl)\s+(?:bg-\S+|border\S*))\b"
        ),
        "suggestion": "Replace with <Badge variant='...' size='...'>",
        "filter": lambda p: str(p).replace("\\", "/") not in UI_PRIMITIVES,
    },
    # 6. Hardcoded Hex Color Literals in JSX/TSX
    {
        "category": "Hardcoded Hex Color in Component",
        "pattern": re.compile(r"['\"]#(?:[0-9a-fA-F]{3}){1,2}['\"]"),
        "suggestion": "Reference PALETTE.* or CSS token / CANVAS_THEME",
        "filter": lambda p: str(p).replace("\\", "/") not in COLOR_SYSTEM_FILES
        and not str(p).endswith(".json"),
    },
]


def scan_file(file_path: Path, root_path: Path) -> list[Finding]:
    findings = []
    rel_path_str = str(file_path.relative_to(root_path)).replace("\\", "/")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"{RED}Error reading {file_path}: {e}{RESET}", file=sys.stderr)
        return []

    for line_idx, line in enumerate(lines, start=1):
        clean_line = line.strip()
        if not clean_line or clean_line.startswith("//") or clean_line.startswith("/*"):
            continue

        for rule in RULES:
            if not rule["filter"](file_path.relative_to(root_path)):
                continue

            match = rule["pattern"].search(clean_line)
            if match:
                matched_text = match.group(0)
                findings.append(
                    Finding(
                        category=rule["category"],
                        file_path=rel_path_str,
                        line_num=line_idx,
                        matched_text=matched_text,
                        suggestion=rule["suggestion"],
                        line_content=clean_line,
                    )
                )

    return findings


def main():
    parser = argparse.ArgumentParser(
        description="FormSight Design System Unification & Hardcoded Colors Scanner"
    )
    parser.add_argument(
        "--path",
        default="src",
        help="Root folder to scan (default: src)",
    )
    parser.add_argument(
        "--category",
        "-c",
        help="Filter by specific category keyword (e.g. 'button', 'Hex', 'Slate')",
    )
    parser.add_argument(
        "--summary-only",
        "-s",
        action="store_true",
        help="Only display summary table and score",
    )
    args = parser.parse_args()

    root_path = Path(args.path).resolve()
    if not root_path.exists():
        print(f"{RED}Error: Target path '{root_path}' does not exist.{RESET}")
        sys.exit(1)

    project_root = root_path if root_path.name != "src" else root_path.parent

    all_findings: list[Finding] = []

    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file.endswith((".ts", ".tsx")):
                full_file_path = Path(root) / file
                findings = scan_file(full_file_path, project_root)
                all_findings.extend(findings)

    if args.category:
        kw = args.category.lower()
        all_findings = [f for f in all_findings if kw in f.category.lower()]

    # Aggregate metrics
    category_counts = defaultdict(int)
    file_counts = defaultdict(int)

    for f in all_findings:
        category_counts[f.category] += 1
        file_counts[f.file_path] += 1

    print(f"\n{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════{RESET}")
    print(f" {BOLD}{MAGENTA}🔍 FormSight Design System Unification Scanner Report{RESET}")
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════{RESET}\n")

    if not args.summary_only:
        # Group by file
        grouped_by_file = defaultdict(list)
        for f in all_findings:
            grouped_by_file[f.file_path].append(f)

        sorted_files = sorted(grouped_by_file.keys(), key=lambda k: len(grouped_by_file[k]), reverse=True)

        for fpath in sorted_files:
            items = grouped_by_file[fpath]
            print(f"{BOLD}{YELLOW}📂 {fpath}{RESET} {DIM}({len(items)} issues){RESET}")
            for item in items:
                print(f"  {DIM}Line {item.line_num:>3}:{RESET} [{CYAN}{item.category}{RESET}] {RED}{item.matched_text}{RESET}")
                print(f"    {DIM}Snippet:{RESET} {item.line_content[:95]}")
                print(f"    {GREEN}💡 Tip:{RESET} {item.suggestion}")
            print()

    # Summary Section
    print(f"{BOLD}{CYAN}─────────────────────────── Summary Statistics ───────────────────────────{RESET}")
    print(f"Total unification opportunities detected: {BOLD}{RED if all_findings else GREEN}{len(all_findings)}{RESET}\n")

    print(f"{BOLD}📊 By Category:{RESET}")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {cat:<36} : {BOLD}{count:>4}{RESET}")

    print(f"\n{BOLD}🏆 Top 5 Files with Most Opportunities:{RESET}")
    top_files = sorted(file_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    if top_files:
        for fpath, count in top_files:
            print(f"  • {fpath:<50} : {BOLD}{YELLOW}{count:>3}{RESET} items")
    else:
        print(f"  {GREEN}🎉 Great job! No files need unification.{RESET}")

    print(f"\n{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════{RESET}\n")


if __name__ == "__main__":
    main()