好的，我已经分析了将“滑块极值吸附外延感应区”提升至全局设置的具体实现逻辑。

我将为本次修改生成详细的实施计划，包括更新全局配置模型、在全局设置弹窗中添加感应区配置项、从卡片级偏好设置中解耦、并在训练视图中统一注入全局滑块外延感应配置。

## [WIP] refactor: 将滑块极值吸附外延感应区提升至全局设置

### 用户需求
将目前分散在各个卡片/模块设置中的“滑块极值吸附外延感应区 (sliderHitMargin)”配置提升至 FormSight 全局设置中，使所有包含连续滑块调节的训练模式统一遵循全局外延感应区设定。

### 评论
滑块极值吸附感应区属于输入设备与操作习惯相关的系统级交互参数（类似于鼠标灵敏度或按键反馈），将其提升至全局设置符合直觉，能避免用户在不同色感和空间留白模块中重复调节，显著提升用户体验。

### 目标
1. 在 `GlobalSettings` 接口和默认全局配置中增加 `sliderHitMargin` 字段。
2. 在 `GlobalSettingsModal` 中引入 `SliderMarginGroup` 组件，支持用户在全局设置中统一调节感应区外延尺寸 (0px / 8px / 12px / 20px)。
3. 清理 `cards.ts` 与 `DynamicDomainSettings.tsx` 中的卡片级 `sliderMargin` 模式 schema，精简卡片设置菜单。
4. 在 `App.tsx` 与 `GenericTrainingView.tsx` 中将全局 `globalSettings.sliderHitMargin` 统一注入到训练交互画布中。

### 基本原理
1. 在 `settings.ts` 中为 `GlobalSettings` 增加 `sliderHitMargin: number`（默认值为 12px）。
2. 在 `GlobalSettingsModal.tsx` 中嵌入 `SliderMarginGroup`，支持即时保存并触发全局状态同步。
3. 从卡片级 setting schemas 移除 `sliderMargin` 项，避免冗余配置。
4. 在 `GenericTrainingView` 渲染 canvas 时，将 `globalSettings.sliderHitMargin` 优先合并注入给 `ColorCanvas`、`RelativeColorCanvas` 和 `NegativeSpaceCanvas`。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/settings #task/object/slider-margin-globalization #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新全局设置类型定义与默认配置

在 `src/utils/settings.ts` 中为 `GlobalSettings` 添加 `sliderHitMargin` 属性。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
}
~~~~~
~~~~~typescript
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  cards: {
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
  },
  cards: {
~~~~~

#### Acts 2: 在全局设置弹窗中添加滑块外延感应区设置

在 `src/components/GlobalSettingsModal.tsx` 中引入 `SliderMarginGroup`，允许用户统一配置滑块外延感应区。

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
import { SliderMarginGroup } from './settings/common/SliderMarginGroup';
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~
~~~~~typescript
  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleSliderHitMarginChange = (margin: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        sliderHitMargin: margin,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
            </div>
          </div>
        </div>

        {/* 数据管理 */}
~~~~~
~~~~~typescript
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <SliderMarginGroup
              title="滑块极值吸附外延感应区"
              value={settings.global.sliderHitMargin ?? 12}
              onChange={handleSliderHitMarginChange}
            />
          </div>
        </div>

        {/* 数据管理 */}
~~~~~

#### Acts 3: 从卡片级设置 Schemas 中解耦滑块外延设置

修改 `src/config/cards.ts` 和 `src/components/settings/DynamicDomainSettings.tsx`，移除各单项卡片中的 `sliderMargin` 配置项。

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'sliderMargin',
    key: 'sliderHitMargin',
    title: '滑块极值吸附外延感应区',
  },
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~
~~~~~typescript
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript
  color: [
    {
      type: 'sliderMargin',
      key: 'sliderHitMargin',
      title: '色感滑块极值吸附外延感应区',
    },
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 ΔE 动态容错区间',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: '综合拾色悬停颜色实时联动',
      description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: '色相弱点专项靶向强化',
      subTitle: '选择需要靶向强化的色相扇区：',
      sectors: COLOR_SECTORS,
      gridCols: 'grid-cols-3',
    },
  ],
  relative_color: [
    {
      type: 'sliderMargin',
      key: 'sliderHitMargin',
      title: '色感滑块极值吸附外延感应区',
    },
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 ΔE 动态容错区间',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: '悬停推移色彩联动预览',
      description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
    },
  ],
  negative_space: [
    {
      type: 'sliderMargin',
      key: 'sliderHitMargin',
      title: '滑块极值吸附外延感应区',
    },
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 Δ% 动态容错区间',
    },
  ],
~~~~~
~~~~~typescript
  color: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 ΔE 动态容错区间',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: '综合拾色悬停颜色实时联动',
      description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: '色相弱点专项靶向强化',
      subTitle: '选择需要靶向强化的色相扇区：',
      sectors: COLOR_SECTORS,
      gridCols: 'grid-cols-3',
    },
  ],
  relative_color: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 ΔE 动态容错区间',
    },
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: '悬停推移色彩联动预览',
      description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
    },
  ],
  negative_space: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: '显示滑块容错感应区',
      description: '在悬停光标两侧实时显示 Δ% 动态容错区间',
    },
  ],
~~~~~

#### Acts 4: 贯通训练视图的全局外延感应参数传递

在 `src/views/GenericTrainingView.tsx` 与 `src/app.tsx` 中注入 `globalSettings`，确保各画布渲染时优先读取全局 `sliderHitMargin`。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings } from '../utils/settings';
~~~~~
~~~~~typescript
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings, GlobalSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  onExit: () => void;
}

export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps) {
~~~~~
~~~~~typescript
export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  globalSettings?: GlobalSettings;
  onExit: () => void;
}

export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  onExit,
}: GenericTrainingViewProps) {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
      {({ disabled, isIdle }) =>
        adapter.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings,
        })
      }
~~~~~
~~~~~typescript
      {({ disabled, isIdle }) =>
        adapter.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin: globalSettings?.sliderHitMargin ?? (settings.sliderHitMargin as number) ?? 12,
          },
        })
      }
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
~~~~~
~~~~~typescript
          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
~~~~~

### 下一步建议
1. 运行 `npm run check` 或 `npm run test` 验证代码类型与测试用例完整性。
2. 打开全局设置弹窗，调整外延感应区（如设为 0px 或 20px），并在色感 / 负形滑块练习中验证边界吸附与手感是否全局生效。
