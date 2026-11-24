import argparse
import re
import sys
from pathlib import Path

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

CARD_SDK_SPECIFIER = "@formsight/card-sdk"


def resolve_relative(source_file: Path, specifier: str) -> bool:
    base_dir = source_file.parent
    target_base = (base_dir / specifier).resolve()

    for ext in EXTENSIONS_TO_TRY:
        candidate = Path(str(target_base) + ext)
        if candidate.is_file():
            return True

    return False


def escapes_cards(source_file: Path, specifier: str, cards_dir: Path) -> bool:
    """卡片只能通过 @formsight/card-sdk 引用宿主；相对越界与 @/ 别名均视为越界。"""
    if specifier == CARD_SDK_SPECIFIER:
        return False
    if specifier.startswith("@/"):
        return True

    target = (source_file.parent / specifier).resolve()
    try:
        target.relative_to(cards_dir.resolve())
    except ValueError:
        return True
    return False


def scan_all_imports(root: Path, resolve_only: bool) -> tuple[bool, int, int]:
    src = root / "src"
    cards_dir = src / "cards"
    files = list(src.rglob("*.ts")) + list(src.rglob("*.tsx"))
    unresolved = []
    boundary = []
    total_imports = 0

    for file_path in files:
        content = file_path.read_text(encoding="utf-8")
        is_card_file = cards_dir in file_path.parents

        for line_idx, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*"):
                continue

            for match in IMPORT_REGEX.finditer(line):
                specifier = match.group(1) or match.group(2)
                if not specifier:
                    continue

                total_imports += 1
                if specifier.startswith(".") and not resolve_relative(file_path, specifier):
                    unresolved.append((file_path, line_idx, specifier, stripped))
                if is_card_file and escapes_cards(file_path, specifier, cards_dir):
                    boundary.append((file_path, line_idx, specifier))

    print(f"Scanned {len(files)} files, {total_imports} total import/export statements.")

    if unresolved:
        print(f"\n❌ Found {len(unresolved)} unresolved import(s):\n")
        for file_path, line_idx, specifier, code in unresolved:
            print(f"  {file_path.relative_to(root)}:{line_idx}")
            print(f"    Import: '{specifier}'")
            print(f"    Code:   {code}\n")

    if boundary:
        label = "WARN" if resolve_only else "FAIL"
        print(f"\n{label}: {len(boundary)} card import(s) escape src/cards (use @formsight/card-sdk):\n")
        for file_path, line_idx, specifier in boundary:
            print(f"  {file_path.relative_to(root)}:{line_idx} -> '{specifier}'")

    if not unresolved and not boundary:
        print("\n✅ All relative imports resolved successfully!")
    elif not unresolved and resolve_only:
        print("\n✅ Relative imports resolved; boundary findings are advisory under --resolve-only.")

    return (not unresolved and (resolve_only or not boundary)), len(unresolved), len(boundary)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check relative imports and card boundary imports.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parent.parent))
    parser.add_argument(
        "--resolve-only",
        action="store_true",
        help="Only unresolved imports block; card boundary escapes are advisory.",
    )
    args = parser.parse_args()

    passed, _, _ = scan_all_imports(Path(args.root).resolve(), args.resolve_only)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
