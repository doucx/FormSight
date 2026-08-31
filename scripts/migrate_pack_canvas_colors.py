#!/usr/bin/env python3
"""
自动化迁移 src/packs/ 内部 Canvas 与组件中的硬编码色值至 CANVAS_THEME / PALETTE Tokens
"""

import os
import re
from pathlib import Path

# 计算相对引用路径
def get_theme_import_path(file_path: Path, repo_root: Path) -> str:
    theme_file = repo_root / "src" / "utils" / "theme.ts"
    rel_path = os.path.relpath(theme_file.parent, file_path.parent)
    if not rel_path.startswith("."):
        rel_path = "./" + rel_path
    return f"{rel_path}/theme".replace("\\", "/")


def process_perspective_canvas(content: str, theme_import: str) -> str:
    # 1. 注入 import
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME, hexToRgba }} from '{theme_import}';\n" + content

    replacements = [
        ("ctx.strokeStyle = '#475569';", "ctx.strokeStyle = CANVAS_THEME.text.secondary;"),
        ("ctx.fillStyle = '#4F46E5';", "ctx.fillStyle = CANVAS_THEME.status.accent;"),
        ("ctx.strokeStyle = showAnswer ? '#94A3B8' : '#0F172A';", "ctx.strokeStyle = showAnswer ? CANVAS_THEME.text.muted : CANVAS_THEME.shape.fill;"),
        ("ctx.strokeStyle = '#10B981';", "ctx.strokeStyle = CANVAS_THEME.status.hit;"),
        ("ctx.strokeStyle = '#0F172A';", "ctx.strokeStyle = CANVAS_THEME.shape.fill;"),
        ("ctx.strokeStyle = '#4F46E5';", "ctx.strokeStyle = CANVAS_THEME.status.accent;"),
        ("ctx.fillStyle = '#94A3B8';", "ctx.fillStyle = CANVAS_THEME.text.muted;"),
        ("ctx.fillStyle = 'rgba(79, 70, 229, 0.2)';", "ctx.fillStyle = hexToRgba(CANVAS_THEME.status.accent, 0.2);"),
        ("ctx.fillStyle = '#10B981';", "ctx.fillStyle = CANVAS_THEME.status.hit;"),
        ("ctx.fillStyle = '#EF4444';", "ctx.fillStyle = CANVAS_THEME.status.miss;"),
        ("ctx.fillStyle = '#FFFFFF';", "ctx.fillStyle = CANVAS_THEME.bg.primary;"),
        ("ctx.fillStyle = '#CBD5E1';", "ctx.fillStyle = CANVAS_THEME.axis.grid;"),
        ("ctx.strokeStyle = '#64748B';", "ctx.strokeStyle = CANVAS_THEME.text.secondary;"),
        ("ctx.strokeStyle = '#CBD5E1';", "ctx.strokeStyle = CANVAS_THEME.axis.grid;"),
    ]
    for old, new in replacements:
        content = content.replace(old, new)
    return content


def process_abstraction_particles(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content

    replacements = [
        ("axisColor = '#22C55E'", "axisColor: string = CANVAS_THEME.status.hit"),
        ("ctx.fillStyle = '#0F172A';", "ctx.fillStyle = CANVAS_THEME.shape.fill;"),
        ("ctx.strokeStyle = isHit ? '#22C55E' : '#EF4444';", "ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;"),
        ("ctx.strokeStyle = '#4F46E5';", "ctx.strokeStyle = CANVAS_THEME.status.accent;"),
        ("ctx.fillStyle = '#4F46E5';", "ctx.fillStyle = CANVAS_THEME.status.accent;"),
    ]
    for old, new in replacements:
        content = content.replace(old, new)
    return content


def process_abstraction_palette_tiles(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME, hexToRgba }} from '{theme_import}';\n" + content
    return content.replace("ctx.strokeStyle = 'rgba(255,255,255,0.4)';", "ctx.strokeStyle = hexToRgba(CANVAS_THEME.bg.primary, 0.4);")


def process_gesture_axis_view(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content
    return content.replace("showAnswer ? '#22C55E' : '#6366F1'", "showAnswer ? CANVAS_THEME.status.hit : CANVAS_THEME.status.accentHover")


def process_topdown_2afc_view(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content
    content = content.replace("fillColor: '#4F46E5',\n                strokeColor: '#3730A3'", "fillColor: CANVAS_THEME.status.accent,\n                strokeColor: CANVAS_THEME.status.accentDark")
    content = content.replace("fillColor: '#4F46E5'", "fillColor: CANVAS_THEME.status.accent")
    return content


def process_topdown_pattern_view(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content
    return content.replace(": '#6366F1';", ": CANVAS_THEME.status.accentHover;")


def process_angle_utils(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content
    return content.replace("strokeColor = '#0F172A'", "strokeColor: string = CANVAS_THEME.shape.fill")


def process_angle_parallel_view(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content
    content = content.replace("ANGLE_PROMPT_SIZE, '#4F46E5', 3.0", "ANGLE_PROMPT_SIZE, CANVAS_THEME.status.accent, 3.0")
    content = content.replace("ANGLE_2AFC_SIZE, '#0F172A', 2.5", "ANGLE_2AFC_SIZE, CANVAS_THEME.shape.fill, 2.5")
    return content


def process_negative_space_views(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME, hexToRgba }} from '{theme_import}';\n" + content
    replacements = [
        ("fillColor: '#0F172A',\n                  strokeColor: '#1E293B',", "fillColor: CANVAS_THEME.shape.fill,\n                  strokeColor: CANVAS_THEME.shape.stroke,"),
        ("fillColor: '#0F172A',\n                strokeColor: '#1E293B',", "fillColor: CANVAS_THEME.shape.fill,\n                strokeColor: CANVAS_THEME.shape.stroke,"),
        ("fillColor: '#0F172A',\n      strokeColor: '#1E293B',", "fillColor: CANVAS_THEME.shape.fill,\n      strokeColor: CANVAS_THEME.shape.stroke,"),
        ("ctx.fillStyle = '#0F172A';", "ctx.fillStyle = CANVAS_THEME.shape.fill;"),
        ("ctx.strokeStyle = '#1E293B';", "ctx.strokeStyle = CANVAS_THEME.shape.stroke;"),
        ("ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';", "ctx.strokeStyle = hexToRgba(CANVAS_THEME.status.hit, 0.7);"),
    ]
    for old, new in replacements:
        content = content.replace(old, new)
    return content


def process_negative_space_analytics(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME, hexToRgba }} from '{theme_import}';\n" + content
    replacements = [
        ("ctx.fillStyle = '#1E293B';", "ctx.fillStyle = CANVAS_THEME.shape.stroke;"),
        ("ctx.strokeStyle = '#475569';", "ctx.strokeStyle = CANVAS_THEME.text.secondary;"),
        ("r.isHit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'", "r.isHit ? hexToRgba(CANVAS_THEME.status.hit, 0.7) : hexToRgba(CANVAS_THEME.status.miss, 0.7)"),
    ]
    for old, new in replacements:
        content = content.replace(old, new)
    return content


def process_star_canvas(content: str, theme_import: str) -> str:
    if "CANVAS_THEME" not in content:
        content = f"import {{ CANVAS_THEME }} from '{theme_import}';\n" + content
    replacements = [
        ("ctx.fillStyle = '#FFFFFF';", "ctx.fillStyle = CANVAS_THEME.bg.primary;"),
        ("drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);", "drawDot(ctx, question.anchorA.x, question.anchorA.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);"),
        ("drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);", "drawDot(ctx, question.anchorC.x, question.anchorC.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);"),
        ("drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);", "drawDot(ctx, question.targetB.x, question.targetB.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);"),
    ]
    for old, new in replacements:
        content = content.replace(old, new)
    return content


def process_decontextual_2afc_view(content: str, theme_import: str) -> str:
    if "PALETTE" not in content:
        content = f"import {{ PALETTE }} from '{theme_import}';\n" + content
    return content.replace("showAnswer ? '#808080' : hexBgA", "showAnswer ? PALETTE.slate[500] : hexBgA").replace("showAnswer ? '#808080' : hexBgB", "showAnswer ? PALETTE.slate[500] : hexBgB")


def main():
    repo_root = Path(__file__).resolve().parent.parent

    file_handlers = {
        repo_root / "src/packs/perspective/utils/perspectiveCanvas.ts": process_perspective_canvas,
        repo_root / "src/packs/abstraction/canvas/drawParticles.ts": process_abstraction_particles,
        repo_root / "src/packs/abstraction/canvas/drawPaletteTiles.ts": process_abstraction_palette_tiles,
        repo_root / "src/packs/abstraction/components/GestureAxisView.tsx": process_gesture_axis_view,
        repo_root / "src/packs/abstraction/components/TopDown2AfcView.tsx": process_topdown_2afc_view,
        repo_root / "src/packs/abstraction/components/TopDownPatternView.tsx": process_topdown_pattern_view,
        repo_root / "src/packs/angle/utils/angleUtils.ts": process_angle_utils,
        repo_root / "src/packs/angle/components/AngleParallel2AfcView.tsx": process_angle_parallel_view,
        repo_root / "src/packs/negative_space/components/AreaComparison2AfcView.tsx": process_negative_space_views,
        repo_root / "src/packs/negative_space/components/RatioEstimationView.tsx": process_negative_space_views,
        repo_root / "src/packs/negative_space/components/VertexFittingView.tsx": process_negative_space_views,
        repo_root / "src/packs/negative_space/analytics.tsx": process_negative_space_analytics,
        repo_root / "src/packs/star/views/StarCanvas.tsx": process_star_canvas,
        repo_root / "src/packs/relative_color/components/Decontextual2AfcView.tsx": process_decontextual_2afc_view,
    }

    modified_count = 0
    for target_path, handler in file_handlers.items():
        if not target_path.exists():
            print(f"跳过不存在的文件: {target_path}")
            continue

        theme_import = get_theme_import_path(target_path, repo_root)
        with open(target_path, "r", encoding="utf-8") as f:
            original = f.read()

        updated = handler(original, theme_import)
        if updated != original:
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"✅ 成功迁移: {target_path.relative_to(repo_root)}")
            modified_count += 1
        else:
            print(f"➖ 无需更改: {target_path.relative_to(repo_root)}")

    print(f"\n🎉 迁移完成，共更新 {modified_count} 个 Pack 模块文件。")


if __name__ == "__main__":
    main()