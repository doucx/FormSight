import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.angle.settings.showToleranceBandTitle',
    description: 'packs.angle.settings.showToleranceBandDesc',
  },
];