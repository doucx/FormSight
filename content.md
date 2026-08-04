好的，我已经分析了需求。我们将在用户偏好配置中添加“无操作闲置暂停计时”选项，并在训练视图中实现静默的闲置检测逻辑：当检测到用户在指定时长内没有任何点击、键盘或鼠标交互时，右上角计时器将自动挂起，直到用户产生新的交互时继续计时。

以下是具体的实施计划：

## [WIP] feat: 添加无操作闲置暂停右上角计时的设置选项及逻辑

### 用户需求
添加设置项允许配置闲置超时时间（如 1 分钟等）。当用户超过该时长未进行任何操作（如鼠标移动、点击、键盘按键）时，右上角计时器静默停止累积时间，直到用户恢复操作时继续计时。

### 评论
该功能在防干预、防止训练统计数据失真方面非常有用（例如用户临时离开电脑或忘记退出训练界面）。将其设定为设置页可配、训练页静默生效的机制，能提升产品使用体验且不会打扰用户。

### 目标
1. 在 `settings.ts` 中增加 `idleTimeout` 配置（默认 60 秒，支持关闭或设置不同时长）。
2. 在 `SettingsModal.tsx` 中增加该选项的选择 UI（关闭 / 30秒 / 1分钟 / 2分钟）。
3. 在 `TrainingView.tsx` 中增加事件监听及闲置检测算法，当无操作超时时自动暂停右上角耗时递增。

### 基本原理
1. 在 `UserSettings` 结构中定义 `idleTimeout` 属性（单位：秒，`0` 表示不暂停）。
2. 在 `TrainingView` 挂载全局用户交互事件监听器（`mousemove`、`mousedown`、`keydown`、`touchstart`），更新最后活动时间戳 `lastActivityTimeRef`。
3. 将基于绝对时间戳之差的静态计时器改为基于有效增量的步进计时器：在 `setInterval` 的每个 tick 中，判断 `now - lastActivityTimeRef` 是否超过阈值，若超过则停止计入耗时增量；恢复活动后继续正常累加耗时。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/idle-timer-setting #task/action/feature-addition #task/state/begin

---

### Script

#### Acts 1: 更新用户设置接口及默认参数

在 `settings.ts` 中引入 `idleTimeout` 字段，默认值为 `60` 秒（1 分钟）。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  targetingMode: TargetingMode; // 专项靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的扇区索引数组 [0~7]
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
};
~~~~~
~~~~~typescript.new
  targetingMode: TargetingMode; // 专项靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的扇区索引数组 [0~7]
  idleTimeout: number;         // 闲置自动暂停计时时长 (秒)，0 表示关闭
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  idleTimeout: 60,
};
~~~~~

#### Acts 2: 在偏好设置弹窗中添加无操作闲置暂停配置项

在 `SettingsModal.tsx` 中增加修改 `idleTimeout` 的回调函数及对应的切换组件。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleSectorToggle = (sectorIdx: number) => {
    setCurrent((prev) => {
      const currentSectors = prev.manualTargetSectors || [];
      const exists = currentSectors.includes(sectorIdx);
      const updated = exists
        ? currentSectors.filter((s) => s !== sectorIdx)
        : [...currentSectors, sectorIdx];
      return { ...prev, manualTargetSectors: updated };
    });
  };

  const handleConfirm = () => {
~~~~~
~~~~~typescript.new
  const handleSectorToggle = (sectorIdx: number) => {
    setCurrent((prev) => {
      const currentSectors = prev.manualTargetSectors || [];
      const exists = currentSectors.includes(sectorIdx);
      const updated = exists
        ? currentSectors.filter((s) => s !== sectorIdx)
        : [...currentSectors, sectorIdx];
      return { ...prev, manualTargetSectors: updated };
    });
  };

  const handleIdleTimeoutChange = (timeout: number) => {
    setCurrent((prev) => ({ ...prev, idleTimeout: timeout }));
  };

  const handleConfirm = () => {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 难度步长粒度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">网格步长精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (5px梯度)
              </button>
              <button
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (1px逐级)
              </button>
            </div>
          </div>
~~~~~
~~~~~typescript.new
          {/* 难度步长粒度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">网格步长精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (5px梯度)
              </button>
              <button
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (1px逐级)
              </button>
            </div>
          </div>

          {/* 无操作闲置暂停计时 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">无操作闲置暂停计时</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭', value: 0 },
                { label: '30秒', value: 30 },
                { label: '1分钟', value: 60 },
                { label: '2分钟', value: 120 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.idleTimeout ?? 60) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
~~~~~

#### Acts 3: 在训练视图中增加无操作检测与计时暂停逻辑

在 `TrainingView.tsx` 中挂载用户全域活动事件监听，并在计时器定时循环中拦截闲置阶段，实现静默暂停计时。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  // === 计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
~~~~~
~~~~~typescript.new
  const lastActivityTimeRef = useRef<number>(Date.now());
  const accumulatedMsRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(Date.now());

  // 用户活动监听，静默重置闲置计时器
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  // === 计时器 ===
  useEffect(() => {
    lastTickTimeRef.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      const idleLimitMs = (settings.idleTimeout ?? 60) * 1000;
      const isIdle = idleLimitMs > 0 && now - lastActivityTimeRef.current > idleLimitMs;

      if (!isIdle) {
        accumulatedMsRef.current += delta;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings.idleTimeout]);
~~~~~

### 下一步建议
1. 执行计划并完成文件修改。
2. 启动本地开发环境测试设置界面及无操作自动暂停计时功能。
3. 验证无操作超过配置时长后，右上角数字停止增加；一旦鼠标移动或点击，右上角计时器恢复递增。
