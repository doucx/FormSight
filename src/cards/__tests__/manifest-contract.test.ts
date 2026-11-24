import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import type { CardManifest } from '../../core/cardContract';
import { i18n } from '../../core/i18n';
import { registry } from '../../core/registry';
import { buildDefaultCardSettings } from '../../storage/settings';

/**
 * CardManifest 五段契约（G1-09 / docs/architecture.md §2）
 *
 * 卡片是一等公民：目录名即 id，engine/ui 必须完整，标签必须落在封闭联合内，
 * 分析视图 key 必须能被 i18n 解析。任何漂移都应是确定性红灯。
 */

const manifestModules = import.meta.glob<{ default: CardManifest }>('../*/index.tsx', {
  eager: true,
});

const manifests = Object.entries(manifestModules).map(([modulePath, mod]) => ({
  modulePath,
  dirName: modulePath.match(/^\.\.\/([^/]+)\/index\.tsx$/)?.[1] ?? '',
  manifest: mod.default,
}));

const domainValues = new Set(Object.keys(DOMAIN_TAGS));
const pathValues = new Set(Object.keys(PATH_TAGS));
const challengeValues = new Set(Object.keys(CHALLENGE_TAGS));
const interactionValues = new Set(Object.keys(INTERACTION_TAGS));
const statusValues = new Set(Object.keys(STATUS_TAGS));

describe('CardManifest 契约 (G1-09)', () => {
  it('发现全部卡片清单', () => {
    expect(manifests.length).toBeGreaterThan(0);
    expect(manifests.every((entry) => entry.manifest?.id)).toBe(true);
  });

  it('卡片 id 全局唯一且等于目录名', () => {
    const ids = manifests.map((entry) => entry.manifest.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of manifests) {
      expect(entry.manifest.id).toBe(entry.dirName);
    }
  });

  it('domain 属于 tags.domain 且落在封闭联合内', () => {
    for (const { manifest } of manifests) {
      expect(manifest.tags.domain).toContain(manifest.domain);
      expect(domainValues.has(manifest.domain)).toBe(true);
    }
  });

  it('tags 各维取值都在封闭联合内，且必填维非空', () => {
    for (const { manifest } of manifests) {
      expect(manifest.tags.domain.length).toBeGreaterThan(0);
      expect(manifest.tags.path.length).toBeGreaterThan(0);
      expect(manifest.tags.interaction.length).toBeGreaterThan(0);

      for (const value of manifest.tags.domain) expect(domainValues.has(value)).toBe(true);
      for (const value of manifest.tags.path) expect(pathValues.has(value)).toBe(true);
      for (const value of manifest.tags.challenge ?? []) {
        expect(challengeValues.has(value)).toBe(true);
      }
      for (const value of manifest.tags.interaction) {
        expect(interactionValues.has(value)).toBe(true);
      }
      if (manifest.tags.status) expect(statusValues.has(manifest.tags.status)).toBe(true);
    }
  });

  it('engine 三函数与 ui 两函数必须存在', () => {
    for (const { manifest } of manifests) {
      expect(typeof manifest.engine.generateQuestion).toBe('function');
      expect(typeof manifest.engine.evaluateAnswer).toBe('function');
      expect(typeof manifest.engine.isHit).toBe('function');
      expect(typeof manifest.ui.icon).toBe('function');
      expect(typeof manifest.ui.renderCanvas).toBe('function');
    }
  });

  it('两种语言的私有词典都存在', () => {
    for (const { manifest } of manifests) {
      expect(manifest.locales?.['zh-CN']).toBeTypeOf('object');
      expect(manifest.locales?.['en-US']).toBeTypeOf('object');
    }
  });

  it('分析视图 key 由 cards.<id>. 补全且可被 i18n 解析', () => {
    for (const { manifest } of manifests) {
      const plugin = registry.getAnalyticsPluginByCardId(manifest.id);
      const cardViews = plugin?.views.filter((view) => !view.id.startsWith('universal_')) ?? [];

      for (const view of cardViews) {
        for (const key of [view.tabLabel, view.title, view.subTitle]) {
          expect(key.startsWith(`cards.${manifest.id}.`)).toBe(true);
          expect(i18n.t(key)).not.toBe(key);
        }
      }
    }
  });

  it('注册表为每张卡生成默认设置；连续调制卡补齐滑块命中域', () => {
    const defaults = buildDefaultCardSettings();

    for (const { manifest } of manifests) {
      expect(defaults[manifest.id]).toBeDefined();

      if (manifest.tags.interaction.includes('continuous_mod')) {
        expect(typeof defaults[manifest.id].sliderHitMargin).toBe('number');
        expect(typeof defaults[manifest.id].showToleranceBand).toBe('boolean');
      }
    }
  });

  it('分析插件始终包含通用视图与可用的记录读取器', () => {
    for (const { manifest } of manifests) {
      const plugin = registry.getAnalyticsPluginByCardId(manifest.id);

      expect(plugin).toBeDefined();
      expect(typeof plugin?.fetchRecords).toBe('function');
      expect(plugin?.views.some((view) => view.id.startsWith('universal_'))).toBe(true);
    }
  });

  it('注册表能力标签与 manifest 声明一致', () => {
    for (const { manifest } of manifests) {
      const card = registry.getCardById(manifest.id);

      expect(card?.hasCustomSettings).toBe(Boolean(manifest.ui.renderSettings));
      expect(card?.hasDedicatedAnalytics).toBe(
        Boolean(manifest.analytics?.views && manifest.analytics.views.length > 0),
      );
      expect(card?.hasWeaknessAnalytics).toBe(card?.hasDedicatedAnalytics);
    }
  });
});
