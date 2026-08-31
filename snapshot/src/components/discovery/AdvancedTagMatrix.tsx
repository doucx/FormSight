import { Brain, Compass, Eye, FlaskConical, MousePointer } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { useTranslation } from '../../core/i18n';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';

export function FilterSectionHeader({
  icon: Icon,
  title,
  iconColorClass = 'text-indigo-500',
}: {
  icon: (props: { className?: string }) => ComponentChildren;
  title: string;
  iconColorClass?: string;
}) {
  return (
    <div className="text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
      <Icon className={`w-3 h-3 ${iconColorClass}`} />
      {title}
    </div>
  );
}

interface AdvancedTagMatrixProps {
  query: CardQueryOptions;
  tagSize: 'sm' | 'md';
  isCompact?: boolean;
  onToggleDomain: (d: VisualDomainTag) => void;
  onTogglePath: (p: CognitivePathTag) => void;
  onToggleChallenge: (c: MentalChallengeTag) => void;
  onToggleInteraction: (i: InteractionTag) => void;
  onToggleStatus: (st: CardStatusTag) => void;
}

export function AdvancedTagMatrix({
  query,
  tagSize,
  isCompact = false,
  onToggleDomain,
  onTogglePath,
  onToggleChallenge,
  onToggleInteraction,
  onToggleStatus,
}: AdvancedTagMatrixProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`space-y-2.5 border-t border-slate-200/60 dark:border-slate-800 ${
        isCompact ? 'pt-2 max-h-52 overflow-y-auto pr-1' : 'pt-3.5 space-y-3.5'
      } animate-in fade-in duration-150`}
    >
      {/* 1. 视觉域维度 */}
      <div className="space-y-1">
        <FilterSectionHeader icon={Eye} title={t('home.domainSection')} />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => (
            <TagPill
              key={d}
              size={tagSize}
              label={t(DOMAIN_TAGS[d].i18nKey)}
              themeColor={DOMAIN_TAGS[d].themeColor || 'indigo'}
              selected={query.domains?.includes(d) ?? false}
              onClick={() => onToggleDomain(d)}
            />
          ))}
        </div>
      </div>

      {/* 2. 认知路径维度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={Compass}
          title={t('home.pathSection')}
          iconColorClass="text-emerald-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => (
            <TagPill
              key={p}
              size={tagSize}
              label={t(PATH_TAGS[p].i18nKey)}
              themeColor={PATH_TAGS[p].themeColor || 'emerald'}
              selected={query.paths?.includes(p) ?? false}
              onClick={() => onTogglePath(p)}
            />
          ))}
        </div>
      </div>

      {/* 3. 心智抗性维度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={Brain}
          title={t('home.challengeSection')}
          iconColorClass="text-rose-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => (
            <TagPill
              key={c}
              size={tagSize}
              label={t(CHALLENGE_TAGS[c].i18nKey)}
              themeColor={CHALLENGE_TAGS[c].themeColor || 'rose'}
              selected={query.challenges?.includes(c) ?? false}
              onClick={() => onToggleChallenge(c)}
            />
          ))}
        </div>
      </div>

      {/* 4. 交互形态维度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={MousePointer}
          title={t('home.interactionSection')}
          iconColorClass="text-amber-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => (
            <TagPill
              key={i}
              size={tagSize}
              label={t(INTERACTION_TAGS[i].i18nKey)}
              themeColor={INTERACTION_TAGS[i].themeColor || 'amber'}
              selected={query.interactions?.includes(i) ?? false}
              onClick={() => onToggleInteraction(i)}
            />
          ))}
        </div>
      </div>

      {/* 5. 特性与发布状态 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={FlaskConical}
          title={t('home.statusSection')}
          iconColorClass="text-purple-500"
        />
        <div className="flex flex-wrap gap-1">
          {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
            <TagPill
              key={st}
              size={tagSize}
              label={t(STATUS_TAGS[st].i18nKey)}
              themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'purple')}
              selected={query.statuses?.includes(st) ?? false}
              onClick={() => onToggleStatus(st)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
