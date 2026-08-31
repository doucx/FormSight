import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';

export const STAR_SECTORS = [
  'packs.star.sectors.e',
  'packs.star.sectors.ne',
  'packs.star.sectors.n',
  'packs.star.sectors.nw',
  'packs.star.sectors.w',
  'packs.star.sectors.sw',
  'packs.star.sectors.s',
  'packs.star.sectors.se',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: 'packs.star.settings.gridSizeTitle',
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
    title: 'packs.star.settings.targetingTitle',
    subTitle: 'packs.star.settings.targetingSubTitle',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];