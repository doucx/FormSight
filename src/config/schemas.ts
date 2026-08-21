import {
  COLOR_SECTORS,
  STAR_SECTORS,
  type SettingFieldSchema,
} from '../components/settings/DynamicDomainSettings';

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: '干扰点网格大小',
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
    title: '弱点专项靶向强化',
    subTitle: '选择需要靶向强化的角度扇区：',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '色相弱点专项靶向强化',
    subTitle: '选择需要靶向强化的色相扇区：',
    sectors: COLOR_SECTORS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];
