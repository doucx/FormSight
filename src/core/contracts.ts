import type { CardAnalyticsPlugin } from '../config/analyticsPlugins';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

/**
 * 领域包清单 (Domain Manifest)
 * 每一个垂直领域模块 (如 angle, star, color) 必须在 index.ts 中默认导出此对象
 */
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

/**
 * 向后兼容的 DomainPlugin 别名
 */
export type DomainPlugin = DomainManifest;
