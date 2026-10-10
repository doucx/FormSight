import { GripVertical, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';
import { Button } from '../../ui/button';

interface PlanStageListProps {
  currentPlan: TrainingPlan;
  totalTrials: number;
  estimatedMin: number;
  trialPresets: number[];
  onBatchUpdateTrials: (trials: number) => void;
  onClearAll: () => void;
  onUpdateTrials: (id: string, trials: number) => void;
  onReorderItem?: (fromIndex: number, toIndex: number) => void;
  onRemoveItem: (id: string) => void;
}

interface DragSnapshot {
  initialScrollTop: number;
  slotCenters: number[]; // 各阶段在容器内容坐标系（含 scrollTop）中的静态中心 Y
  itemHeights: number[]; // 各阶段的原始高度
  containerRect: DOMRect;
}

export function PlanStageList({
  currentPlan,
  totalTrials,
  estimatedMin,
  trialPresets,
  onBatchUpdateTrials,
  onClearAll,
  onUpdateTrials,
  onReorderItem,
  onRemoveItem,
}: PlanStageListProps) {
  const { t } = useTranslation();
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 拖拽核心状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [pointerDeltaY, setPointerDeltaY] = useState<number>(0);
  const [scrollCompensation, setScrollCompensation] = useState<number>(0);
  const [draggedHeight, setDraggedHeight] = useState<number>(64);

  // 释放着陆锁（消除松手回弹跳动）与刚移动卡片辉光淡出 ID
  const [isLandedSeamlessly, setIsLandedSeamlessly] = useState<boolean>(false);
  const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(null);
  const glowTimerRef = useRef<number | null>(null);

  // 引用变量用于平滑帧计算
  const snapshotRef = useRef<DragSnapshot | null>(null);
  const dragStartYRef = useRef<number>(0);
  const draggedIndexRef = useRef<number | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const currentPointerYRef = useRef<number>(0);
  const autoScrollRafRef = useRef<number | null>(null);

  draggedIndexRef.current = draggedIndex;
  targetIndexRef.current = targetIndex;

  // 停止自动边缘滚动循环
  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  // 根据当前光标与滚动补偿计算被拖拽卡片在内容坐标系中的中心，并确定目标插槽
  const recalculateTargetIndex = useCallback((pointerY: number) => {
    const snapshot = snapshotRef.current;
    const container = listContainerRef.current;
    const originIdx = draggedIndexRef.current;
    if (!snapshot || !container || originIdx === null) return;

    // 当前容器滚动带来的增量
    const currentScrollDiff = container.scrollTop - snapshot.initialScrollTop;
    setScrollCompensation(currentScrollDiff);

    // 计算被拖拽项在静态内容坐标系中的实时中心 Y
    const currentDraggedCenter =
      snapshot.slotCenters[originIdx] + (pointerY - dragStartYRef.current) + currentScrollDiff;

    // 寻找在恒定 slotCenters 中最匹配的插槽位置
    let closestIndex = originIdx;
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < snapshot.slotCenters.length; i++) {
      const dist = Math.abs(currentDraggedCenter - snapshot.slotCenters[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    if (closestIndex !== targetIndexRef.current) {
      setTargetIndex(closestIndex);
    }
  }, []);

  // 边缘检测与自适应速率滚动循环
  const stepAutoScroll = useCallback(() => {
    const container = listContainerRef.current;
    const snapshot = snapshotRef.current;
    if (!container || !snapshot || draggedIndexRef.current === null) {
      stopAutoScroll();
      return;
    }

    const rect = container.getBoundingClientRect();
    const pointerY = currentPointerYRef.current;
    const edgeThreshold = 56; // 边缘感应缓冲区 (px)
    const maxSpeed = 15; // 最大滚动速率 (px/帧)

    let scrollDelta = 0;

    // 顶部边缘检测：向上滚动
    if (pointerY < rect.top + edgeThreshold && container.scrollTop > 0) {
      const intensity = Math.min(
        1,
        Math.max(0, (rect.top + edgeThreshold - pointerY) / edgeThreshold),
      );
      scrollDelta = -Math.max(2, Math.round(intensity * maxSpeed));
    }
    // 底部边缘检测：向下滚动
    else if (
      pointerY > rect.bottom - edgeThreshold &&
      container.scrollTop + container.clientHeight < container.scrollHeight - 1
    ) {
      const intensity = Math.min(
        1,
        Math.max(0, (pointerY - (rect.bottom - edgeThreshold)) / edgeThreshold),
      );
      scrollDelta = Math.max(2, Math.round(intensity * maxSpeed));
    }

    if (scrollDelta !== 0) {
      container.scrollTop += scrollDelta;
      recalculateTargetIndex(pointerY);
      autoScrollRafRef.current = requestAnimationFrame(stepAutoScroll);
    } else {
      stopAutoScroll();
    }
  }, [stopAutoScroll, recalculateTargetIndex]);

  // 开始拖拽
  const handlePointerDown = (e: PointerEvent, index: number) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const container = listContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const initialScrollTop = container.scrollTop;

    // 清空先前的辉光计时
    if (glowTimerRef.current !== null) {
      clearTimeout(glowTimerRef.current);
      glowTimerRef.current = null;
    }
    setRecentlyDroppedId(null);
    setIsLandedSeamlessly(false);

    // 拍下所有卡片在未受变换状态下的初始几何快照
    const slotCenters: number[] = [];
    const itemHeights: number[] = [];

    for (let i = 0; i < currentPlan.items.length; i++) {
      const el = itemRefs.current.get(i);
      if (el) {
        const elRect = el.getBoundingClientRect();
        const contentCenterY =
          elRect.top - containerRect.top + initialScrollTop + elRect.height / 2;
        slotCenters.push(contentCenterY);
        itemHeights.push(elRect.height);
      } else {
        slotCenters.push(0);
        itemHeights.push(64);
      }
    }

    snapshotRef.current = {
      initialScrollTop,
      slotCenters,
      itemHeights,
      containerRect,
    };

    setDraggedHeight(itemHeights[index] || 64);
    dragStartYRef.current = e.clientY;
    currentPointerYRef.current = e.clientY;
    setDraggedIndex(index);
    setTargetIndex(index);
    setPointerDeltaY(0);
    setScrollCompensation(0);

    const targetHandle = e.currentTarget as HTMLElement;
    targetHandle.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      currentPointerYRef.current = moveEvent.clientY;
      const deltaY = moveEvent.clientY - dragStartYRef.current;
      setPointerDeltaY(deltaY);

      recalculateTargetIndex(moveEvent.clientY);

      // 检查边缘自动滚动
      if (!autoScrollRafRef.current) {
        autoScrollRafRef.current = requestAnimationFrame(stepAutoScroll);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      targetHandle.removeEventListener('pointermove', onPointerMove);
      targetHandle.removeEventListener('pointerup', onPointerUp);
      targetHandle.removeEventListener('pointercancel', onPointerUp);
      try {
        targetHandle.releasePointerCapture(upEvent.pointerId);
      } catch {}

      stopAutoScroll();

      const fromIdx = draggedIndexRef.current;
      const toIdx = targetIndexRef.current;

      if (fromIdx !== null) {
        const movedItem = currentPlan.items[fromIdx];
        if (movedItem) {
          // 标记刚放下的卡片，启动辉光渐淡效果
          setRecentlyDroppedId(movedItem.id);
          if (glowTimerRef.current !== null) {
            clearTimeout(glowTimerRef.current);
          }
          glowTimerRef.current = window.setTimeout(() => {
            setRecentlyDroppedId(null);
            glowTimerRef.current = null;
          }, 1400);
        }
      }

      // 如果发生了有效换位，立即激活无缝着陆锁，抑制旧 transform 回弹跳动
      if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
        setIsLandedSeamlessly(true);
        onReorderItem?.(fromIdx, toIdx);
        // 在下一渲染帧中平稳解除着陆锁，恢复后续正常的交互过渡
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsLandedSeamlessly(false);
          });
        });
      }

      setDraggedIndex(null);
      setTargetIndex(null);
      setPointerDeltaY(0);
      setScrollCompensation(0);
      snapshotRef.current = null;
    };

    targetHandle.addEventListener('pointermove', onPointerMove);
    targetHandle.addEventListener('pointerup', onPointerUp);
    targetHandle.addEventListener('pointercancel', onPointerUp);
  };

  useEffect(() => {
    return () => {
      stopAutoScroll();
      if (glowTimerRef.current !== null) {
        clearTimeout(glowTimerRef.current);
      }
    };
  }, [stopAutoScroll]);

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="text-xs font-bold text-foreground flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-muted-foreground font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} ·{' '}
            {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-xl border border-border/60">
              <span className="text-xs font-bold text-muted-foreground">
                {t('plan.batchTrials')}
              </span>
              {trialPresets.map((num) => (
                <Button
                  key={num}
                  variant="ghost"
                  size="sm"
                  onClick={() => onBatchUpdateTrials(num)}
                  className="h-6 px-1.5 py-0 text-xs font-bold rounded-lg text-muted-foreground hover:text-foreground"
                >
                  {num}
                  {t('common.trialsUnit')}
                </Button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('plan.clearStages')}</span>
            </Button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="flex-1 min-h-[220px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs bg-muted/40">
          <Zap className="w-6 h-6 text-muted-foreground/60" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div
          ref={listContainerRef}
          className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0 relative select-none scrollbar-thin"
        >
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            const isDragging = draggedIndex === idx;
            const isRecentlyDropped = recentlyDroppedId === item.id;

            // 计算该项在拖拽过程中的躲避位移 (px)
            let translateY = 0;
            const gap = 10; // 卡片垂直间距 10px (space-y-2.5)
            const shiftDistance = draggedHeight + gap;

            if (draggedIndex !== null && targetIndex !== null && !isDragging) {
              if (draggedIndex < targetIndex) {
                // 向下拖动：原区间 (draggedIndex, targetIndex] 的卡片向上躲避让出位置
                if (idx > draggedIndex && idx <= targetIndex) {
                  translateY = -shiftDistance;
                }
              } else if (draggedIndex > targetIndex) {
                // 向上拖动：原区间 [targetIndex, draggedIndex) 的卡片向下躲避让出位置
                if (idx >= targetIndex && idx < draggedIndex) {
                  translateY = shiftDistance;
                }
              }
            }

            // 被拖拽项的总位移 = 指针位移 + 容器自动滚动带来的补偿位移
            const activeDragOffsetY = pointerDeltaY + scrollCompensation;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(idx, el);
                  else itemRefs.current.delete(idx);
                }}
                style={{
                  transform: isDragging
                    ? `translateY(${activeDragOffsetY}px)`
                    : !isLandedSeamlessly && translateY !== 0
                      ? `translateY(${translateY}px)`
                      : undefined,
                  zIndex: isDragging ? 50 : 1,
                  transition:
                    isDragging || isLandedSeamlessly
                      ? 'none'
                      : 'transform 200ms cubic-bezier(0.2, 0, 0, 1), box-shadow 800ms ease-out, border-color 800ms ease-out',
                }}
                className={`relative p-3 bg-card border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                  isDragging
                    ? 'border-primary ring-4 ring-primary/40 shadow-[0_12px_32px_rgba(79,70,229,0.28)] bg-card scale-[1.015]'
                    : isRecentlyDropped
                      ? 'border-primary ring-2 ring-primary/50 shadow-[0_4px_20px_rgba(79,70,229,0.18)]'
                      : 'border-border shadow-xs hover:border-border/80'
                }`}
              >
                {/* 模块信息区与拖拽把手 */}
                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
                  {/* 拖动手柄 */}
                  <button
                    type="button"
                    onPointerDown={(e) => handlePointerDown(e, idx)}
                    title={t('plan.dragHandleTitle')}
                    className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted active:cursor-grabbing cursor-grab touch-none flex-shrink-0 transition-colors"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>

                  <div className="w-6 h-6 rounded-lg bg-foreground text-background font-mono text-xs font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-accent text-primary flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                    <div className="text-xs text-muted-foreground truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 题量选择与移除控制区 */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="flex items-center bg-muted p-0.5 rounded-xl border border-border/40">
                    {trialPresets.map((preset) => (
                      <Button
                        key={preset}
                        variant={item.targetTrials === preset ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`h-6 px-2 py-0 text-xs font-bold rounded-lg ${
                          item.targetTrials === preset
                            ? 'shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center pl-1.5 ml-1 border-l border-border/60">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
