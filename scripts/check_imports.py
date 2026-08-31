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