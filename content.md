这是一个非常关键的体验优化。

在当前包含显式确认步骤的卡片中，原本“确认提交 (Space)”按钮是在 `!showAnswer` 时条件渲染的。当用户完成选择并点击或按空格提交后，状态立即切换为 `showAnswer = true`，导致该按钮从 DOM 树中被移除，页面高度与视口布局发生突兀抖动。将其调整为常驻保留、仅在提交后切换为 `disabled={disabled || showAnswer}` 状态，可以稳固布局结构，提供流畅连贯的交互反馈。

我将生成修改计划来实现此优化。

## [WIP] fix: 保持确认提交按钮常驻并切换为禁用态以防止布局抖动

### 错误分析
在需要二次提交确认的训练卡片（如 `color_all`、`neg_ratio_estimation`、`rel_hue_induction`、`rel_lightness_induction` 以及 `rel_vector_shift`）中，“确认提交 (Space)”按钮被包裹在 `!showAnswer` 条件下。一旦用户点击提交，`showAnswer` 变为 `true`，该按钮被直接卸载销毁，导致卡片容器高度突然缩短，下方内容及周围界面发生跳变或位移，严重破坏了连续做答的心流体验。

### 用户需求
点击“确认提交”后按钮不要从页面上消失，而是在提交后维持原位并转变为禁用（disabled）样式，保持页面布局稳定。

### 评论
该改动完全符合现代交互规范（Cumulative Layout Shift 优化原则）。保留不可交互占位能明确向用户传递“本题已提交、当前不可再次操作”的视觉反馈，且消除了视口重排跳动。

### 目标
1. 修改 `color_all`、`neg_ratio_estimation`、`rel_hue_induction`、`rel_lightness_induction`、`rel_vector_shift` 5 个卡片视图组件中的确认按钮。
2. 移除包裹确认按钮的 `!showAnswer &&` 条件判断。
3. 将按钮的禁用状态更新为 `disabled={disabled || showAnswer}`，使其在揭晓答案阶段保留在 DOM 中但不可点击。

### 基本原理
通过将 `disabled` 属性扩展为 `disabled={disabled || showAnswer}`，利用 `Button` 组件自带的 `disabled:opacity-50 disabled:pointer-events-none` 样式，在揭晓答案阶段自然呈现半透明禁用质感并拦截多余点击事件，同时固定 DOM 占位，彻底消除布局抖动。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/confirm-button #task/action/stabilize-layout #task/state/begin

---

### Script

#### Acts 1: 优化 `color_all` 中的提交按钮

修改 `src/cards/color_all/ColorAllView.tsx`，移除 `!showAnswer` 条件，使提交按钮在答案揭晓时保持禁用态占位。

~~~~~act
patch_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
~~~~~
~~~~~tsx
      </div>

      <Button
        variant="default"
        onClick={handleSubmitAll}
        disabled={disabled || showAnswer}
        className="w-full py-3 text-xs font-bold rounded-2xl"
      >
        {t('common.confirmSpace')}
      </Button>
    </QuestionCardShell>
~~~~~

#### Acts 2: 优化 `neg_ratio_estimation` 中的提交按钮

修改 `src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx`，保持提交按钮常驻并在提交后禁用。

~~~~~act
patch_file
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~tsx
      </div>

      {/* 二段显式确认按钮（支持空格键） */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
~~~~~
~~~~~tsx
      </div>

      {/* 二段显式确认按钮（支持空格键） */}
      <Button
        variant="default"
        onClick={handleSubmit}
        disabled={disabled || showAnswer}
        className="w-full py-3 h-auto rounded-2xl"
      >
        {t('common.confirmSpace')}
      </Button>
    </QuestionCardShell>
~~~~~

#### Acts 3: 优化 `rel_hue_induction` 中的提交按钮

修改 `src/cards/rel_hue_induction/RelHueInductionView.tsx`，保持确认按钮常驻并在提交后禁用。

~~~~~act
patch_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~tsx
      </div>

      {/* 空格/手动确认按钮 */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
~~~~~
~~~~~tsx
      </div>

      {/* 空格/手动确认按钮 */}
      <Button
        variant="default"
        onClick={handleSubmit}
        disabled={disabled || showAnswer}
        className="w-full py-3 h-auto rounded-2xl"
      >
        {t('common.confirmSpace')}
      </Button>
    </QuestionCardShell>
~~~~~

#### Acts 4: 优化 `rel_lightness_induction` 中的提交按钮

修改 `src/cards/rel_lightness_induction/RelLightnessInductionView.tsx`，保持确认按钮常驻并在提交后禁用。

~~~~~act
patch_file
src/cards/rel_lightness_induction/RelLightnessInductionView.tsx
~~~~~
~~~~~tsx
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
~~~~~
~~~~~tsx
      </div>

      <Button
        variant="default"
        onClick={handleSubmit}
        disabled={disabled || showAnswer}
        className="w-full py-3 text-xs font-bold rounded-2xl"
      >
        {t('common.confirmSpace')}
      </Button>
    </QuestionCardShell>
~~~~~

#### Acts 5: 优化 `rel_vector_shift` 中的提交按钮

修改 `src/cards/rel_vector_shift/RelVectorShiftView.tsx`，保持确认按钮常驻并在提交后禁用。

~~~~~act
patch_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~tsx
      </div>

      {/* 空格/手动确认按钮 */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
~~~~~
~~~~~tsx
      </div>

      {/* 空格/手动确认按钮 */}
      <Button
        variant="default"
        onClick={handleSubmit}
        disabled={disabled || showAnswer}
        className="w-full py-3 h-auto rounded-2xl"
      >
        {t('common.confirmSpace')}
      </Button>
    </QuestionCardShell>
~~~~~

### 下一步建议

1. **功能验证**：启动开发服务器或进入 `color_all`、`rel_hue_induction`、`neg_ratio_estimation` 等模块，验证点击“确认提交”后按钮是否平滑进入半透明禁用态，且下方与卡片容器高度保持绝对稳定。
2. **键盘热键流转**：验证答题状态下按下 Space 键提交，揭晓答案后再按 Space 是否能顺畅触发 TrainingShell 的“下一题”功能。
3. **提交代码**：验证完成后，可生成独立的 `[COMMIT]` 计划提交本次针对交互布局稳态的修复。
