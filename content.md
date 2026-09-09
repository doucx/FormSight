收到。我们将移除 `ModeCard` 卡片右上角的 Peak 巅峰层阶徽章（如 Peak L26）及相关属性，使卡片视觉更加精简和专注于当前层阶。我将生成一个自适应计划并执行此修改。

## [WIP] refactor(ui): 移除 ModeCard 卡片上的 Peak 巅峰层阶徽章与相关逻辑

### 用户需求
去除卡片上的 Peak L26 与相关内容。

### 评论
精简卡片右上角的元信息显示，提升界面视觉的一致性与清爽感。

### 目标
1. 移除 `ModeCardProps` 和 `ModeCard` 组件中的 `bestLevel` 属性及 `effectiveBestLevel` 计算逻辑。
2. 移除 `ModeCard` 渲染中条件显示的 `Peak L{...}` 徽章。
3. 在 `DiscoveryView` 中清理对应的 `bestLevel` 获取与传递。

### 基本原理
通过移除不再展示的冗余巅峰层阶数据流与徽章渲染，降低视觉噪点，聚焦于当前核心层阶 `Lvl X`。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mode-card #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 移除 ModeCard 组件中的 bestLevel 与 Peak 徽章渲染

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx.old
interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  bestLevel?: number;
  accuracy: number;
  totalTrials?: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  bestLevel,
  totalTrials = 0,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();
  const isNeverPracticed = totalTrials === 0;

  // 未练习过的卡片默认进入基准测试，已有做答记录的默认进入自适应强化
  const handleCardClick = isNeverPracticed ? onStartBenchmark : onStartTraining;

  const effectiveBestLevel = Math.max(currentLevel, bestLevel || currentLevel);

  return (
~~~~~
~~~~~tsx.new
interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  totalTrials?: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  totalTrials = 0,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();
  const isNeverPracticed = totalTrials === 0;

  // 未练习过的卡片默认进入基准测试，已有做答记录的默认进入自适应强化
  const handleCardClick = isNeverPracticed ? onStartBenchmark : onStartTraining;

  return (
~~~~~

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx.old
          {/* 右上角：巅峰/基准层阶与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isNeverPracticed && effectiveBestLevel > currentLevel ? (
              <Badge
                variant="secondary"
                size="default"
                className="font-mono text-xs font-bold text-muted-foreground"
              >
                Peak L{effectiveBestLevel}
              </Badge>
            ) : null}

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1 gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
~~~~~
~~~~~tsx.new
          {/* 右上角：快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1 gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
~~~~~

#### Acts 2: 在 DiscoveryView 中移除传给 ModeCard 的 bestLevel 属性

~~~~~act
patch_file
src/views/DiscoveryView.tsx
~~~~~
~~~~~tsx.old
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const bestLevel = profile?.bestLevel || currentLevel;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                bestLevel={bestLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
~~~~~
~~~~~tsx.new
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
~~~~~

### 下一步建议
- 建议运行应用编译或测试，验证 `ModeCard` 渲染正常，且无 TypeScript 属性缺失报错。
