import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';

export const STAR_SECTORS = [
  'cards.star_single.sectors.e',
  'cards.star_single.sectors.ne',
  'cards.star_single.sectors.n',
  'cards.star_single.sectors.nw',
  'cards.star_single.sectors.w',
  'cards.star_single.sectors.sw',
  'cards.star_single.sectors.s',
  'cards.star_single.sectors.se',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: 'cards.star_single.settings.gridSizeTitle',
    options: [
      { label: '2x2', value: 2 },
      { label: '3x3', value: 3 },
      { label: '4x4', value: 4 },
      { label: '5x5', value: 5 },
    ],
    gridCols: 'grid-cols-4',
  },
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: 'cards.star_single.settings.targetingTitle',
    subTitle: 'cards.star_single.settings.targetingSubTitle',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];
