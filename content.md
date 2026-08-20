好的，现在我们开启 **Phase 3: 路由与 UI 现代化**。

本阶段的核心任务包括：
1. **轻量级客户端 Hash 路由**：实现声明式 URL Hash 驱动（`#/`、`#/dashboard/:domain`、`#/train/:cardId?type=...`），支持浏览器前进/后退、页面刷新状态保持与深度直达。
2. **现代化非阻塞 UI 提示体系**：构建全局 `Toast` 浮层与基于 `ModalShell` 的 `ConfirmModal` 确认弹窗。
3. **消除原生 `alert` / `confirm`**：重构 `GlobalSettingsModal` 中的全量备份导入与数据清空交互，提升 UX 一致性。

## [WIP] feat: 引入声明式 Hash 路由并现代化模态交互与 Toast 系统

### 用户需求
1. 支持通过 URL Hash 导航，页面刷新不丢失当前题卡与训练状态，浏览器前进后退自然切换。
2. 消除应用中原生的 `alert()` 和 `confirm()` 阻塞式对话框，使用现代化 Tailwind 设计风格的 Toast 提示与 Confirm 确认弹窗。

### 评论
纯内存状态驱动会导致用户刷新即回退至首页，且在移动端无法使用系统返回手势。引入轻量且无外部依赖的 Hash 路由不仅增强了 SPA 体验，而且让特定的题卡可以直接通过 URL 分享和书签收藏。同时，使用非阻塞的 UI 反馈极大提升了应用整体的现代质感。

### 目标
1. 新建 `src/hooks/useHashRoute.ts`，封装声明式路由解析与导航机制。
2. 新建 `src/components/common/Toast.tsx` 与 `src/components/common/ConfirmModal.tsx`。
3. 重构 `GlobalSettingsModal.tsx`，将数据导入导出和清空逻辑接入新的 UI 提示体系。
4. 重构 `src/app.tsx` 与 `Home.tsx`，全面接轨 Hash 路由。

### 基本原理
1. 利用 `window.location.hash` 监听 `hashchange` 事件，将路径和 Query 参数解析为结构化的 `RouteState`（例如 `type: 'train', cardId: 'star_single', sessionType: 'training'`）。
2. Toast 采用基于 Preact hooks 的轻量发布订阅或自包含上下文状态，自动支持 3 秒定时淡出与手动关闭。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #concept/navigation #scope/ux #ai/instruct #task/domain/ui #task/object/hash-router #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 新建 `src/hooks/useHashRoute.ts` 轻量级 Hash 路由

~~~~~act
write_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';

export type RouteLocation =
  | { type: 'home' }
  | { type: 'dashboard'; domain: TrainingDomain }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    if (['star', 'color', 'relative_color', 'negative_space'].includes(domain)) {
      return { type: 'dashboard', domain };
    }
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'dashboard') return `#/dashboard/${route.domain}`;
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((target: RouteLocation) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }, []);

  return { route, navigate };
}
~~~~~

#### Acts 2: 新建 `src/components/common/Toast.tsx` 与 `src/components/common/ConfirmModal.tsx`

~~~~~act
write_file
src/components/common/Toast.tsx
~~~~~
~~~~~typescript
import { AlertCircle, CheckCircle, Info, X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon =
    toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;

  const bgStyle =
    toast.type === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : toast.type === 'error'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-indigo-50 text-indigo-800 border-indigo-200';

  const iconStyle =
    toast.type === 'success'
      ? 'text-emerald-600'
      : toast.type === 'error'
        ? 'text-rose-600'
        : 'text-indigo-600';

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border shadow-lg backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 ${bgStyle}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconStyle}`} />
        <span className="text-xs font-bold leading-tight">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/ConfirmModal.tsx
~~~~~
~~~~~typescript
import { AlertTriangle } from 'lucide-preact';
import { ModalShell } from './ModalShell';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title={title}
      icon={AlertTriangle}
      onClose={onCancel}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 3: 重构 `GlobalSettingsModal.tsx` 消除阻塞式 API

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  onClose,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    a.download = `formsight_data_${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('全量数据已成功导出为 JSON 文件', 'success');
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        showToast('数据已成功导入并合并！', 'success');
        onDataChanged();
        onClose();
      } else {
        showToast('导入失败，备份文件格式不匹配', 'error');
      }
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast('所有训练数据已清空', 'info');
    onDataChanged();
    onClose();
  };

  return (
    <>
      <ModalShell title="FormSight 全局设置" icon={Sliders} onClose={onClose} maxWidth="max-w-md">
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">系统偏好</div>
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
                <div className="text-[11px] text-slate-400">无操作或切出窗口时暂停计时与模糊遮罩</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '关闭', value: 0 },
                { label: '30 秒', value: 30 },
                { label: '60 秒', value: 60 },
                { label: '120 秒', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    settings.global.idleTimeout === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            数据备份与恢复
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              导出全量 JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              导入 JSON 备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* 危险操作 */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-600">删除所有数据</div>
              <div className="text-[11px] text-slate-400">清空所有模块的本地练习记录</div>
            </div>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空数据
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </ModalShell>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="清空所有训练数据"
        message="确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！"
        confirmText="确认清空"
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
~~~~~

#### Acts 4: 重构 `Home.tsx` 对接声明式导航

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  onNavigate: (app: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space') => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}
~~~~~
~~~~~typescript.new
interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  onNavigateDomain: (domain: TrainingDomain) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
export function Home({
  totalTimeMs,
  domainTimes,
  onNavigate,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domains = Object.values(DOMAINS_CONFIG);
~~~~~
~~~~~typescript.new
export function Home({
  totalTimeMs,
  domainTimes,
  onNavigateDomain,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domains = Object.values(DOMAINS_CONFIG);
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
            <button
              key={meta.domain}
              type="button"
              onClick={() => onNavigate(meta.appId)}
              className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
            >
~~~~~
~~~~~typescript.new
            <button
              key={meta.domain}
              type="button"
              onClick={() => onNavigateDomain(meta.domain)}
              className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
            >
~~~~~

#### Acts 5: 重构 `src/app.tsx` 整合 Hash 路由与 Toast 全局体系

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import { useHashRoute } from './hooks/useHashRoute';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';

const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];

export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<TrainingDomain | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    setDomainTimes(timesMap);
    setSettings(loadSettings());

    if (route.type === 'dashboard') {
      const pList = await getProfilesByDomain(route.domain);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.cardId] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [route]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'dashboard') {
      const meta = DOMAINS_CONFIG[route.domain];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    } else if (route.type === 'train') {
      const card = getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route]);

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'dashboard' && (
        <GenericDashboard
          meta={DOMAINS_CONFIG[route.domain]}
          onStart={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onBackToHome={() => navigate({ type: 'home' })}
          onOpenSettings={() => {
            setSettingsDomain(route.domain);
            setIsSettingsOpen(true);
          }}
          onOpenAnalytics={() => {
            setActiveAnalyticsDomain(route.domain);
          }}
        />
      )}

      {route.type === 'train' &&
        (() => {
          const activeCard = getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = CARD_PLUGINS[activeCard.id];
          const activeLevel =
            currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={settings[activeCard.settingsKey]}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {isSettingsOpen && (
        <SettingsModal
          domain={settingsDomain}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsDomain && (
        <WeaknessAnalyticsModal
          domain={activeAnalyticsDomain}
          onClose={() => setActiveAnalyticsDomain(null)}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议

执行质量检测：
~~~~~
npm run check
npm run test:coverage || npm run test
~~~~~

1. 验证浏览器 URL 路径变化、刷新保持与 Toast 弹窗交互。
2. 开启 **Phase 4: Canvas Retina 适配与算法/类型加固**，统一封装 HiDPI 流水线并消除 `any` 类型抑制。
