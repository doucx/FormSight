import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScopedTranslator, getCardDesc, getCardTitle, i18n } from '../i18n';
import { registry } from '../registry';

/**
 * i18n 核心契约（G1-21）
 *
 * 缺失 key 回落原文、模板插值、数组查询、卡片作用域前缀与 locale 订阅
 * 是所有卡片文案的底座；任何语义漂移都会静默显示 key。
 */

const ORIGINAL_LOCALE = i18n.getLocale();

// 触发卡片词典注册（registry 自动发现依赖 import.meta.glob）
expect(registry.getAllCards().length).toBeGreaterThan(0);

afterEach(() => {
  i18n.setLocale(ORIGINAL_LOCALE);
});

describe('I18nManager 查表', () => {
  it('缺失 key 原样返回，便于定位', () => {
    expect(i18n.t('no.such.key.__zzz')).toBe('no.such.key.__zzz');
  });

  it('模板插值替换全部占位符', () => {
    i18n.registerGlobalLocales({
      'zh-CN': { __test_i18n: { greet: '你好 {{name}}，第 {{index}} 题' } },
    });

    expect(i18n.t('__test_i18n.greet', { name: '世界', index: 3 })).toBe('你好 世界，第 3 题');
  });

  it('缺少插值参数时保留占位符', () => {
    i18n.registerGlobalLocales({
      'zh-CN': { __test_i18n: { greet: '你好 {{name}}' } },
    });

    expect(i18n.t('__test_i18n.greet')).toBe('你好 {{name}}');
  });

  it('tArray 返回数组副本并对非数组/缺失返回 undefined', () => {
    i18n.registerGlobalLocales({
      'zh-CN': { __test_i18n: { months: ['一月', '二月'], scalar: 'x' } },
    });

    expect(i18n.tArray('__test_i18n.months')).toEqual(['一月', '二月']);
    expect(i18n.tArray('__test_i18n.scalar')).toBeUndefined();
    expect(i18n.tArray('__test_i18n.missing')).toBeUndefined();
  });

  it('未知语言的 key 回落到 zh-CN', () => {
    i18n.setLocale('fr-FR');

    expect(i18n.t('common.appName')).toBe('FormSight');
  });

  it('registerCardLocales 挂载到 cards.<id> 命名空间', () => {
    i18n.registerCardLocales('__probe_card', { 'zh-CN': { hello: '你好' } });

    expect(i18n.t('cards.__probe_card.hello')).toBe('你好');
  });
});

describe('createScopedTranslator', () => {
  const t = createScopedTranslator('star_single');

  it('相对 key 自动补全卡片前缀', () => {
    expect(t('title')).toBe(i18n.t('cards.star_single.title'));
    expect(t('.title')).toBe(i18n.t('cards.star_single.title'));
  });

  it('显式全局前缀短路，不再补全', () => {
    expect(t('cards.star_single.title')).toBe(i18n.t('cards.star_single.title'));
    expect(t('common.appName')).toBe(i18n.t('common.appName'));
    expect(t('tags.domains.spatial_structure')).toBe(i18n.t('tags.domains.spatial_structure'));
  });

  it('卡片词典未命中时回落到全局 key', () => {
    expect(t('common.zeroTime')).toBe(i18n.t('common.zeroTime'));
    expect(t('no.such.key')).toBe('no.such.key');
  });
});

describe('getCardTitle / getCardDesc 回落链', () => {
  it('优先使用卡片词典标题', () => {
    expect(getCardTitle({ id: 'star_single' })).toBe(i18n.t('cards.star_single.title'));
  });

  it('卡片不存在时回落到 title 字段，再回落到 id', () => {
    expect(getCardTitle({ id: 'ghost_card', title: '回退标题' })).toBe('回退标题');
    expect(getCardTitle({ id: 'ghost_card' })).toBe('ghost_card');
  });

  it('描述缺失时返回空串', () => {
    expect(getCardDesc({ id: 'ghost_card' })).toBe('');
    expect(getCardDesc({ id: 'ghost_card', desc: '回退描述' })).toBe('回退描述');
  });
});

describe('locale 订阅', () => {
  it('切换语言通知订阅者，重复设置不通知', () => {
    const listener = vi.fn();
    const unsubscribe = i18n.subscribe(listener);

    i18n.setLocale('en-US');
    i18n.setLocale('en-US');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('en-US');

    unsubscribe();
    i18n.setLocale('zh-CN');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
