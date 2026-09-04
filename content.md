## [WIP] fix checkf problem

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    // 2. 构建标准 CardDefinition
    const icon = card.ui?.icon ?? card.icon!;
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };
~~~~~
~~~~~typescript.new
    // 2. 构建标准 CardDefinition
    const icon = card.ui?.icon ?? card.icon ?? (() => null);
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  const domain = card.domain;
  const engine = manifest.engine ?? manifest.training!;
  const renderCanvas = manifest.ui?.renderCanvas ?? manifest.training?.renderCanvas;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
~~~~~
~~~~~typescript.new
  const domain = card.domain;
  const engine = manifest.engine ?? manifest.training ?? ({} as any);
  const renderCanvas = manifest.ui?.renderCanvas ?? manifest.training?.renderCanvas;

  if (!renderCanvas) {
    return null;
  }

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
~~~~~
