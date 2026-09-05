好的，我已经完成了对所有卡片视觉指引机制的系统排查，并整理出未适配 `QuestionCardShell` 与缺失 `hint` 键的卡片清单。现在生成执行计划，补齐语言包并在对应视图中重构接入 `QuestionCardShell`。

## [WIP] feat: 为未接入 hint 的卡片补齐提示词典与 QuestionCardShell 封装

### 用户需求
1. 为 `star_single`、`star_double_h`、`star_double_r` 的双语词典添加 `hint` 键，将视图组件封装进 `QuestionCardShell` 并支持 `showCanvasHints` 配置透传。
2. 为 `neg_vertex_fitting` 视图接入 `QuestionCardShell` 并注入 `hintIcon` 与 `showCanvasHints`。
3. 为 `color_all`、`color_hue`、`color_sat`、`color_val` 补充 `hint` 词条，将视图根容器重构为 `QuestionCardShell`，实现全项目卡片视觉外壳标准统一。

### 评论
此前 `star_*` 系列、`color_*` 系列与 `neg_vertex_fitting` 采用手写的 `div` 容器或简易布局包裹，不仅缺乏统一的圆角和边框样式规范，而且导致全局设置中的“任务指引提示开关 (`showCanvasHints`)”在这些卡片中失效。全面收敛到 `QuestionCardShell` 可以实现整个题型系统在操作指引、快捷图标与全局设置联动上的高度一致性。

### 目标
1. 在 `star_single`、`star_double_h`、`star_double_r` 的 `en-US.json` 与 `zh-CN.json` 中补齐 `hint` 键；在视图中用 `QuestionCardShell` 包裹，并在 `index.tsx` 透传 `settings.showCanvasHints`。
2. 在 `neg_vertex_fitting` 视图中用 `QuestionCardShell` 包裹，绑定 `Crosshair` 图标，并在 `index.tsx` 透传 `settings.showCanvasHints`。
3. 在 `color_all`、`color_hue`、`color_sat`、`color_val` 双语词典中补齐 `hint` 键；将原生 `div` 根容器重构成 `QuestionCardShell`，支持 `showCanvasHints` 开关。

### 基本原理
`QuestionCardShell` 是 `@formsight/card-sdk` 提供的标准化题干外壳容器，统一承载 `hintText`、`hintIcon`、`showCanvasHints` 显隐判定以及最大宽度控制。通过将散落的手写容器全部替换为 `QuestionCardShell`，所有卡片都能天然遵从 `GeneralPreferencesSection` 中对指引提示的显示/隐藏偏好，同时保障深浅明暗模式下的视觉基调统一。

### 标签
#intent/build #flow/ready #priority/high #comp/cards #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/question-card-shell #task/action/standardization #task/state/continue

---

### Script

#### Acts 1: 为 `star_single` 补齐词典与接入 `QuestionCardShell`

~~~~~act
patch_file
src/cards/star_single/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Single Anchor",
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
  "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Single Anchor",
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
  "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
  "hint": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/star_single/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "单锚点模式",
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
  "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
  "settings": {
~~~~~
~~~~~json
{
  "title": "单锚点模式",
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
  "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
  "hint": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/star_single/StarSingleView.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarSingleViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~tsx
import { Target } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  QuestionCardShell,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StarSingleViewProps) {
  const { t } = useCardTranslation('star_single');
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/cards/star_single/StarSingleView.tsx
~~~~~
~~~~~tsx
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Target}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full mx-auto">
        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <canvas
            ref={leftCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
          />
        </div>

        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <PointClickCanvas
            canvasSize={CANVAS_SIZE}
            gridPoints={question.distractorPoints}
            targetPoint={question.targetB}
            userNearestPoint={userAnswer?.nearestGridPoint}
            anchors={[question.anchorA]}
            showAnswer={showAnswer}
            isHit={userAnswer?.isHit}
            disabled={disabled}
            maxDisplayWidth="w-full h-full aspect-square"
            onCommitPoint={handleCommitPoint}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~

~~~~~act
patch_file
src/cards/star_single/index.tsx
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarSingleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <StarSingleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

#### Acts 2: 为 `star_double_h` 补齐词典与接入 `QuestionCardShell`

~~~~~act
patch_file
src/cards/star_double_h/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Horizontal Double Anchors",
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
  "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Horizontal Double Anchors",
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
  "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
  "hint": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "水平双锚点",
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
  "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
  "settings": {
~~~~~
~~~~~json
{
  "title": "水平双锚点",
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
  "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
  "hint": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/StarDoubleHView.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarDoubleHViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
}

export function StarDoubleHView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleHViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~tsx
import { Crosshair } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  QuestionCardShell,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarDoubleHViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function StarDoubleHView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StarDoubleHViewProps) {
  const { t } = useCardTranslation('star_double_h');
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/StarDoubleHView.tsx
~~~~~
~~~~~tsx
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Crosshair}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full mx-auto">
        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <canvas
            ref={leftCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
          />
        </div>

        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <PointClickCanvas
            canvasSize={CANVAS_SIZE}
            gridPoints={question.distractorPoints}
            targetPoint={question.targetB}
            userNearestPoint={userAnswer?.nearestGridPoint}
            anchors={[question.anchorA, question.anchorC]}
            showAnswer={showAnswer}
            isHit={userAnswer?.isHit}
            disabled={disabled}
            maxDisplayWidth="w-full h-full aspect-square"
            onCommitPoint={handleCommitPoint}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarDoubleHView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <StarDoubleHView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

#### Acts 3: 为 `star_double_r` 补齐词典与接入 `QuestionCardShell`

~~~~~act
patch_file
src/cards/star_double_r/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Rotated Double Anchors",
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
  "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Rotated Double Anchors",
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
  "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
  "hint": "Observe the rotated dual anchors on the left, then locate the target on the right.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "旋转双锚点",
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
  "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
  "settings": {
~~~~~
~~~~~json
{
  "title": "旋转双锚点",
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
  "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
  "hint": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/StarDoubleRView.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarDoubleRViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
}

export function StarDoubleRView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleRViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~tsx
import { RotateCw } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type Point,
  PointClickCanvas,
  QuestionCardShell,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarDoubleRViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function StarDoubleRView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StarDoubleRViewProps) {
  const { t } = useCardTranslation('star_double_r');
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/StarDoubleRView.tsx
~~~~~
~~~~~tsx
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={RotateCw}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full mx-auto">
        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <canvas
            ref={leftCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
          />
        </div>

        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <PointClickCanvas
            canvasSize={CANVAS_SIZE}
            gridPoints={question.distractorPoints}
            targetPoint={question.targetB}
            userNearestPoint={userAnswer?.nearestGridPoint}
            anchors={[question.anchorA, question.anchorC]}
            showAnswer={showAnswer}
            isHit={userAnswer?.isHit}
            disabled={disabled}
            maxDisplayWidth="w-full h-full aspect-square"
            onCommitPoint={handleCommitPoint}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarDoubleRView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <StarDoubleRView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

#### Acts 4: 为 `neg_vertex_fitting` 接入 `QuestionCardShell` 与 `hintIcon`

~~~~~act
patch_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef, useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  LOUPE_DIAMETER,
  type Point,
  drawDot,
  drawPolygonCanvas,
  findNearestPointInGrid,
  getDynamicDotRadius,
  hexToRgba,
  setupHiDpiCanvas,
  useCardTranslation,
  usePointLoupe,
} from '@formsight/card-sdk';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userPoint: Point) => void;
  disabled?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: NegVertexFittingViewProps) {
  const { t } = useCardTranslation('neg_vertex_fitting');
~~~~~
~~~~~tsx
import { Crosshair } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  LOUPE_DIAMETER,
  type Point,
  QuestionCardShell,
  drawDot,
  drawPolygonCanvas,
  findNearestPointInGrid,
  getDynamicDotRadius,
  hexToRgba,
  setupHiDpiCanvas,
  useCardTranslation,
  usePointLoupe,
} from '@formsight/card-sdk';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userPoint: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegVertexFittingViewProps) {
  const { t } = useCardTranslation('neg_vertex_fitting');
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~tsx
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center select-none"
      >
        <canvas
          ref={canvasRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={t('hint')}
          className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
          }`}
        />

        {isTouching && loupePos && (
          <div
            className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
            style={{
              left: `${loupePos.x}px`,
              top: `${loupePos.y}px`,
              width: `${LOUPE_DIAMETER}px`,
              height: `${LOUPE_DIAMETER}px`,
            }}
          >
            <canvas
              ref={loupeCanvasRef}
              width={LOUPE_DIAMETER}
              height={LOUPE_DIAMETER}
              className="w-full h-full block"
            />
          </div>
        )}
      </div>
    </div>
  );
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Crosshair}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full mx-auto">
        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <canvas
            ref={leftFittingRef}
            width={FITTING_CANVAS_SIZE}
            height={FITTING_CANVAS_SIZE}
            className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
          />
        </div>

        <div
          ref={containerRef}
          className="relative flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center select-none"
        >
          <canvas
            ref={canvasRef}
            width={FITTING_CANVAS_SIZE}
            height={FITTING_CANVAS_SIZE}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
            }}
            tabIndex={0}
            role="button"
            aria-label={t('hint')}
            className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
              disabled || showAnswer
                ? 'cursor-default'
                : hoverPoint
                  ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
                  : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
            }`}
          />

          {isTouching && loupePos && (
            <div
              className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
              style={{
                left: `${loupePos.x}px`,
                top: `${loupePos.y}px`,
                width: `${LOUPE_DIAMETER}px`,
                height: `${LOUPE_DIAMETER}px`,
              }}
            >
              <canvas
                ref={loupeCanvasRef}
                width={LOUPE_DIAMETER}
                height={LOUPE_DIAMETER}
                className="w-full h-full block"
              />
            </div>
          )}
        </div>
      </div>
    </QuestionCardShell>
  );
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/index.tsx
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegVertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~tsx
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegVertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

#### Acts 5: 为 `color_all` 补充 `hint` 词条并重构为 `QuestionCardShell`

~~~~~act
patch_file
src/cards/color_all/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Full Color Match",
  "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
  "instruction": "Modulate H, S, and V tracks to match the target color on the left.",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Full Color Match",
  "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
  "instruction": "Modulate H, S, and V tracks to match the target color on the left.",
  "hint": "Modulate H, S, and V tracks to match the target color on the left.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_all/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "综合拾色 (Match)",
  "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
  "instruction": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
  "settings": {
~~~~~
~~~~~json
{
  "title": "综合拾色 (Match)",
  "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
  "instruction": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
  "hint": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Button,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
~~~~~
~~~~~tsx
import { Palette } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Button,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
~~~~~

~~~~~act
patch_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const enableHoverColorPreview = settings.enableHoverColorPreview ?? true;

  const [userH, setUserH] = useState<number>(180);
~~~~~
~~~~~tsx
  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const enableHoverColorPreview = settings.enableHoverColorPreview ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const [userH, setUserH] = useState<number>(180);
~~~~~

~~~~~act
patch_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-75"
            style={{
              backgroundColor: hsvToHex(
                draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                  ? (allHoverVals.H ?? userH)
                  : userH,
                draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                  ? (allHoverVals.S ?? userS)
                  : userS,
                draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                  ? (allHoverVals.V ?? userV)
                  : userV,
              ),
            }}
          />
        </div>
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userHSV?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={setUserH}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverH}
          onDraggingStateChange={handleDragH}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userHSV?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={setUserS}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverS}
          onDraggingStateChange={handleDragS}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userHSV?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={setUserV}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverV}
          onDraggingStateChange={handleDragV}
        />
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
    </div>
  );
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Palette}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-75"
            style={{
              backgroundColor: hsvToHex(
                draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                  ? (allHoverVals.H ?? userH)
                  : userH,
                draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                  ? (allHoverVals.S ?? userS)
                  : userS,
                draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                  ? (allHoverVals.V ?? userV)
                  : userV,
              ),
            }}
          />
        </div>
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userHSV?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={setUserH}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverH}
          onDraggingStateChange={handleDragH}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userHSV?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={setUserS}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverS}
          onDraggingStateChange={handleDragS}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userHSV?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={setUserV}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverV}
          onDraggingStateChange={handleDragV}
        />
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
  );
~~~~~

#### Acts 6: 为 `color_hue` 补充 `hint` 词条并重构为 `QuestionCardShell`

~~~~~act
patch_file
src/cards/color_hue/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Hue",
  "desc": "Identify the exact angle of a color on the 360° color wheel.",
  "instruction": "Locate the exact degree of the color on the 360° color wheel.",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Hue",
  "desc": "Identify the exact angle of a color on the 360° color wheel.",
  "instruction": "Locate the exact degree of the color on the 360° color wheel.",
  "hint": "Locate the exact degree of the color on the 360° color wheel.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_hue/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "色相 (Hue)",
  "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
  "instruction": "定位上方色块在 360° 色相环上的精准角度",
  "settings": {
~~~~~
~~~~~json
{
  "title": "色相 (Hue)",
  "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
  "instruction": "定位上方色块在 360° 色相环上的精准角度",
  "hint": "定位上方色块在 360° 色相环上的精准角度",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_hue/ColorHueView.tsx
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  hsvToHex,
} from '@formsight/card-sdk';
export interface ColorHueViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorHueView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorHueViewProps) {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={HUE_SPECTRUM_GRADIENT}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx
import { RotateCw } from 'lucide-preact';

import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface ColorHueViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorHueView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorHueViewProps) {
  const { t } = useCardTranslation('color_hue');
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={RotateCw}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={HUE_SPECTRUM_GRADIENT}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 7: 为 `color_sat` 补充 `hint` 词条并重构为 `QuestionCardShell`

~~~~~act
patch_file
src/cards/color_sat/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Saturation",
  "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
  "instruction": "Estimate the saturation purity percentage of the color (0%~100%).",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Saturation",
  "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
  "instruction": "Estimate the saturation purity percentage of the color (0%~100%).",
  "hint": "Estimate the saturation purity percentage of the color (0%~100%).",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_sat/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "饱和度 (Sat)",
  "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
  "instruction": "评估上方色块的鲜艳纯度比例 (0%~100%)",
  "settings": {
~~~~~
~~~~~json
{
  "title": "饱和度 (Sat)",
  "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
  "instruction": "评估上方色块的鲜艳纯度比例 (0%~100%)",
  "hint": "评估上方色块的鲜艳纯度比例 (0%~100%)",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_sat/ColorSatView.tsx
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  hsvToHex,
} from '@formsight/card-sdk';
export interface ColorSatViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorSatView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorSatViewProps) {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={targetS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx
import { Droplet } from 'lucide-preact';

import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface ColorSatViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorSatView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorSatViewProps) {
  const { t } = useCardTranslation('color_sat');
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Droplet}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={targetS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 8: 为 `color_val` 补充 `hint` 词条并重构为 `QuestionCardShell`

~~~~~act
patch_file
src/cards/color_val/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Value",
  "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
  "instruction": "Estimate the value/brightness percentage of the color (0%~100%).",
  "settings": {
~~~~~
~~~~~json
{
  "title": "Value",
  "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
  "instruction": "Estimate the value/brightness percentage of the color (0%~100%).",
  "hint": "Estimate the value/brightness percentage of the color (0%~100%).",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_val/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "明度 (Value)",
  "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
  "instruction": "评估上方色块的素描明度深浅比例 (0%~100%)",
  "settings": {
~~~~~
~~~~~json
{
  "title": "明度 (Value)",
  "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
  "instruction": "评估上方色块的素描明度深浅比例 (0%~100%)",
  "hint": "评估上方色块的素描明度深浅比例 (0%~100%)",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/color_val/ColorValView.tsx
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  hsvToHex,
} from '@formsight/card-sdk';
export interface ColorValViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorValView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorValViewProps) {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx
import { Sun } from 'lucide-preact';

import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface ColorValViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorValView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorValViewProps) {
  const { t } = useCardTranslation('color_val');
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sun}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </QuestionCardShell>
  );
}
~~~~~

---

### 下一步建议

1. **执行自动化测试验证**：运行 `pnpm vitest run src/cards/__tests__/locales-schema.test.ts`，确保本次为 `star_single`、`star_double_h`、`star_double_r`、`color_all`、`color_hue`、`color_sat`、`color_val` 新增的词典结构完全符合对齐要求。
2. **交互体验回归**：在偏好设置中切换“任务指引提示开关 (`showCanvasHints`)”，验证全项目所有卡片（包括上述 8 张新接入卡片）的顶部提示标签能否全局响应显隐状态。
