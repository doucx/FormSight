好的，我将为你生成实现该纯前端色感弱点分析与 12 扇区靶向训练的完整计划。

根据你提到的代码重复问题（`setQuestion`），我会在 `patch_file` 操作中带上更完整的上下文（锚点），确保准确匹配。

## [WIP] feat(color): 实现纯前端色感弱点分析与 12 色相扇区靶向强化训练

### 简要回答
你的方案非常棒！我们将为色相 (Hue) 拆分 12 个等分的 $30^\circ$ 扇区，并将类似于寻星练习的靶向发题逻辑扩展到色感模块。同时，通过新增 `ColorAnalyticsModal` 组件，把我们在 Python 端验证过的色相-正确率图表直接搬到 Web 前端。

### 摘要头
## [WIP] feat(color): 实现纯前端色感弱点分析与 12 色相扇区靶向强化训练

### 用户需求
在 FormSight 前端中整合色感弱点分析与靶向强化功能：
1. 能够按 12 个色相扇区（每 $30^\circ$ 一个区间）统计并展示正确率与平均角度误差。
2. 支持“一键开启弱点扇区专项强化”，允许用户手动或智能自动锁定如 $300^\circ \sim 330^\circ$（洋红/紫红）等高频错题扇区进行针对性刷题。

### 评论
该升级使色感训练模块具备了与寻星练习相当的诊断与强化能力，形成了“练习 $\rightarrow$ 诊断 $\rightarrow$ 专项突破”的闭环体验。纯前端的环形色相弱点雷达图将极大地提升可视化反馈。

### 目标
1. 修改 `src/utils/settings.ts`：添加 `colorTargetingMode` 及 `colorManualTargetSectors` 字段。
2. 修改 `src/utils/colorUtils.ts`：支持 `generateColorQuestion` 根据靶向扇区配置按 70% 概率加权发题。
3. 修改 `src/components/SettingsModal.tsx`：在色感设置模式下添加 12 扇区选择控制面板。
4. 新建 `src/components/ColorAnalyticsModal.tsx`：实现 12 色相扇区环形可视化、盲点识别与一键应用强化设置。
5. 修改 `src/views/ColorDashboard.tsx`、`src/views/ColorTrainingView.tsx` 及 `src/app.tsx`：连接分析弹窗入口与自适应发题逻辑。

### 基本原理
将 $0^\circ \sim 360^\circ$ 的色相环等分为 12 个 $30^\circ$ 弧度的离散扇区。在用户开启智能或手动靶向模式时，发题算法以 70% 的概率将 `targetH` 约束在弱点扇区范围（加权随机），30% 的概率保持全盘随机，兼顾弱点攻坚与全局保持。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #comp/core #concept/analytics #task/domain/color-training #task/object/weakness-analysis #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新用户设置项以支持色感靶向模式

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms) (兼容保留)
  starAutoNextDelay: number; // 寻星练习自动翻页延迟 (ms)
  colorAutoNextDelay: number; // 色感训练自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
  targetingMode: TargetingMode; // 专项靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的扇区索引数组 [0~7]
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  starAutoNextDelay: 500,
  colorAutoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
  sliderHitMargin: 12,
};
~~~~~
~~~~~typescript.new
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms) (兼容保留)
  starAutoNextDelay: number; // 寻星练习自动翻页延迟 (ms)
  colorAutoNextDelay: number; // 色感训练自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
  targetingMode: TargetingMode; // 寻星靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 寻星手动锁定的扇区 [0~7]
  colorTargetingMode: TargetingMode; // 色感靶向训练模式 ('off', 'auto', 'manual')
  colorManualTargetSectors: number[]; // 色感手动锁定的扇区 [0~11]
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  starAutoNextDelay: 500,
  colorAutoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  colorTargetingMode: 'off',
  colorManualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
  sliderHitMargin: 12,
};
~~~~~

#### Acts 2: 升级 `colorUtils.ts` 支持按色相扇区加权发题

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 生成色感练习题目 (包含锥形难度对齐策略)
 */
export function generateColorQuestion(mode: ColorMode, level: number): ColorQuestionData {
  const id = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tolerance = getToleranceForLevel(mode, level);
  const clampedLevel = Math.max(1, Math.min(35, level));

  const targetH = Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;
~~~~~
~~~~~typescript.new
export interface ColorQuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~11] 代表 12 个 30° 的色相扇区
}

/**
 * 色相加权生成：70% 概率落在指定弱点靶向区间内，30% 全局随机
 */
function selectHueWithTargeting(options?: ColorQuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      // 每个扇区 30度。例如 0号扇区是 0~30度，中心是 15度
      const sectorCenterAngle = chosenSector * 30 + 15;
      const jitter = (Math.random() - 0.5) * 30; // ±15° 范围抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 生成色感练习题目 (包含锥形难度对齐策略)
 */
export function generateColorQuestion(mode: ColorMode, level: number, options?: ColorQuestionGenerateOptions): ColorQuestionData {
  const id = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tolerance = getToleranceForLevel(mode, level);
  const clampedLevel = Math.max(1, Math.min(35, level));

  const targetH = mode === 'H' ? selectHueWithTargeting(options) : Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;
~~~~~

#### Acts 3: 升级 `SettingsModal.tsx`，支持色感的 12 扇区配置

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx.old
const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

interface SettingsModalProps {
~~~~~
~~~~~tsx.new
const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

const COLOR_SECTOR_NAMES = [
  '红 (0°-30°)', '橙 (30°-60°)', '黄 (60°-90°)', '黄绿 (90°-120°)',
  '绿 (120°-150°)', '青绿 (150°-180°)', '青 (180°-210°)', '蓝 (210°-240°)',
  '蓝紫 (240°-270°)', '紫 (270°-300°)', '品红 (300°-330°)', '紫红 (330°-360°)'
];

interface SettingsModalProps {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx.old
  const handleSectorToggle = (sectorIdx: number) => {
    updateSettings((prev) => {
      const currentSectors = prev.manualTargetSectors || [];
      const exists = currentSectors.includes(sectorIdx);
      const updated = exists
        ? currentSectors.filter((s) => s !== sectorIdx)
        : [...currentSectors, sectorIdx];
      return { ...prev, manualTargetSectors: updated };
    });
  };

  return (
~~~~~
~~~~~tsx.new
  const handleSectorToggle = (sectorIdx: number) => {
    updateSettings((prev) => {
      const isColor = appContext === 'color-sense';
      const currentSectors = isColor ? (prev.colorManualTargetSectors || []) : (prev.manualTargetSectors || []);
      const exists = currentSectors.includes(sectorIdx);
      const updated = exists
        ? currentSectors.filter((s) => s !== sectorIdx)
        : [...currentSectors, sectorIdx];
      
      return isColor 
        ? { ...prev, colorManualTargetSectors: updated } 
        : { ...prev, manualTargetSectors: updated };
    });
  };

  return (
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx.old
              {/* 专项靶向强化训练设置 */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Crosshair className="w-4 h-4 text-indigo-600" />
                  弱点专项靶向强化
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'off', label: '关闭 (全随机)' },
                    { id: 'auto', label: '智能自动' },
                    { id: 'manual', label: '手动指定' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => updateSettings({ targetingMode: m.id as TargetingMode })}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        current.targetingMode === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* 手动勾选扇区 */}
                {current.targetingMode === 'manual' && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500">
                      选择需要靶向强化的角度扇区：
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SECTOR_NAMES.map((name, idx) => {
                        const selected = (current.manualTargetSectors || []).includes(idx);
                        return (
                          <button
                            type="button"
                            key={name}
                            onClick={() => handleSectorToggle(idx)}
                            className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                              selected
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
~~~~~
~~~~~tsx.new
              {/* 寻星专属 - 干扰点网格大小等被隐藏，靶向训练由于寻星和色感共用，提取到外面 */}
            </>
          )}

          {/* 专项靶向强化训练设置 (两者共用) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Crosshair className="w-4 h-4 text-indigo-600" />
              弱点专项靶向强化
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'off', label: '关闭 (全随机)' },
                { id: 'auto', label: '智能自动' },
                { id: 'manual', label: '手动指定' },
              ].map((m) => {
                const isActive = appContext === 'color-sense' 
                  ? current.colorTargetingMode === m.id
                  : current.targetingMode === m.id;
                
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => updateSettings(
                      appContext === 'color-sense'
                        ? { colorTargetingMode: m.id as TargetingMode }
                        : { targetingMode: m.id as TargetingMode }
                    )}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* 手动勾选扇区 */}
            {((appContext === 'star-hopping' && current.targetingMode === 'manual') || 
              (appContext === 'color-sense' && current.colorTargetingMode === 'manual')) && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500">
                  选择需要靶向强化的 {appContext === 'color-sense' ? '色相' : '角度'} 扇区：
                </div>
                <div className={`grid gap-1.5 ${appContext === 'color-sense' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {(appContext === 'color-sense' ? COLOR_SECTOR_NAMES : SECTOR_NAMES).map((name, idx) => {
                    const selected = appContext === 'color-sense'
                      ? (current.colorManualTargetSectors || []).includes(idx)
                      : (current.manualTargetSectors || []).includes(idx);
                    
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => handleSectorToggle(idx)}
                        className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                          selected
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
~~~~~

#### Acts 4: 创建 `ColorAnalyticsModal.tsx` 实现前端环形色相图

~~~~~act
write_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~tsx
import { AlertCircle, BarChart2, Compass, Crosshair, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { hsvToHex } from '../utils/colorUtils';

interface ColorAnalyticsModalProps {
  onClose: () => void;
}

const SECTOR_LABELS = [
  '红 (0°-30°)', '橙 (30°-60°)', '黄 (60°-90°)', '黄绿 (90°-120°)',
  '绿 (120°-150°)', '青绿 (150°-180°)', '青 (180°-210°)', '蓝 (210°-240°)',
  '蓝紫 (240°-270°)', '紫 (270°-300°)', '品红 (300°-330°)', '紫红 (330°-360°)'
];

export function ColorAnalyticsModal({ onClose }: ColorAnalyticsModalProps) {
  const [records, setRecords] = useState<ColorTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const ringCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 加载数据 (只看 Hue 模式)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchRecords = async () => {
      const data = await getAllColorTrialRecords('H');
      if (isMounted) {
        setRecords(data);
        setLoading(false);
      }
    };
    fetchRecords();
    return () => {
      isMounted = false;
    };
  }, []);

  // === 统计指标算子 ===
  const totalCount = records.length;
  const hitCount = records.filter((r) => r.isHit).length;
  const overallAccuracy = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;

  // 12 色相方向数据桶计算
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  let avgErrorDist = 0;
  if (totalCount > 0) {
    let sumDist = 0;
    for (const r of records) {
      sumDist += r.errorValue;
      const targetH = r.targetHSV[0];
      const idx = Math.floor(targetH / 30);
      const safeIdx = Math.max(0, Math.min(11, idx));
      sectorBuckets[safeIdx].total += 1;
      if (r.isHit) sectorBuckets[safeIdx].hits += 1;
      sectorBuckets[safeIdx].sumError += r.errorValue;
    }
    avgErrorDist = Math.round((sumDist / totalCount) * 10) / 10;
  }

  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  const handleApplyTargeting = (sectorIdx: number) => {
    const settings = loadSettings();
    saveSettings({
      ...settings,
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [sectorIdx],
    });
    alert(`🎯 已成功设置：将在色感训练中专项强化【${SECTOR_LABELS[sectorIdx]}】区间！`);
    onClose();
  };

  // 找最弱方向（做答数 >= 3 中正确率最低的方向）
  const validSectors = sectorStats.filter((s) => s.total >= 3);
  const weakestSector =
    validSectors.length > 0
      ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
      : null;

  // === 渲染 12 色相正确率环状图 ===
  useEffect(() => {
    if (loading) return;
    const canvas = ringCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 40;
    const innerRadius = outerRadius - 20;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    // 绘制 12 个扇形
    const sectorAngle = (Math.PI * 2) / 12;
    const startOffset = -Math.PI / 2; // 从 12 点钟方向开始

    for (let i = 0; i < 12; i++) {
      const stat = sectorStats[i];
      const startA = startOffset + i * sectorAngle;
      const endA = startA + sectorAngle;
      
      // 1. 绘制最外圈彩色光谱指示带
      const hueAngle = i * 30 + 15; // 扇区中心色相
      const hexColor = hsvToHex(hueAngle, 100, 100);
      
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + 12, startA, endA);
      ctx.arc(cx, cy, outerRadius + 2, endA, startA, true);
      ctx.fillStyle = hexColor;
      ctx.fill();

      // 2. 绘制正确率柱状扇形
      // 最小半径展示 10%，最大展示 100%
      const accRatio = stat.total > 0 ? Math.max(0.1, stat.accuracy / 100) : 0;
      const r = innerRadius + (outerRadius - innerRadius) * accRatio;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();

      if (stat.total === 0) {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      } else if (stat.accuracy >= 80) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.55)'; // 绿
      } else if (stat.accuracy >= 60) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.65)'; // 黄
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)'; // 红
      }
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. 绘制文字标注
      const midA = startA + sectorAngle / 2;
      const labelR = outerRadius + 25;
      const lx = cx + Math.cos(midA) * labelR;
      const ly = cy + Math.sin(midA) * labelR;

      ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#EF4444' : '#94A3B8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 取名字的前两个字（如 "红", "黄绿"）
      const shortName = stat.label.split(' ')[0];
      ctx.fillText(shortName, lx, ly);
    }

    // 中心装饰基准圆
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.stroke();
    
    // 中心文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hue', cx, cy - 6);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Accuracy', cx, cy + 8);
    
  }, [loading, sectorStats]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">色相感知弱点分析</h2>
              <p className="text-xs text-slate-400">洞察你对色彩环上 12 扇区的敏感度分布</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : totalCount === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无色相 (Hue) 模式的练习日志，先去练习几道题吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
               <canvas
                  ref={ringCanvasRef}
                  width={320}
                  height={320}
                  className="w-full max-w-[300px] aspect-square rounded-xl"
                />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">总体评估 (色相)</div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{overallAccuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {totalCount} 题
                  </span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
                  <span>平均绝对误差:</span>
                  <span>{avgErrorDist}°</span>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  色相盲区诊断
                </div>
                {weakestSector ? (
                  <div className="space-y-2">
                    <p className="text-slate-700 text-[11px]">
                      你在 <span className="font-bold text-amber-700">{weakestSector.label}</span>{' '}
                      方向上辨识正确率最低：
                    </p>
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-3 h-3 rounded-full border border-slate-200" 
                          style={{ backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100) }} 
                        />
                        <span className="font-bold text-slate-800">{weakestSector.label.split(' ')[0]}</span>
                      </div>
                      <span className="font-black text-rose-600 text-sm">
                        {weakestSector.accuracy}% 正确率
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyTargeting(weakestSector.sectorIdx)}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      一键开启该色相专项强化
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-600 text-[11px]">需每个色相扇区完成至少 3 题才能生成弱点诊断。</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 在 `ColorDashboard.tsx` 中添加色感分析入口

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~tsx.old
interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}
~~~~~
~~~~~tsx.new
interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~tsx.old
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            偏好设置
          </button>
        </div>
~~~~~
~~~~~tsx.new
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            弱点分析
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            偏好设置
          </button>
        </div>
~~~~~

#### Acts 6: 在 `ColorTrainingView.tsx` 中应用靶向发题并修复上下文重复问题

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import {
  type ColorSessionData,
  type ColorTrialRecord,
  saveColorSession,
  saveColorTrialRecord,
} from '../utils/db';
~~~~~
~~~~~tsx.new
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  type ColorQuestionGenerateOptions,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import {
  type ColorSessionData,
  type ColorTrialRecord,
  getAllColorTrialRecords,
  saveColorSession,
  saveColorTrialRecord,
} from '../utils/db';
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<ColorQuestionData>(() =>
    generateColorQuestion(mode, initialLevel),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
~~~~~
~~~~~tsx.new
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);
  const targetSectorsRef = useRef<number[]>(settings.colorManualTargetSectors || []);

  const getColorGenerateOptions = (): ColorQuestionGenerateOptions => {
    return {
      targetingMode: settings.colorTargetingMode,
      targetSectors:
        settings.colorTargetingMode === 'manual'
          ? settings.colorManualTargetSectors
          : targetSectorsRef.current,
    };
  };

  const [question, setQuestion] = useState<ColorQuestionData>(() =>
    generateColorQuestion(mode, initialLevel, getColorGenerateOptions()),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  // 智能自动模式下，加载历史色相盲点
  useEffect(() => {
    if (settings.colorTargetingMode === 'auto' && mode === 'H') {
      getAllColorTrialRecords('H').then((records) => {
        if (records.length >= 3) {
          const buckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const targetH = r.targetHSV[0];
            const idx = Math.floor(targetH / 30);
            const safeIdx = Math.max(0, Math.min(11, idx));
            buckets[safeIdx].total += 1;
            if (r.isHit) buckets[safeIdx].hits += 1;
          }
          let minAcc = 1.0;
          let minIdx = 0;
          for (let i = 0; i < buckets.length; i++) {
            const b = buckets[i];
            if (b.total >= 1) {
              const acc = b.hits / b.total;
              if (acc < minAcc) {
                minAcc = acc;
                minIdx = i;
              }
            }
          }
          targetSectorsRef.current = [minIdx];
        }
      });
    }
  }, [mode, settings.colorTargetingMode]);
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
~~~~~
~~~~~tsx.new
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateColorQuestion(mode, nextLevel, getColorGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
    sessionIdRef.current = `csession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
~~~~~
~~~~~tsx.new
    sessionIdRef.current = `csession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateColorQuestion(mode, nextLevel, getColorGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
~~~~~
~~~~~tsx.new
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx.old
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : '饱和度'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 监控指标 */}
~~~~~
~~~~~tsx.new
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : '饱和度'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.colorTargetingMode !== 'off' && mode === 'H' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {settings.colorTargetingMode === 'auto' ? '智能靶向强化' : '手动靶向强化'}
            </span>
          )}
        </div>

        {/* 监控指标 */}
~~~~~

#### Acts 7: 在 `app.tsx` 中注册渲染 `ColorAnalyticsModal`

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
~~~~~
~~~~~tsx.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ColorAnalyticsModal } from './components/ColorAnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsContext, setSettingsContext] = useState<'star-hopping' | 'color-sense'>(
    'star-hopping',
  );
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
~~~~~
~~~~~tsx.new
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsContext, setSettingsContext] = useState<'star-hopping' | 'color-sense'>(
    'star-hopping',
  );
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isColorAnalyticsOpen, setIsColorAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
          />
        ) : (
~~~~~
~~~~~tsx.new
      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={() => setIsColorAnalyticsOpen(true)}
          />
        ) : (
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}

      {isColorAnalyticsOpen && (
        <ColorAnalyticsModal onClose={() => setIsColorAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
我们已经完成了前端层面的所有改动，支持了基于 12 色相环的专项靶向强化练习与内建图表分析。
由于目前文件存在较多且分散的变动，建议启动 Web 项目（`npm run dev`）在浏览器中测试色相靶向功能以及新的图表统计面板功能，确认无误后可进行下一次版本提交。
