## [WIP] 将 `ModeCard.tsx` 中的“实验性”文字徽章简化为精致的琥珀色（黄色）纯图标形式，以释放空间并保持视觉整洁。

由于本次修改目标明确且局限于单一文件（`src/components/common/ModeCard.tsx`），我们将严格遵循 `d2-skill-quipu-decide-write-patch-D2` 决策树中的 `patch_file` 策略，生成符合 `d3l-quipu-core-rules` 语法规范的 Quipu 计划。

下面是对应的 Quipu 计划和执行动作：

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~typescript.old
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <Badge variant="warning" size="sm">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </Badge>
                )}
              </div>
~~~~~
~~~~~typescript.new
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <div
                    className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex-shrink-0"
                    title={t('card.experimentalBadge')}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
~~~~~
