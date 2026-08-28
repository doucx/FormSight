#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FormSight i18n 完整性与未翻译/硬编码中文静态检查门禁脚本
支持检查：
1. 语言包键双语对齐（zh-CN vs en-US）
2. 代码中 t('...') / i18nKey 调用的键是否存在
3. 源码 (.ts, .tsx) 中的硬编码中文字符串定位
"""

import os
import sys
import re
import json
from pathlib import Path
from typing import Dict, Set, List, Tuple

# 终端 ANSI 彩色高亮支持
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"

def flatten_dict(d: dict, prefix: str = "") -> Dict[str, str]:
    """将多层嵌套字典展平为 'a.b.c' 格式的键值映射"""
    items = {}
    for k, v in d.items():
        new_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, new_key))
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    items.update(flatten_dict(item, f"{new_key}[{i}]"))
                else:
                    items[f"{new_key}[{i}]"] = str(item)
        else:
            items[new_key] = str(v)
    return items

def load_all_locales() -> Tuple[Dict[str, str], Dict[str, str]]:
    """收集并合并全局与所有 Packs 的语言包字典"""
    zh_dict: Dict[str, str] = {}
    en_dict: Dict[str, str] = {}

    # 1. 全局词典
    global_zh_path = SRC_DIR / "locales" / "zh-CN.json"
    global_en_path = SRC_DIR / "locales" / "en-US.json"
    
    if global_zh_path.exists():
        with open(global_zh_path, "r", encoding="utf-8") as f:
            zh_dict.update(flatten_dict(json.load(f)))
    if global_en_path.exists():
        with open(global_en_path, "r", encoding="utf-8") as f:
            en_dict.update(flatten_dict(json.load(f)))

    # 2. 遍历各 Packs 私有词典
    packs_dir = SRC_DIR / "packs"
    if packs_dir.exists():
        for pack_path in packs_dir.iterdir():
            if pack_path.is_dir():
                pack_id = pack_path.name
                p_zh = pack_path / "locales" / "zh-CN.json"
                p_en = pack_path / "locales" / "en-US.json"

                if p_zh.exists():
                    with open(p_zh, "r", encoding="utf-8") as f:
                        zh_dict.update(flatten_dict(json.load(f), prefix=f"packs.{pack_id}"))
                if p_en.exists():
                    with open(p_en, "r", encoding="utf-8") as f:
                        en_dict.update(flatten_dict(json.load(f), prefix=f"packs.{pack_id}"))

    return zh_dict, en_dict

def check_locale_parity(zh_dict: Dict[str, str], en_dict: Dict[str, str]) -> bool:
    """检查双语词典对齐状态"""
    print(f"\n{BOLD}{CYAN}=== 1. 语言包双向对齐检查 (Locale Parity) ==={RESET}")
    zh_keys = set(zh_dict.keys())
    en_keys = set(en_dict.keys())

    missing_in_en = zh_keys - en_keys
    missing_in_zh = en_keys - zh_keys

    passed = True
    if missing_in_en:
        passed = False
        print(f"{RED}[FAIL] 以下键存在于 zh-CN 中，但在 en-US 中缺失 (共 {len(missing_in_en)} 个):{RESET}")
        for k in sorted(missing_in_en):
            print(f"  {RED}- {k}{RESET} (中文值: '{zh_dict[k]}')")

    if missing_in_zh:
        passed = False
        print(f"{RED}[FAIL] 以下键存在于 en-US 中，但在 zh-CN 中缺失 (共 {len(missing_in_zh)} 个):{RESET}")
        for k in sorted(missing_in_zh):
            print(f"  {RED}- {k}{RESET} (英文值: '{en_dict[k]}')")

    if passed:
        print(f"{GREEN}[PASS] zh-CN 与 en-US 词典键 100% 对齐一致 (共 {len(zh_keys)} 个词条){RESET}")
    return passed

def check_source_key_usages(valid_keys: Set[str]) -> bool:
    """检查源码中静态引用的 i18n 键是否存在"""
    print(f"\n{BOLD}{CYAN}=== 2. 源码静态 i18n Key 引用有效性检查 ==={RESET}")
    # 匹配 t('xxx'), t("xxx"), i18nKey: 'xxx', titleKey: 'xxx', descKey: 'xxx'
    key_patterns = [
        re.compile(r"""\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]"""),
        re.compile(r"""\bi18nKey:\s*['"]([a-zA-Z0-9_.]+)['"]"""),
        re.compile(r"""\btitleKey:\s*['"]([a-zA-Z0-9_.]+)['"]"""),
        re.compile(r"""\bdescKey:\s*['"]([a-zA-Z0-9_.]+)['"]"""),
        re.compile(r"""\btabLabelKey:\s*['"]([a-zA-Z0-9_.]+)['"]"""),
    ]

    missing_refs: List[Tuple[str, int, str]] = []

    for file_path in SRC_DIR.rglob("*"):
        if file_path.suffix in [".ts", ".tsx"] and not file_path.name.endswith(".d.ts"):
            rel_path = file_path.relative_to(ROOT_DIR)
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line_idx, line in enumerate(lines, 1):
                    for pattern in key_patterns:
                        for match in pattern.finditer(line):
                            used_key = match.group(1)
                            # 过滤纯动态模板或太短的标识
                            if "." in used_key and used_key not in valid_keys:
                                missing_refs.append((str(rel_path), line_idx, used_key))

    if missing_refs:
        print(f"{RED}[FAIL] 发现代码中引用了未在词典中定义的 i18n Key (共 {len(missing_refs)} 处):{RESET}")
        for path, line_no, key in missing_refs:
            print(f"  {RED}× {path}:{line_no}{RESET} -> 找不到 key: {BOLD}'{key}'{RESET}")
        return False
    else:
        print(f"{GREEN}[PASS] 所有静态引用的 i18n Key 均在词典池中存在{RESET}")
        return True

def check_hardcoded_chinese() -> bool:
    """扫描源码中遗漏的硬编码中文字符串"""
    print(f"\n{BOLD}{CYAN}=== 3. 源码硬编码中文字符串扫描 (Hardcoded Chinese) ==={RESET}")
    chinese_pattern = re.compile(r"[\u4e00-\u9fff]")
    
    # 忽略目录与文件
    ignored_patterns = [
        "locales",               # 语言包 json 目录
        "vite-env.d.ts",
        ".test.",
        "__tests__"
    ]

    violations: List[Tuple[str, int, str]] = []

    for file_path in SRC_DIR.rglob("*"):
        if file_path.suffix in [".ts", ".tsx"] and not file_path.name.endswith(".d.ts"):
            rel_path_str = str(file_path.relative_to(ROOT_DIR))
            
            if any(ign in rel_path_str for ign in ignored_patterns):
                continue

            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                in_multiline_comment = False

                for line_idx, line in enumerate(lines, 1):
                    stripped = line.strip()
                    
                    # 简易多行注释跳过
                    if "/*" in stripped and "*/" not in stripped:
                        in_multiline_comment = True
                        continue
                    if "*/" in stripped:
                        in_multiline_comment = False
                        continue
                    if in_multiline_comment or stripped.startswith("//") or stripped.startswith("*"):
                        continue

                    # 移除行内注释
                    code_part = line.split("//")[0]

                    if chinese_pattern.search(code_part):
                        violations.append((rel_path_str, line_idx, stripped))

    if violations:
        print(f"{YELLOW}[WARN] 发现源码中包含硬编码中文（建议全部抽离至 locales/*.json 并使用 t() 查表）(共 {len(violations)} 处):{RESET}")
        for path, line_no, content in violations:
            # 截短超长行以保持整洁输出
            display_content = content if len(content) <= 100 else content[:97] + "..."
            print(f"  {YELLOW}• {path}:{line_no}{RESET}\n    {display_content}")
        return False
    else:
        print(f"{GREEN}[PASS] 源码已完全纯净化，未发现硬编码中文！{RESET}")
        return True

def main():
    print(f"{BOLD}{GREEN}>>> 启动 FormSight 本地化与国际化合规性检查 <<<{RESET}")
    zh_dict, en_dict = load_all_locales()
    
    parity_ok = check_locale_parity(zh_dict, en_dict)
    valid_keys = set(zh_dict.keys()) | set(en_dict.keys())
    usage_ok = check_source_key_usages(valid_keys)
    hardcoded_ok = check_hardcoded_chinese()

    print(f"\n{BOLD}{'=' * 55}{RESET}")
    if parity_ok and usage_ok and hardcoded_ok:
        print(f"{BOLD}{GREEN}🎉 所有 i18n 检查项全部通过！系统国际化状态稳健。{RESET}\n")
        sys.exit(0)
    else:
        print(f"{BOLD}{RED}❌ 存在 i18n 缺失或硬编码中文，请参考上方提示进行修复。{RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
