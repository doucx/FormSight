import os
import re
import shutil
from pathlib import Path

ROOT = Path("/home/doucx/Documents/Projects/FormSight")
SRC = ROOT / "src"

def step_make_dirs():
    dirs = [
        SRC / "components" / "modals",
        SRC / "core" / "canvas" / "charts",
        SRC / "storage" / "db",
        SRC / "types",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    print("✓ Created target directories")

def step_move_files():
    moves = [
        # Components
        (SRC / "components" / "GlobalSettingsModal.tsx", SRC / "components" / "modals" / "GlobalSettingsModal.tsx"),
        (SRC / "components" / "SettingsModal.tsx", SRC / "components" / "modals" / "SettingsModal.tsx"),
        (SRC / "components" / "SessionSummaryModal.tsx", SRC / "components" / "modals" / "SessionSummaryModal.tsx"),
        (SRC / "components" / "HsvTrackSlider.tsx", SRC / "components" / "common" / "HsvTrackSlider.tsx"),
        # Canvas
        (SRC / "utils" / "canvas" / "drawColorRing.ts", SRC / "core" / "canvas" / "charts" / "drawColorRing.ts"),
        (SRC / "utils" / "canvas" / "drawCompass.ts", SRC / "core" / "canvas" / "charts" / "drawCompass.ts"),
        (SRC / "utils" / "canvas" / "drawHeatmap.ts", SRC / "core" / "canvas" / "charts" / "drawHeatmap.ts"),
        (SRC / "utils" / "canvas" / "drawHueBiasChart.ts", SRC / "core" / "canvas" / "charts" / "drawHueBiasChart.ts"),
        (SRC / "utils" / "canvas" / "drawTrendChart.ts", SRC / "core" / "canvas" / "charts" / "drawTrendChart.ts"),
        # Storage / DB
        (SRC / "utils" / "db" / "schema.ts", SRC / "storage" / "db" / "schema.ts"),
        (SRC / "utils" / "db" / "queries.ts", SRC / "storage" / "db" / "queries.ts"),
        (SRC / "utils" / "db" / "prune.ts", SRC / "storage" / "db" / "prune.ts"),
        (SRC / "utils" / "db" / "importExport.ts", SRC / "storage" / "db" / "importExport.ts"),
        (SRC / "utils" / "db" / "repository.ts", SRC / "storage" / "repository.ts"),
        (SRC / "utils" / "db" / "index.ts", SRC / "storage" / "db" / "index.ts"),
        (SRC / "utils" / "planStorage.ts", SRC / "storage" / "planStorage.ts"),
        (SRC / "utils" / "settings.ts", SRC / "storage" / "settings.ts"),
        # Views
        (SRC / "views" / "Home.tsx", SRC / "views" / "HomeView.tsx"),
    ]

    for src_p, dst_p in moves:
        if src_p.exists():
            dst_p.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src_p), str(dst_p))
            print(f"✓ Moved {src_p.relative_to(SRC)} -> {dst_p.relative_to(SRC)}")

    # Clean up empty utils/canvas, utils/db
    if (SRC / "utils" / "canvas").exists():
        shutil.rmtree(str(SRC / "utils" / "canvas"))
    if (SRC / "utils" / "db").exists():
        shutil.rmtree(str(SRC / "utils" / "db"))

def step_create_storage_index():
    storage_index_content = """export * from './db/index';
export * from './planStorage';
export * from './settings';
export * from './repository';
"""
    (SRC / "storage" / "index.ts").write_text(storage_index_content, encoding="utf-8")
    print("✓ Created src/storage/index.ts")

def step_merge_training_plugins():
    # Merge src/config/trainingPlugins.tsx into src/core/contracts.ts
    training_plugins_path = SRC / "config" / "trainingPlugins.tsx"
    contracts_path = SRC / "core" / "contracts.ts"

    if training_plugins_path.exists():
        tp_content = training_plugins_path.read_text(encoding="utf-8")
        training_plugins_path.unlink()
        print("✓ Removed src/config/trainingPlugins.tsx")

        contracts_content = contracts_path.read_text(encoding="utf-8")
        
        # Replace the trainingPlugin import in contracts.ts
        contracts_content = re.sub(
            r"import\s+type\s+\{\s*AnyTrainingPlugin\s*\}\s+from\s+['\"].*trainingPlugins['\"];?\n?",
            "",
            contracts_content
        )

        # Append plugin definitions into contracts.ts
        merged_contracts = f"""import type {{ Point }} from '../types';
import type {{
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
}} from '../storage/settings';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {{
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}}

export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {{
  packId?: string;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}}

export type StarPlugin = TrainingPlugin<
  unknown,
  unknown,
  {{ clickPoint: Point; hitResult: unknown }},
  StarSettings
>;

export type ColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | [number, number, number],
  ColorSenseSettings
>;

export type RelativeColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
>;

export type NegativeSpacePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
>;

export type AbstractionPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B',
  AbstractionSettings
>;

export type AnglePlugin = TrainingPlugin<unknown, unknown, number | 'A' | 'B', BaseModuleSettings>;

export type PerspectivePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin
  | PerspectivePlugin;

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;

{contracts_content}
"""
        contracts_path.write_text(merged_contracts, encoding="utf-8")
        print("✓ Integrated training plugin contracts into src/core/contracts.ts")

def step_update_core_canvas_exports():
    canvas_index_path = SRC / "core" / "canvas" / "index.ts"
    canvas_index_content = """export * from './hidpi';
export * from './drawPointGrid';
export * from './drawPolygon';
export * from './charts/drawColorRing';
export * from './charts/drawCompass';
export * from './charts/drawHeatmap';
export * from './charts/drawHueBiasChart';
export * from './charts/drawTrendChart';
"""
    canvas_index_path.write_text(canvas_index_content, encoding="utf-8")
    print("✓ Created src/core/canvas/index.ts")

def step_rewrite_imports():
    all_files = list(SRC.rglob("*.ts")) + list(SRC.rglob("*.tsx"))

    for f in all_files:
        content = f.read_text(encoding="utf-8")
        orig = content

        # 1. Update config/trainingPlugins -> core/contracts or config/trainingPlugins
        content = re.sub(
            r"(['\"])(\.\./)+config/trainingPlugins(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"core/contracts\3",
            content
        )
        content = re.sub(
            r"(['\"])(\.\./)+config/trainingPlugins\.tsx(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"core/contracts\3",
            content
        )

        # 2. Update utils/canvas/* -> core/canvas/*
        content = re.sub(
            r"(['\"])(\.\./)+utils/canvas/([^'\"]+)(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"core/canvas/charts/\3\4",
            content
        )

        # 3. Update utils/db/* or utils/db -> storage/db/* or storage/db
        content = re.sub(
            r"(['\"])(\.\./)+utils/db(/[^'\"]*)?(['\"])",
            lambda m: m.group(1) + "../" * (len(f.relative_to(SRC).parts) - 1) + "storage" + (m.group(3) if m.group(3) else "") + m.group(4),
            content
        )

        # 4. Update utils/planStorage -> storage/planStorage
        content = re.sub(
            r"(['\"])(\.\./)+utils/planStorage(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"storage/planStorage\3",
            content
        )

        # 5. Update utils/settings -> storage/settings
        content = re.sub(
            r"(['\"])(\.\./)+utils/settings(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"storage/settings\3",
            content
        )

        # 6. Update HsvTrackSlider -> components/common/HsvTrackSlider
        content = re.sub(
            r"(['\"])(\.\./)+components/HsvTrackSlider(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"components/common/HsvTrackSlider\3",
            content
        )

        # 7. Update SessionSummaryModal -> components/modals/SessionSummaryModal
        content = re.sub(
            r"(['\"])(\.\./)+components/SessionSummaryModal(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"components/modals/SessionSummaryModal\3",
            content
        )

        # 8. Update GlobalSettingsModal -> components/modals/GlobalSettingsModal
        content = re.sub(
            r"(['\"])(\.\./)+components/GlobalSettingsModal(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"components/modals/GlobalSettingsModal\3",
            content
        )

        # 9. Update SettingsModal -> components/modals/SettingsModal
        content = re.sub(
            r"(['\"])(\.\./)+components/SettingsModal(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"components/modals/SettingsModal\3",
            content
        )

        # 10. Update views/Home -> views/HomeView
        content = re.sub(
            r"(['\"])(\.\./)+views/Home(['\"])",
            r"\1" + "../" * (len(f.relative_to(SRC).parts) - 1) + r"views/HomeView\3",
            content
        )
        content = re.sub(
            r"\bimport\s*\{\s*Home\s*\}\s*from",
            "import { HomeView } from",
            content
        )
        content = re.sub(
            r"<Home\s",
            "<HomeView ",
            content
        )

        # Normalization of ../../core/canvas/charts/drawPointGrid etc if any
        content = re.sub(r"/core/canvas/charts/drawPointGrid", r"/core/canvas/drawPointGrid", content)
        content = re.sub(r"/core/canvas/charts/drawPolygon", r"/core/canvas/drawPolygon", content)
        content = re.sub(r"/core/canvas/charts/hidpi", r"/core/canvas/hidpi", content)

        if content != orig:
            f.write_text(content, encoding="utf-8")
            print(f"✓ Updated imports in {f.relative_to(SRC)}")

def main():
    print("=== Starting FormSight Architecture Refactoring ===")
    step_make_dirs()
    step_move_files()
    step_create_storage_index()
    step_merge_training_plugins()
    step_update_core_canvas_exports()
    step_rewrite_imports()
    print("=== Refactoring Completed Successfully ===")

if __name__ == "__main__":
    main()