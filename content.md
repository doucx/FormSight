## [WIP] fix: 修复 SettingsModal 中相对色感配置缺乏 manualTargetSectors 属性的 TS 编译错误

### 用户需求
修复 `npm run build` 时遇到的 TypeScript 编译错误：`Property 'manualTargetSectors' does not exist on type 'StarSettings | ColorSenseSettings | RelativeColorSettings'`。

### 评论
由于 `relative_color`（相对色感）配置不包含弱点靶向扇区配置（`manualTargetSectors`），我们需要在 `SettingsModal.tsx` 中对 `domain` 进行类型守卫或类型收窄，确保在访问 `manualTargetSectors` 时 TypeScript 能正确识别类型。

### 目标
1. 修正 `src/components/SettingsModal.tsx` 中的类型窄化问题。
2. 确保 `domain === 'star' || domain === 'color'` 时才访问和修改 `manualTargetSectors`。
3. 保证 `npm run build` 和 `npm test` 顺利通过。

### 基本原理
通过在访问 `domainSettings.manualTargetSectors` 之前加入 `if (domain !== 'star' && domain !== 'color') return;` 防御与类型细化，彻底消除 TypeScript 联合类型的编译阻碍。

### 标签
#intent/fix #flow/ready #priority/critical #comp/cli #concept/config #scope/core #ai/instruct #task/domain/testing #task/object/typescript-error #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 SettingsModal.tsx 中的属性访问与类型推导错误

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleSectorToggle = (sectorIdx: number) => {
    if (domain !== 'star' && domain !== 'color') return;
    const currentSectors = domainSettings.manualTargetSectors || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    updateDomainSettings({ manualTargetSectors: updated });
  };
~~~~~
~~~~~typescript.new
  const handleSectorToggle = (sectorIdx: number) => {
    if (domain !== 'star' && domain !== 'color') return;
    const starOrColorSettings = domainSettings as StarSettings | ColorSenseSettings;
    const currentSectors = starOrColorSettings.manualTargetSectors || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s: number) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    updateDomainSettings({ manualTargetSectors: updated });
  };
~~~~~

### 下一步建议
修改完成后，建议运行 `npm run build` 验证 TypeScript 编译是否彻底通过。
