import type { ComponentChildren } from 'preact';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition, PackMeta } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

/**
 * 扩展包清单 (Pack Manifest)
 * v0.4.x 核心插件规范：任何独立内容扩展包（Pack）均遵循此清单
 */
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

export type AnyManifest = PackManifest;
