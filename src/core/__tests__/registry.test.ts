import { describe, expect, it } from 'vitest';
import { getCardTitle } from '../../core/i18n';
import { qualifyAnalyticsViews, qualifyCardKey, registry } from '../../core/registry';

/**
 * 注册表与倒排索引契约（G1-09）
 *
 * 同维多值取并集、跨维取交集；qualified key 只补全一次；
 * 能力标签由 manifest 自动推导，禁止手写漂移。
 */

describe('qualifyCardKey / qualifyAnalyticsViews', () => {
  it('相对 key 补全 cards.<id>. 前缀', () => {
    expect(qualifyCardKey('title', 'star_single')).toBe('cards.star_single.title');
    expect(qualifyCardKey('.title', 'star_single')).toBe('cards.star_single.title');
  });

  it('已是 cards. / global. 前缀的 key 不重复补全', () => {
    expect(qualifyCardKey('cards.star_single.title', 'star_single')).toBe(
      'cards.star_single.title',
    );
    expect(qualifyCardKey('global.appName', 'star_single')).toBe('global.appName');
  });

  it('undefined 透传', () => {
    expect(qualifyCardKey(undefined, 'star_single')).toBeUndefined();
  });

  it('分析视图只补全标签字段，保留 id 与渲染函数', () => {
    const render = () => null;
    const [view] = qualifyAnalyticsViews(
      [
        {
          id: 'v1',
          tabLabel: 'tab',
          title: 'cards.x.title',
          subTitle: 'sub',
          renderVisualizer: render,
          renderDiagnostics: render,
        },
      ],
      'x',
    );

    expect(view.id).toBe('v1');
    expect(view.tabLabel).toBe('cards.x.tab');
    expect(view.title).toBe('cards.x.title');
    expect(view.subTitle).toBe('cards.x.sub');
    expect(view.renderVisualizer).toBe(render);
  });

  it('空视图数组返回空数组', () => {
    expect(qualifyAnalyticsViews(undefined, 'x')).toEqual([]);
  });
});

describe('queryCards 倒排索引语义', () => {
  const all = registry.getAllCards();

  it('返回全部卡片且 id 唯一', () => {
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map((card) => card.id)).size).toBe(all.length);
  });

  it('同维多值取并集', () => {
    const domains = Array.from(new Set(all.flatMap((card) => card.tags.domain))).slice(0, 2);
    const result = registry.queryCards({ domains });

    expect(result.length).toBeGreaterThan(0);
    for (const card of result) {
      expect(card.tags.domain.some((domain) => domains.includes(domain))).toBe(true);
    }
  });

  it('跨维取交集', () => {
    const domain = all[0].tags.domain[0];
    const interaction = all[0].tags.interaction[0];
    const result = registry.queryCards({ domains: [domain], interactions: [interaction] });

    expect(result.length).toBeGreaterThan(0);
    for (const card of result) {
      expect(card.tags.domain).toContain(domain);
      expect(card.tags.interaction).toContain(interaction);
    }
  });

  it('能力标签由 manifest 推导且互斥', () => {
    const withSettings = registry.queryCards({ features: ['has_settings'] });
    const withoutSettings = registry.queryCards({ features: ['no_settings'] });

    expect(withSettings.length + withoutSettings.length).toBe(all.length);
    expect(withSettings.every((card) => card.hasCustomSettings)).toBe(true);
    expect(withoutSettings.every((card) => !card.hasCustomSettings)).toBe(true);
  });

  it('按卡片 id 检索', () => {
    const result = registry.queryCards({ searchKeyword: 'star_single' });

    expect(result.map((card) => card.id)).toContain('star_single');
  });

  it('按翻译后的标题检索', () => {
    const card = all[0];
    const title = getCardTitle(card);
    const result = registry.queryCards({ searchKeyword: title.slice(0, 2) });

    expect(result.map((item) => item.id)).toContain(card.id);
  });

  it('无匹配关键词返回空数组', () => {
    expect(registry.queryCards({ searchKeyword: 'no_such_card_zzz' })).toEqual([]);
  });

  it('getCardById / getCardManifest 对未知 id 返回 undefined', () => {
    expect(registry.getCardById('ghost_card')).toBeUndefined();
    expect(registry.getCardManifest('ghost_card')).toBeUndefined();
    expect(registry.getAnalyticsPluginByCardId('ghost_card')).toBeUndefined();
  });
});
